from typing import Annotated
from fastapi import APIRouter, Depends
import asyncpg

from app.api.dashboard.schema import MdlDashboardResponse
from app.api.dashboard.service import ClsDashboardService
from app.core.database import ClsDatabasepool
from app.core.baseSchema import ResponseStatus
from app.core.security import fnGetCurrentUser

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.post("/summary", response_model=MdlDashboardResponse)
async def fnGetDashboardSummary(intUserId: Annotated[int, Depends(fnGetCurrentUser)]):
    """Get dashboard summary with collected and pending amounts"""
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsDashboardService(pool, intUserId)
        return await insService.fnGetDashboardSummary()
    except asyncpg.PostgresError as e:
        return MdlDashboardResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        return MdlDashboardResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}",
            data=None
        )
