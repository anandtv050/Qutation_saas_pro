import os
import hmac
import hashlib
from datetime import date, timedelta
from fastapi import HTTPException, status

from app.core.logger import getLogger

logger = getLogger()

# Razorpay config (dormant in B2B mode — manual payment is primary flow)
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")


def _fnGetEffectiveYearlyPrice(rstPlan) -> float:
    """Return offer price if active and not expired; else regular yearly price."""
    blnActive = bool(rstPlan['bln_offer_active'])
    datValid = rstPlan['dat_offer_valid_until']
    dblOfferPrice = rstPlan['dbl_offer_price_yearly']
    if blnActive and dblOfferPrice is not None and (datValid is None or datValid >= date.today()):
        return float(dblOfferPrice)
    return float(rstPlan['dbl_price_yearly'])


class ClsSubscriptionService:
    def __init__(self, insPool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId

    async def fnGetStatus(self):
        """Get current plan status for user (reads from tbl_user)."""
        async with self.insPool.acquire() as conn:
            rstUser = await conn.fetchrow(
                """SELECT u.fk_bint_plan_id, u.vchr_plan_status,
                          u.dat_plan_start_date, u.dat_plan_end_date,
                          u.bln_cancel_at_period_end, u.dat_canceled_at,
                          p.vchr_plan_name, p.vchr_display_name
                   FROM tbl_user u
                   LEFT JOIN tbl_subscription_plan p ON u.fk_bint_plan_id = p.pk_bint_plan_id
                   WHERE u.pk_bint_user_id = $1""",
                self.intUserId
            )

        if not rstUser or rstUser['fk_bint_plan_id'] is None:
            return None

        strStatus = rstUser['vchr_plan_status']
        datEnd = rstUser['dat_plan_end_date']
        intDaysRemaining = (datEnd - date.today()).days if datEnd else 0

        # Live expiry — no DB write needed (status stays; permission checks filter by date)
        if intDaysRemaining < 0 and strStatus in ('trial', 'active'):
            strStatus = 'expired'

        return {
            "intPlanId": rstUser['fk_bint_plan_id'],
            "strPlanName": rstUser['vchr_plan_name'],
            "strDisplayName": rstUser['vchr_display_name'],
            "strStatus": strStatus,
            "datStartDate": rstUser['dat_plan_start_date'],
            "datEndDate": datEnd,
            "datCurrentPeriodStart": rstUser['dat_plan_start_date'],
            "datCurrentPeriodEnd": datEnd,
            "intDaysRemaining": max(intDaysRemaining, 0),
            "blnCancelAtPeriodEnd": rstUser['bln_cancel_at_period_end'],
        }

    async def fnCreateOrder(self, intPlanId: int):
        """Create a Razorpay order for a plan (dormant in B2B; kept for future)."""
        if not RAZORPAY_KEY_ID or not RAZORPAY_KEY_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Online payment is not configured. Please contact admin to record a manual payment."
            )

        async with self.insPool.acquire() as conn:
            rstPlan = await conn.fetchrow(
                "SELECT * FROM tbl_subscription_plan WHERE pk_bint_plan_id = $1 AND bln_active = true",
                intPlanId
            )

        if not rstPlan:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
        if rstPlan['dbl_price_yearly'] <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot create order for free plan")

        dblEffectivePrice = _fnGetEffectiveYearlyPrice(rstPlan)
        dblAmount = int(dblEffectivePrice * 100)

        import httpx
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
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create payment order")

        dctOrder = response.json()
        return {
            "strOrderId": dctOrder["id"],
            "dblAmount": dblEffectivePrice,
            "dblOriginalAmount": float(rstPlan['dbl_price_yearly']),
            "strOfferLabel": rstPlan['vchr_offer_label'] if dblEffectivePrice < float(rstPlan['dbl_price_yearly']) else None,
            "strCurrency": "INR",
            "strKeyId": RAZORPAY_KEY_ID,
            "strPlanName": rstPlan['vchr_display_name'],
        }

    async def fnVerifyPayment(self, strPaymentId: str, strOrderId: str, strSignature: str, intPlanId: int):
        """Verify Razorpay payment signature and activate user plan (dormant in B2B)."""
        strExpected = hmac.HMAC(
            RAZORPAY_KEY_SECRET.encode(),
            f"{strOrderId}|{strPaymentId}".encode(),
            hashlib.sha256
        ).hexdigest()

        if strExpected != strSignature:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment verification failed")

        async with self.insPool.acquire() as conn:
            rstPlan = await conn.fetchrow(
                "SELECT * FROM tbl_subscription_plan WHERE pk_bint_plan_id = $1",
                intPlanId
            )
            if not rstPlan:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
            dblCharged = _fnGetEffectiveYearlyPrice(rstPlan)

            datStart = date.today()
            datEnd = datStart + timedelta(days=365)

            # Record payment (no subscription FK — B2B)
            await conn.execute(
                """INSERT INTO tbl_payment (
                    fk_bint_user_id, vchr_payment_type, vchr_razorpay_payment_id,
                    vchr_razorpay_order_id, vchr_razorpay_signature,
                    dbl_amount, vchr_status, tim_paid_at
                ) VALUES ($1, 'subscription', $2, $3, $4, $5, 'captured', NOW())""",
                self.intUserId, strPaymentId, strOrderId, strSignature, dblCharged
            )

            # Activate / extend plan on tbl_user
            await conn.execute(
                """UPDATE tbl_user
                   SET fk_bint_plan_id = $1, vchr_plan_status = 'active',
                       dat_plan_start_date = COALESCE(dat_plan_start_date, $2),
                       dat_plan_end_date = $3,
                       bln_cancel_at_period_end = FALSE, dat_canceled_at = NULL
                   WHERE pk_bint_user_id = $4""",
                intPlanId, datStart, datEnd, self.intUserId
            )

        logger.info(f"Plan activated via Razorpay: user={self.intUserId}, plan={intPlanId}")
        return {"strMessage": "Plan activated successfully"}

    # =====================================================
    # ADMIN METHODS (primary B2B flow)
    # =====================================================

    async def fnAdminGetAllSubscriptions(self):
        """Admin: List all users with their current plan status (from tbl_user)."""
        async with self.insPool.acquire() as conn:
            rstUsers = await conn.fetch(
                """SELECT u.pk_bint_user_id, u.vchr_email, u.vchr_username, u.vchr_business_name,
                          u.vchr_plan_status AS vchr_status,
                          u.dat_plan_start_date AS dat_start_date,
                          u.dat_plan_end_date   AS dat_end_date,
                          p.vchr_display_name
                   FROM tbl_user u
                   LEFT JOIN tbl_subscription_plan p ON u.fk_bint_plan_id = p.pk_bint_plan_id
                   WHERE u.pk_bint_user_id != 1
                   ORDER BY u.pk_bint_user_id"""
            )

        lstUsers = []
        for row in rstUsers:
            intDaysRemaining = (row['dat_end_date'] - date.today()).days if row['dat_end_date'] else None
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
        """Admin: Activate or extend a user's plan."""
        datStart = date.today()
        datEnd = datStart + timedelta(days=intDays)

        async with self.insPool.acquire() as conn:
            rstUser = await conn.fetchrow(
                "SELECT pk_bint_user_id FROM tbl_user WHERE pk_bint_user_id = $1",
                intTargetUserId
            )
            if not rstUser:
                return {"strMessage": "User not found", "blnSuccess": False}

            await conn.execute(
                """UPDATE tbl_user
                   SET fk_bint_plan_id = $1, vchr_plan_status = 'active',
                       dat_plan_start_date = COALESCE(dat_plan_start_date, $2),
                       dat_plan_end_date = $3,
                       bln_cancel_at_period_end = FALSE, dat_canceled_at = NULL, vchr_cancel_reason = NULL
                   WHERE pk_bint_user_id = $4""",
                intPlanId, datStart, datEnd, intTargetUserId
            )

        logger.info(f"Admin activated plan: user={intTargetUserId}, plan={intPlanId}, days={intDays}")
        return {"strMessage": f"Plan activated for {intDays} days", "blnSuccess": True}

    async def fnAdminSuspend(self, intTargetUserId: int):
        """Admin: Suspend a user's plan (pause access)."""
        async with self.insPool.acquire() as conn:
            rstUpdated = await conn.fetchrow(
                """UPDATE tbl_user SET vchr_plan_status = 'paused'
                   WHERE pk_bint_user_id = $1 AND vchr_plan_status IN ('trial', 'active')
                   RETURNING pk_bint_user_id""",
                intTargetUserId
            )

        if not rstUpdated:
            return {"strMessage": "No active plan found", "blnSuccess": False}

        logger.info(f"Admin suspended plan: user={intTargetUserId}")
        return {"strMessage": "Plan suspended", "blnSuccess": True}

    async def fnAdminRecordPayment(self, intTargetUserId: int, intPlanId: int, dblAmount: float,
                                    strPaymentMethod: str, strReference: str = "", strNotes: str = "",
                                    intDays: int = 365):
        """Admin: Record manual payment (UPI/bank/cash) and activate plan.
        Primary B2B flow: admin confirms payment → user's plan activates."""
        datStart = date.today()
        datEnd = datStart + timedelta(days=intDays)

        async with self.insPool.acquire() as conn:
            rstUser = await conn.fetchrow(
                "SELECT pk_bint_user_id, vchr_email FROM tbl_user WHERE pk_bint_user_id = $1",
                intTargetUserId
            )
            if not rstUser:
                return {"strMessage": "User not found", "blnSuccess": False}

            # Update plan on tbl_user
            await conn.execute(
                """UPDATE tbl_user
                   SET fk_bint_plan_id = $1, vchr_plan_status = 'active',
                       dat_plan_start_date = COALESCE(dat_plan_start_date, $2),
                       dat_plan_end_date = $3,
                       bln_cancel_at_period_end = FALSE, dat_canceled_at = NULL, vchr_cancel_reason = NULL
                   WHERE pk_bint_user_id = $4""",
                intPlanId, datStart, datEnd, intTargetUserId
            )

            # Record payment
            await conn.execute(
                """INSERT INTO tbl_payment (
                    fk_bint_user_id, vchr_payment_type, vchr_payment_method,
                    vchr_manual_reference, txt_notes,
                    dbl_amount, vchr_status, tim_paid_at
                ) VALUES ($1, 'subscription', $2, $3, $4, $5, 'captured', NOW())""",
                intTargetUserId, strPaymentMethod, strReference, strNotes, dblAmount
            )

        logger.info(f"Manual payment recorded: user={intTargetUserId}, amount={dblAmount}, method={strPaymentMethod}")
        return {
            "strMessage": f"Payment of ₹{dblAmount:,.0f} recorded. Plan activated for {intDays} days.",
            "blnSuccess": True
        }

    async def fnAdminGetPayments(self):
        """Admin: Get all payment history."""
        async with self.insPool.acquire() as conn:
            rstPayments = await conn.fetch(
                """SELECT p.*, u.vchr_email, u.vchr_username, u.vchr_business_name,
                          pl.vchr_display_name AS str_plan_name
                   FROM tbl_payment p
                   JOIN tbl_user u ON p.fk_bint_user_id = u.pk_bint_user_id
                   LEFT JOIN tbl_subscription_plan pl ON u.fk_bint_plan_id = pl.pk_bint_plan_id
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
