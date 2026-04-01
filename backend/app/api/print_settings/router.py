from fastapi import APIRouter, Depends
import asyncpg

from app.api.print_settings.schema import (
    MdlGetPrintSettingsRequest,
    MdlSavePrintSettingsRequest,
    MdlPrintSettingsResponse,
)
from app.api.print_settings.service import ClsPrintSettingsService
from app.core.baseSchema import ResponseStatus
from app.core.dependency import fnGetContext
from app.core.security import ADMIN_USER_ID
from app.core.logger import getUserLogger

router = APIRouter(prefix="/print-settings", tags=["Print Settings"])


def _resolve_target_user(objContext, intTargetUserId):
    """Admin (user_id=1) can operate on any user; others only on themselves."""
    if intTargetUserId and objContext.intUserId == ADMIN_USER_ID:
        return intTargetUserId
    return objContext.intUserId


@router.post("/get", response_model=MdlPrintSettingsResponse)
async def fnGetPrintSettings(
    mdlRequest: MdlGetPrintSettingsRequest,
    objContext=Depends(fnGetContext),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        intTargetUser = _resolve_target_user(objContext, mdlRequest.intTargetUserId)
        insService = ClsPrintSettingsService(objContext.objPool, intTargetUser)
        return await insService.fnGetPrintSettings(mdlRequest.vchModule)

    except asyncpg.PostgresError as e:
        logger.error(f"Database error fetching print settings: {str(e)}")
        return MdlPrintSettingsResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None,
        )
    except Exception as e:
        logger.error(f"Error fetching print settings: {str(e)}", exc_info=True)
        return MdlPrintSettingsResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            data=None,
        )


@router.post("/save", response_model=MdlPrintSettingsResponse)
async def fnSavePrintSettings(
    mdlRequest: MdlSavePrintSettingsRequest,
    objContext=Depends(fnGetContext),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        intTargetUser = _resolve_target_user(objContext, mdlRequest.intTargetUserId)
        insService = ClsPrintSettingsService(objContext.objPool, intTargetUser)
        return await insService.fnSavePrintSettings(mdlRequest)

    except asyncpg.PostgresError as e:
        logger.error(f"Database error saving print settings: {str(e)}")
        return MdlPrintSettingsResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None,
        )
    except Exception as e:
        logger.error(f"Error saving print settings: {str(e)}", exc_info=True)
        return MdlPrintSettingsResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            data=None,
        )
