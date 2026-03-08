from typing import Annotated
from fastapi import APIRouter, Depends
import asyncpg

from app.api.dashboard.schema import MdlDashboardResponse
from app.api.dashboard.service import ClsDashboardService
from app.core.baseSchema import ResponseStatus
from app.core.dependency import fnGetContext
from app.core.logger import getUserLogger

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.post("/summary", response_model=MdlDashboardResponse)
async def fnGetDashboardSummary(objContext=Depends(fnGetContext)):
    """Get dashboard summary with collected and pending amounts"""
    logger = getUserLogger(objContext.intUserId)
    try:
        insService = ClsDashboardService(objContext.objPool, objContext.intUserId)
        return await insService.fnGetDashboardSummary()
    except asyncpg.PostgresError as e:
        logger.error(f"Database error in dashboard: {str(e)}")
        return MdlDashboardResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        logger.error(f"Error in dashboard: {str(e)}", exc_info=True)
        return MdlDashboardResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}",
            data=None
        )
