from fastapi import APIRouter, Depends
from asyncpg import Pool

from app.core.database import ClsDatabasepool
from app.core.security import fnGetAdminUser
from app.core.logger import getLogger
from app.api.service.service import ClsServiceMasterService
from app.api.service.schema import (
    MdlCreateServiceRequest, MdlUpdateServiceRequest, MdlDeleteServiceRequest,
    MdlServiceListResponse, MdlServiceDetailResponse,
)

logger = getLogger()

router = APIRouter(prefix="/service", tags=["Service Management"])


async def fnGetPool() -> Pool:
    insDb = ClsDatabasepool()
    return await insDb.fnGetPool()


@router.get("/active", response_model=MdlServiceListResponse)
async def fnGetActiveServices(insPool: Pool = Depends(fnGetPool)):
    """Get active services (public - for signup page)"""
    insService = ClsServiceMasterService(insPool, 0)
    return await insService.fnGetAllServices(blnIncludeInactive=False)


@router.post("/list", response_model=MdlServiceListResponse)
async def fnGetAllServices(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get all services including inactive (Admin only)"""
    insService = ClsServiceMasterService(insPool, intUserId)
    return await insService.fnGetAllServices(blnIncludeInactive=True)


@router.post("/detail", response_model=MdlServiceDetailResponse)
async def fnGetServiceDetail(
    mdlRequest: MdlDeleteServiceRequest,  # reuse: just needs intServiceId
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get service detail with prompt (Admin only)"""
    insService = ClsServiceMasterService(insPool, intUserId)
    return await insService.fnGetServiceDetail(mdlRequest.intServiceId)


@router.post("/add", response_model=MdlServiceDetailResponse)
async def fnCreateService(
    mdlRequest: MdlCreateServiceRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Create new service (Admin only)"""
    insService = ClsServiceMasterService(insPool, intUserId)
    return await insService.fnCreateService(mdlRequest)


@router.post("/update", response_model=MdlServiceDetailResponse)
async def fnUpdateService(
    mdlRequest: MdlUpdateServiceRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Update service (Admin only)"""
    insService = ClsServiceMasterService(insPool, intUserId)
    return await insService.fnUpdateService(mdlRequest)


@router.post("/delete", response_model=MdlServiceDetailResponse)
async def fnDeleteService(
    mdlRequest: MdlDeleteServiceRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Delete service (Admin only)"""
    insService = ClsServiceMasterService(insPool, intUserId)
    return await insService.fnDeleteService(mdlRequest.intServiceId)
