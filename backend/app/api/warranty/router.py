from fastapi import APIRouter, Depends
import asyncpg

from app.api.warranty.schema import MdlWarrantyReportResponse
from app.api.warranty.service import ClsWarrantyService
from app.core.baseSchema import ResponseStatus
from app.core.dependency import fnRequireModule
from app.core.logger import getUserLogger

router = APIRouter(prefix="/warranty", tags=["Warranty"])


@router.post("/list", response_model=MdlWarrantyReportResponse)
async def fnGetWarrantyReport(objContext = Depends(fnRequireModule("warranty"))):
    """Warranty report — flat list of all warranty-bearing quotation items
    for the current user, sorted by expiry ascending (most urgent first)."""
    logger = getUserLogger(objContext.intUserId)
    try:
        insWarrantyService = ClsWarrantyService(objContext.objPool, objContext.intUserId)
        return await insWarrantyService.fnGetWarrantyReportList()
    except asyncpg.PostgresError as e:
        logger.error(f"Database error in warranty report: {str(e)}")
        return MdlWarrantyReportResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            lstWarranty=[]
        )
    except Exception as e:
        logger.error(f"Error in warranty report: {str(e)}", exc_info=True)
        return MdlWarrantyReportResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            lstWarranty=[]
        )
