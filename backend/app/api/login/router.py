from fastapi import APIRouter, HTTPException, status, Depends
import asyncpg

from app.api.login.schema import MdlLoginRequest, MdlLoginResponse, MdlSignupRequest, MdlForgotPasswordRequest, MdlResetPasswordRequest
from app.api.login.service import ClsLoginService
from app.core.database import ClsDatabasepool
from app.core.logger import getLogger
from app.core.security import fnGetCurrentUser
from app.core.presence import ClsPresenceTracker

logger = getLogger()

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=MdlLoginResponse)
async def fnLogin(mdlLoginRequest: MdlLoginRequest):
    try:
        logger.info(f"Login attempt: {mdlLoginRequest.email}")

        objDatabase = ClsDatabasepool()
        objPool = await objDatabase.fnGetPool()
        insLoginService = ClsLoginService(objPool)
        mdlLoginResponse = await insLoginService.fnLoginService(mdlLoginRequest)
        logger.info(f"Login successful: {mdlLoginRequest.email}")
        return mdlLoginResponse

    except HTTPException as e:
        logger.warning(f"Login failed: {mdlLoginRequest.email} - {e.detail}")
        raise
    except asyncpg.PostgresError as e:
        logger.error(f"Database error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/signup", response_model=MdlLoginResponse)
async def fnSignup(mdlSignupRequest: MdlSignupRequest):
    """Create a new user with a free-trial plan and return a JWT (auto-login).

    Not surfaced in the frontend (B2B onboarding is admin-driven via /user/add),
    but kept live for: programmatic onboarding scripts, future re-enablement,
    partner/integrator use, and internal tooling.
    """
    try:
        logger.info(f"Signup attempt: {mdlSignupRequest.email}")

        objDatabase = ClsDatabasepool()
        objPool = await objDatabase.fnGetPool()
        insLoginService = ClsLoginService(objPool)
        mdlResponse = await insLoginService.fnSignupService(mdlSignupRequest)
        logger.info(f"Signup successful: {mdlSignupRequest.email}")
        return mdlResponse

    except HTTPException as e:
        logger.warning(f"Signup failed: {mdlSignupRequest.email} - {e.detail}")
        raise
    except asyncpg.PostgresError as e:
        logger.error(f"Database error during signup: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Signup error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/forgot-password")
async def fnForgotPassword(mdlRequest: MdlForgotPasswordRequest):
    """Request password reset link"""
    try:
        objDatabase = ClsDatabasepool()
        objPool = await objDatabase.fnGetPool()
        insLoginService = ClsLoginService(objPool)
        return await insLoginService.fnForgotPassword(mdlRequest.email)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forgot password error: {str(e)}", exc_info=True)
        return {"strMessage": "If an account with this email exists, a reset link has been sent."}


@router.post("/reset-password")
async def fnResetPassword(mdlRequest: MdlResetPasswordRequest):
    """Reset password using token"""
    try:
        objDatabase = ClsDatabasepool()
        objPool = await objDatabase.fnGetPool()
        insLoginService = ClsLoginService(objPool)
        return await insLoginService.fnResetPassword(mdlRequest.token, mdlRequest.password)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Reset password error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Something went wrong. Please try again."
        )


@router.post("/logout")
async def fnLogout(intUserId: int = Depends(fnGetCurrentUser)):
    """Logout: clear user heartbeat so they appear offline immediately"""
    try:
        objDatabase = ClsDatabasepool()
        objPool = await objDatabase.fnGetPool()
        insPresence = ClsPresenceTracker()
        await insPresence.fnClearPresence(objPool, intUserId)
        return {"strMessage": "Logged out successfully"}
    except Exception as e:
        logger.error(f"Logout error for user {intUserId}: {str(e)}")
        return {"strMessage": "Logged out"}