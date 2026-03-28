from fastapi import APIRouter, Depends
import asyncpg

from app.api.dashboard.schema import (
    MdlDashboardResponse, MdlAdminDashboardResponse,
    MdlAdminUserDetailResponse, MdlAdminRequest,
)
from app.api.dashboard.service import ClsDashboardService
from app.core.baseSchema import ResponseStatus
from app.core.dependency import fnGetContext, fnGetAdminContext
from app.core.logger import getUserLogger, getLogger

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.post("/summary", response_model=MdlDashboardResponse)
async def fnGetDashboardSummary(objContext=Depends(fnGetContext)):
    """User dashboard summary"""
    objLogger = getUserLogger(objContext.intUserId)
    try:
        insService = ClsDashboardService(objContext.objPool, objContext.intUserId)
        return await insService.fnGetDashboardSummary()
    except asyncpg.PostgresError as e:
        objLogger.error(f"DB error in dashboard: {e}")
        return MdlDashboardResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {e}", data=None,
        )
    except Exception as e:
        objLogger.error(f"Error in dashboard: {e}", exc_info=True)
        return MdlDashboardResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {e}", data=None,
        )


@router.post("/admin/summary", response_model=MdlAdminDashboardResponse)
async def fnGetAdminDashboard(
    objBody: MdlAdminRequest = MdlAdminRequest(),
    objContext=Depends(fnGetAdminContext),
):
    """Admin-only: Platform analytics with period filtering"""
    objLogger = getLogger()
    try:
        insService = ClsDashboardService(objContext.objPool, objContext.intUserId)
        return await insService.fnGetAdminDashboard(objBody.strPeriod)
    except asyncpg.PostgresError as e:
        objLogger.error(f"DB error in admin dashboard: {e}")
        return MdlAdminDashboardResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {e}", data=None,
        )
    except Exception as e:
        objLogger.error(f"Error in admin dashboard: {e}", exc_info=True)
        return MdlAdminDashboardResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {e}", data=None,
        )


@router.post("/admin/user/{intTargetUserId}", response_model=MdlAdminUserDetailResponse)
async def fnGetAdminUserDetail(
    intTargetUserId: int,
    objBody: MdlAdminRequest = MdlAdminRequest(),
    objContext=Depends(fnGetAdminContext),
):
    """Admin-only: Detailed user analytics with period filtering"""
    objLogger = getLogger()
    try:
        insService = ClsDashboardService(objContext.objPool, objContext.intUserId)
        return await insService.fnGetAdminUserDetail(intTargetUserId, objBody.strPeriod)
    except asyncpg.PostgresError as e:
        objLogger.error(f"DB error in admin user detail: {e}")
        return MdlAdminUserDetailResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {e}", data=None,
        )
    except Exception as e:
        objLogger.error(f"Error in admin user detail: {e}", exc_info=True)
        return MdlAdminUserDetailResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {e}", data=None,
        )
