from fastapi import APIRouter,HTTPException,status,Depends
import asyncpg

from app.api.login.schema import MdlLoginRequest,MdlLoginResponse
from app.api.login.service import ClsLoginService
from app.core.database import ClsDatabasepool
from app.core.logger import getLogger
from app.core.security import fnGetCurrentUser
from app.core.presence import ClsPresenceTracker

logger = getLogger()

router = APIRouter(prefix="/auth",tags=["Authentication"])

@router.post("/login",response_model=MdlLoginResponse)
async def fnLogin(mdlLoginRequest:MdlLoginRequest):
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