import asyncio
import secrets
from datetime import datetime, timedelta
from fastapi import HTTPException, status

from app.api.login.schema import MdlLoginResponse, MdlSignupRequest
from app.core.security import fnCreateAccesToken, fnVerifyPassword, fnHashPassword
from app.core.logger import getUserLogger
from app.core.presence import ClsPresenceTracker


class ClsLoginService:
    def __init__(self, insPool) -> None:
        self.insPool = insPool

    async def fnLoginService(self,mdlLoginRequest) :
            logger = getUserLogger(0)  # Use 0 for login (user not known yet)

            # get user details using email
            strQuery = """ SELECT
                                pk_bint_user_id,
                                vchr_email,
                                vchr_password_hash,
                                vchr_username,
                                vchr_business_name,
                                bln_is_active
                            FROM tbl_user
                            WHERE vchr_email = $1
                            """
            try:
                # Add timeout for connection acquire (10 seconds max)
                async with asyncio.timeout(10):
                    async with self.insPool.acquire() as conn:
                        rstUser = await conn.fetchrow(strQuery,mdlLoginRequest.email)
            except asyncio.TimeoutError:
                logger.error(f"Database connection timeout for login: {mdlLoginRequest.email}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Something went wrong. Please try again."
                )

            if not rstUser:
                raise HTTPException(
                    status_code  =status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Email or password"
                )

            # Check if user is active
            if not rstUser.get('bln_is_active', True):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account has been deactivated. Please contact support."
                )

            # Verify password using bcrypt
            if not fnVerifyPassword(mdlLoginRequest.password, rstUser['vchr_password_hash']):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password"
                )

            ## Create JWT token
            strAccessToken = fnCreateAccesToken(
                data={
                    "user_id": rstUser['pk_bint_user_id'],
                    "email": rstUser['vchr_email']
                }
            )

            dctUserInfo = {
                "intUserId": rstUser['pk_bint_user_id'],
                "strEmail": rstUser['vchr_email'],
                "strUserName": rstUser['vchr_username'],
                "strBusinessName": rstUser['vchr_business_name']
            }

            # Fetch subscription status for login response
            async with self.insPool.acquire() as conn:
                rstSub = await conn.fetchrow(
                    """SELECT s.vchr_status, s.dat_end_date, p.vchr_display_name
                       FROM tbl_subscription s
                       JOIN tbl_subscription_plan p ON s.fk_bint_plan_id = p.pk_bint_plan_id
                       WHERE s.fk_bint_user_id = $1
                       ORDER BY s.pk_bint_subscription_id DESC LIMIT 1""",
                    rstUser['pk_bint_user_id']
                )

            if rstSub:
                from datetime import date
                intDaysRemaining = (rstSub['dat_end_date'] - date.today()).days
                strStatus = rstSub['vchr_status']

                # Auto-expire if end date passed but status not updated yet
                if intDaysRemaining < 0 and strStatus in ('trial', 'active'):
                    strStatus = 'expired'
                    async with self.insPool.acquire() as conn:
                        await conn.execute(
                            "UPDATE tbl_subscription SET vchr_status = 'expired' WHERE fk_bint_user_id = $1 AND vchr_status IN ('trial', 'active')",
                            rstUser['pk_bint_user_id']
                        )

                dctUserInfo["dctSubscription"] = {
                    "strStatus": strStatus,
                    "strPlanName": rstSub['vchr_display_name'],
                    "intDaysRemaining": max(intDaysRemaining, 0),
                    "datEndDate": str(rstSub['dat_end_date'])
                }

            # Update presence: mark user as logged in
            insPresence = ClsPresenceTracker()
            await insPresence.fnSetLogin(self.insPool, rstUser['pk_bint_user_id'])

            # Return instance, not class!
            return MdlLoginResponse(
                strAccessToken=strAccessToken,
                strTokentype="bearer",
                dctUserInfo=dctUserInfo
            )

    async def fnSignupService(self, mdlSignupRequest: MdlSignupRequest):
        """Self-service signup: create user, add sample data, return JWT"""
        logger = getUserLogger(0)

        async with self.insPool.acquire() as conn:
            # Check if email already exists
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_user_id FROM tbl_user WHERE vchr_email = $1",
                mdlSignupRequest.email
            )
            if rstExisting:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An account with this email already exists. Please sign in."
                )

            # Hash password and create user
            strHashedPassword = fnHashPassword(mdlSignupRequest.password)

            rstNewUser = await conn.fetchrow(
                """INSERT INTO tbl_user (
                    vchr_email, vchr_password_hash, vchr_username,
                    vchr_business_name, vchr_phone, fk_bint_service_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING pk_bint_user_id, vchr_email, vchr_username, vchr_business_name""",
                mdlSignupRequest.email,
                strHashedPassword,
                mdlSignupRequest.username,
                mdlSignupRequest.businessName,
                mdlSignupRequest.phone,
                mdlSignupRequest.serviceId
            )

            intNewUserId = rstNewUser['pk_bint_user_id']
            logger.info(f"New user registered: ID={intNewUserId} | Email={mdlSignupRequest.email}")

            # Auto-create 7-day trial subscription (dynamic plan lookup)
            rstTrialPlan = await conn.fetchrow(
                "SELECT pk_bint_plan_id FROM tbl_subscription_plan WHERE vchr_plan_name = 'free_trial' LIMIT 1"
            )
            if rstTrialPlan:
                await conn.execute(
                    """INSERT INTO tbl_subscription (fk_bint_user_id, fk_bint_plan_id, vchr_status, dat_start_date, dat_end_date)
                       VALUES ($1, $2, 'trial', CURRENT_DATE, CURRENT_DATE + 7)""",
                    intNewUserId, rstTrialPlan['pk_bint_plan_id']
                )

        # Create JWT token (auto-login after signup)
        strAccessToken = fnCreateAccesToken(
            data={
                "user_id": intNewUserId,
                "email": rstNewUser['vchr_email']
            }
        )

        # Mark user as logged in
        insPresence = ClsPresenceTracker()
        await insPresence.fnSetLogin(self.insPool, intNewUserId)

        return MdlLoginResponse(
            strAccessToken=strAccessToken,
            strTokentype="bearer",
            dctUserInfo={
                "intUserId": intNewUserId,
                "strEmail": rstNewUser['vchr_email'],
                "strUserName": rstNewUser['vchr_username'],
                "strBusinessName": rstNewUser['vchr_business_name'],
                "blnIsNewUser": True
            }
        )

    async def fnForgotPassword(self, strEmail: str):
        """Generate password reset token and return it (email sending handled separately)"""
        logger = getUserLogger(0)

        async with self.insPool.acquire() as conn:
            rstUser = await conn.fetchrow(
                "SELECT pk_bint_user_id, vchr_email FROM tbl_user WHERE vchr_email = $1 AND bln_is_active =$2",
                strEmail,True
            )

            if not rstUser:
                # Don't reveal if email exists or not (security best practice)
                return {"strMessage": "If an account with this email exists, a reset link has been sent."}

            # Generate reset token
            strToken = secrets.token_urlsafe(32)
            timExpiry = datetime.utcnow() + timedelta(hours=1)

            await conn.execute(
                "UPDATE tbl_user SET vchr_reset_token = $1, tim_reset_token_expiry = $2 WHERE pk_bint_user_id = $3",
                strToken, timExpiry, rstUser['pk_bint_user_id']
            )

            logger.info(f"Password reset token generated for: {strEmail}")

            # TODO: Send email with reset link using Resend
            # For now, return the token (in production, only send via email)
            return {
                "strMessage": "If an account with this email exists, a reset link has been sent.",
                "strResetToken": strToken  # Remove this in production — only send via email
            }

    async def fnResetPassword(self, strToken: str, strNewPassword: str):
        """Reset password using token"""
        logger = getUserLogger(0)

        async with self.insPool.acquire() as conn:
            rstUser = await conn.fetchrow(
                """SELECT pk_bint_user_id, vchr_email
                   FROM tbl_user
                   WHERE vchr_reset_token = $1 AND tim_reset_token_expiry > $2""",
                strToken, datetime.utcnow()
            )

            if not rstUser:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid or expired reset link. Please request a new one."
                )

            # Hash new password and update
            strHashedPassword = fnHashPassword(strNewPassword)

            await conn.execute(
                """UPDATE tbl_user
                   SET vchr_password_hash = $1, vchr_reset_token = NULL, tim_reset_token_expiry = NULL
                   WHERE pk_bint_user_id = $2""",
                strHashedPassword, rstUser['pk_bint_user_id']
            )

            logger.info(f"Password reset successful for: {rstUser['vchr_email']}")
            return {"strMessage": "Password has been reset successfully. You can now sign in."}
