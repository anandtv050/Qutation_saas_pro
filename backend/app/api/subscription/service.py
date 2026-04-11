import os
import hmac
import hashlib
from datetime import date, timedelta
from fastapi import HTTPException, status

from app.core.logger import getLogger

logger = getLogger()

# Razorpay config
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")


class ClsSubscriptionService:
    def __init__(self, insPool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId

    async def fnGetStatus(self):
        """Get current subscription status for user"""
        async with self.insPool.acquire() as conn:
            rstSub = await conn.fetchrow(
                """SELECT s.*, p.vchr_plan_name, p.vchr_display_name,
                          p.int_max_quotations_per_month, p.bln_ai_enabled
                   FROM tbl_subscription s
                   JOIN tbl_subscription_plan p ON s.fk_bint_plan_id = p.pk_bint_plan_id
                   WHERE s.fk_bint_user_id = $1
                   ORDER BY s.pk_bint_subscription_id DESC
                   LIMIT 1""",
                self.intUserId
            )

        if not rstSub:
            return None

        intDaysRemaining = (rstSub['dat_end_date'] - date.today()).days
        strStatus = rstSub['vchr_status']

        # Auto-expire if past end date
        if intDaysRemaining < 0 and strStatus in ('trial', 'active'):
            strStatus = 'expired'
            async with self.insPool.acquire() as conn:
                await conn.execute(
                    "UPDATE tbl_subscription SET vchr_status = 'expired' WHERE pk_bint_subscription_id = $1",
                    rstSub['pk_bint_subscription_id']
                )

        return {
            "intPlanId": rstSub['fk_bint_plan_id'],
            "strPlanName": rstSub['vchr_plan_name'],
            "strDisplayName": rstSub['vchr_display_name'],
            "strStatus": strStatus,
            "datStartDate": rstSub['dat_start_date'],
            "datEndDate": rstSub['dat_end_date'],
            "intDaysRemaining": max(intDaysRemaining, 0),
            "intMaxQuotationsPerMonth": rstSub['int_max_quotations_per_month'],
            "blnAiEnabled": rstSub['bln_ai_enabled'],
        }

    async def fnCreateOrder(self, intPlanId: int):
        """Create a Razorpay order for a plan"""
        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment system not configured"
            )

        # Get plan details
        async with self.insPool.acquire() as conn:
            rstPlan = await conn.fetchrow(
                "SELECT * FROM tbl_subscription_plan WHERE pk_bint_plan_id = $1 AND bln_active = true",
                intPlanId
            )

        if not rstPlan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Plan not found"
            )

        if rstPlan['dbl_price_yearly'] <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create order for free plan"
            )

        # Create Razorpay order via API
        import httpx

        dblAmount = int(float(rstPlan['dbl_price_yearly']) * 100)  # Razorpay expects paise

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.razorpay.com/v1/orders",
                json={
                    "amount": dblAmount,
                    "currency": "INR",
                    "receipt": f"quotely_user_{self.intUserId}_plan_{intPlanId}",
                },
                auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET),
            )

        if response.status_code != 200:
            logger.error(f"Razorpay order creation failed: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to create payment order"
            )

        dctOrder = response.json()

        return {
            "strOrderId": dctOrder["id"],
            "dblAmount": float(rstPlan['dbl_price_yearly']),
            "strCurrency": "INR",
            "strKeyId": RAZORPAY_KEY_ID,
            "strPlanName": rstPlan['vchr_display_name'],
        }

    async def fnVerifyPayment(self, strPaymentId: str, strOrderId: str, strSignature: str, intPlanId: int):
        """Verify Razorpay payment signature and activate subscription"""
        # Verify signature
        strExpected = hmac.HMAC(
            RAZORPAY_KEY_SECRET.encode(),
            f"{strOrderId}|{strPaymentId}".encode(),
            hashlib.sha256
        ).hexdigest()

        if strExpected != strSignature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment verification failed"
            )

        async with self.insPool.acquire() as conn:
            # Record payment
            await conn.execute(
                """INSERT INTO tbl_payment (
                    fk_bint_user_id, vchr_razorpay_payment_id,
                    vchr_razorpay_order_id, vchr_razorpay_signature,
                    dbl_amount, vchr_status
                ) VALUES ($1, $2, $3, $4,
                    (SELECT dbl_price_yearly FROM tbl_subscription_plan WHERE pk_bint_plan_id = $5),
                    'captured')""",
                self.intUserId, strPaymentId, strOrderId, strSignature, intPlanId
            )

            # Activate/extend subscription
            datStart = date.today()
            datEnd = datStart + timedelta(days=365)

            # Check if subscription exists
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_subscription_id FROM tbl_subscription WHERE fk_bint_user_id = $1 ORDER BY pk_bint_subscription_id DESC LIMIT 1",
                self.intUserId
            )

            if rstExisting:
                await conn.execute(
                    """UPDATE tbl_subscription
                       SET fk_bint_plan_id = $1, vchr_status = 'active',
                           dat_start_date = $2, dat_end_date = $3,
                           vchr_razorpay_subscription_id = $4
                       WHERE pk_bint_subscription_id = $5""",
                    intPlanId, datStart, datEnd, strPaymentId,
                    rstExisting['pk_bint_subscription_id']
                )
            else:
                await conn.execute(
                    """INSERT INTO tbl_subscription (
                        fk_bint_user_id, fk_bint_plan_id, vchr_status,
                        dat_start_date, dat_end_date, vchr_razorpay_subscription_id
                    ) VALUES ($1, $2, 'active', $3, $4, $5)""",
                    self.intUserId, intPlanId, datStart, datEnd, strPaymentId
                )

        logger.info(f"Subscription activated: user={self.intUserId}, plan={intPlanId}")
        return {"strMessage": "Subscription activated successfully"}

    # =====================================================
    # ADMIN METHODS
    # =====================================================

    async def fnAdminGetAllSubscriptions(self):
        """Admin: Get all users with their subscription status"""
        async with self.insPool.acquire() as conn:
            rstUsers = await conn.fetch(
                """SELECT u.pk_bint_user_id, u.vchr_email, u.vchr_username, u.vchr_business_name,
                          s.vchr_status, s.dat_start_date, s.dat_end_date,
                          p.vchr_display_name
                   FROM tbl_user u
                   LEFT JOIN LATERAL (
                       SELECT * FROM tbl_subscription
                       WHERE fk_bint_user_id = u.pk_bint_user_id
                       ORDER BY pk_bint_subscription_id DESC LIMIT 1
                   ) s ON true
                   LEFT JOIN tbl_subscription_plan p ON s.fk_bint_plan_id = p.pk_bint_plan_id
                   WHERE u.pk_bint_user_id != 1
                   ORDER BY u.pk_bint_user_id"""
            )

        lstUsers = []
        for row in rstUsers:
            intDaysRemaining = None
            if row['dat_end_date']:
                intDaysRemaining = (row['dat_end_date'] - date.today()).days

            lstUsers.append({
                "intUserId": row['pk_bint_user_id'],
                "strEmail": row['vchr_email'],
                "strUsername": row['vchr_username'],
                "strBusinessName": row['vchr_business_name'],
                "strStatus": row['vchr_status'],
                "strPlanName": row['vchr_display_name'],
                "datStartDate": str(row['dat_start_date']) if row['dat_start_date'] else None,
                "datEndDate": str(row['dat_end_date']) if row['dat_end_date'] else None,
                "intDaysRemaining": intDaysRemaining,
            })

        return {"lstSubscriptions": lstUsers}

    async def fnAdminActivate(self, intTargetUserId: int, intPlanId: int, intDays: int = 365):
        """Admin: Activate or extend a user's subscription"""
        datStart = date.today()
        datEnd = datStart + timedelta(days=intDays)

        async with self.insPool.acquire() as conn:
            # Check if user exists
            rstUser = await conn.fetchrow(
                "SELECT pk_bint_user_id FROM tbl_user WHERE pk_bint_user_id = $1",
                intTargetUserId
            )
            if not rstUser:
                return {"strMessage": "User not found", "blnSuccess": False}

            # Check if subscription exists
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_subscription_id FROM tbl_subscription WHERE fk_bint_user_id = $1 ORDER BY pk_bint_subscription_id DESC LIMIT 1",
                intTargetUserId
            )

            if rstExisting:
                await conn.execute(
                    """UPDATE tbl_subscription
                       SET fk_bint_plan_id = $1, vchr_status = 'active',
                           dat_start_date = $2, dat_end_date = $3
                       WHERE pk_bint_subscription_id = $4""",
                    intPlanId, datStart, datEnd,
                    rstExisting['pk_bint_subscription_id']
                )
            else:
                await conn.execute(
                    """INSERT INTO tbl_subscription (fk_bint_user_id, fk_bint_plan_id, vchr_status, dat_start_date, dat_end_date)
                       VALUES ($1, $2, 'active', $3, $4)""",
                    intTargetUserId, intPlanId, datStart, datEnd
                )

        logger.info(f"Admin activated subscription: user={intTargetUserId}, plan={intPlanId}, days={intDays}")
        return {"strMessage": f"Subscription activated for {intDays} days", "blnSuccess": True}

    async def fnAdminSuspend(self, intTargetUserId: int):
        """Admin: Suspend a user's subscription"""
        async with self.insPool.acquire() as conn:
            rstUpdated = await conn.fetchrow(
                """UPDATE tbl_subscription SET vchr_status = 'suspended'
                   WHERE fk_bint_user_id = $1 AND vchr_status IN ('trial', 'active')
                   RETURNING pk_bint_subscription_id""",
                intTargetUserId
            )

        if not rstUpdated:
            return {"strMessage": "No active subscription found", "blnSuccess": False}

        logger.info(f"Admin suspended subscription: user={intTargetUserId}")
        return {"strMessage": "Subscription suspended", "blnSuccess": True}

    async def fnAdminRecordPayment(self, intTargetUserId: int, intPlanId: int, dblAmount: float,
                                    strPaymentMethod: str, strReference: str = "", strNotes: str = "",
                                    intDays: int = 365):
        """Admin: Record manual payment (UPI/bank/cash) and activate subscription"""
        datStart = date.today()
        datEnd = datStart + timedelta(days=intDays)

        async with self.insPool.acquire() as conn:
            # Check user exists
            rstUser = await conn.fetchrow(
                "SELECT pk_bint_user_id, vchr_email FROM tbl_user WHERE pk_bint_user_id = $1",
                intTargetUserId
            )
            if not rstUser:
                return {"strMessage": "User not found", "blnSuccess": False}

            # Activate/update subscription
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_subscription_id FROM tbl_subscription WHERE fk_bint_user_id = $1 ORDER BY pk_bint_subscription_id DESC LIMIT 1",
                intTargetUserId
            )

            intSubId = None
            if rstExisting:
                intSubId = rstExisting['pk_bint_subscription_id']
                await conn.execute(
                    """UPDATE tbl_subscription
                       SET fk_bint_plan_id = $1, vchr_status = 'active',
                           dat_start_date = $2, dat_end_date = $3
                       WHERE pk_bint_subscription_id = $4""",
                    intPlanId, datStart, datEnd, intSubId
                )
            else:
                rstNew = await conn.fetchrow(
                    """INSERT INTO tbl_subscription (fk_bint_user_id, fk_bint_plan_id, vchr_status, dat_start_date, dat_end_date)
                       VALUES ($1, $2, 'active', $3, $4) RETURNING pk_bint_subscription_id""",
                    intTargetUserId, intPlanId, datStart, datEnd
                )
                intSubId = rstNew['pk_bint_subscription_id']

            # Record payment
            await conn.execute(
                """INSERT INTO tbl_payment (
                    fk_bint_user_id, fk_bint_subscription_id, vchr_payment_method,
                    vchr_manual_reference, txt_notes, dbl_amount, vchr_status, int_recorded_by
                ) VALUES ($1, $2, $3, $4, $5, $6, 'captured', $7)""",
                intTargetUserId, intSubId, strPaymentMethod,
                strReference, strNotes, dblAmount, self.intUserId
            )

        logger.info(f"Manual payment recorded: user={intTargetUserId}, amount={dblAmount}, method={strPaymentMethod}")
        return {
            "strMessage": f"Payment of \u20B9{dblAmount:,.0f} recorded. Subscription activated for {intDays} days.",
            "blnSuccess": True
        }

    async def fnAdminGetPayments(self):
        """Admin: Get all payment history"""
        async with self.insPool.acquire() as conn:
            rstPayments = await conn.fetch(
                """SELECT p.*, u.vchr_email, u.vchr_username, u.vchr_business_name,
                          pl.vchr_display_name AS str_plan_name
                   FROM tbl_payment p
                   JOIN tbl_user u ON p.fk_bint_user_id = u.pk_bint_user_id
                   LEFT JOIN tbl_subscription s ON p.fk_bint_subscription_id = s.pk_bint_subscription_id
                   LEFT JOIN tbl_subscription_plan pl ON s.fk_bint_plan_id = pl.pk_bint_plan_id
                   ORDER BY p.tim_created_at DESC
                   LIMIT 100"""
            )

        lstPayments = []
        for row in rstPayments:
            lstPayments.append({
                "intPaymentId": row['pk_bint_payment_id'],
                "intUserId": row['fk_bint_user_id'],
                "strEmail": row['vchr_email'],
                "strUsername": row['vchr_username'],
                "strBusinessName": row['vchr_business_name'],
                "strPlanName": row['str_plan_name'],
                "strPaymentMethod": row['vchr_payment_method'],
                "strReference": row['vchr_manual_reference'] or row['vchr_razorpay_payment_id'] or "",
                "strNotes": row['txt_notes'] or "",
                "dblAmount": float(row['dbl_amount']),
                "strStatus": row['vchr_status'],
                "strCreatedAt": str(row['tim_created_at']),
            })

        return {"lstPayments": lstPayments}
