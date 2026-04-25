from fastapi import APIRouter, Depends
from asyncpg import Pool

from app.core.database import ClsDatabasepool
from app.core.security import fnGetAdminUser
from app.core.logger import getLogger
from app.api.plan.service import ClsPlanService
from app.api.plan.schema import (
    MdlCreatePlanRequest,
    MdlUpdatePlanRequest,
    MdlDeletePlanRequest,
    MdlPlanListResponse,
    MdlPlanResponse,
)

logger = getLogger()

router = APIRouter(prefix="/plan", tags=["Plan Management"])


async def fnGetPool() -> Pool:
    insDb = ClsDatabasepool()
    return await insDb.fnGetPool()


@router.post("/list", response_model=MdlPlanListResponse)
async def fnGetAllPlans(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get all subscription plans (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnGetAllPlans()


@router.get("/active")
async def fnGetActivePlans(insPool: Pool = Depends(fnGetPool)):
    """Get active paid plans with module permissions.
    Used by the in-app Subscribe/Upgrade page (logged-in users).
    The marketing landing page is hardcoded and does NOT call this endpoint.
    """
    insService = ClsPlanService(insPool, intUserId=0)
    return await insService.fnGetActivePublicPlans()


@router.post("/add", response_model=MdlPlanResponse)
async def fnCreatePlan(
    mdlRequest: MdlCreatePlanRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Create new subscription plan (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnCreatePlan(mdlRequest)


@router.post("/update", response_model=MdlPlanResponse)
async def fnUpdatePlan(
    mdlRequest: MdlUpdatePlanRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Update subscription plan (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnUpdatePlan(mdlRequest)


@router.post("/delete", response_model=MdlPlanResponse)
async def fnDeletePlan(
    mdlRequest: MdlDeletePlanRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Delete subscription plan (Admin only)"""
    insService = ClsPlanService(insPool, intUserId)
    return await insService.fnDeletePlan(mdlRequest.intPlanId)
