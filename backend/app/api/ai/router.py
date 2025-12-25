from fastapi import APIRouter, Depends
from asyncpg import Pool

from app.core.database import ClsDatabasepool
from app.core.security import fnGetCurrentUser
from app.api.ai.service import ClsAIQuotationService
from app.api.ai.schema import (
    MdlProcessQuotationRequest,
    MdlProcessQuotationResponse
)


router = APIRouter(prefix="/ai", tags=["AI Quotation"])


async def fnGetPool() -> Pool:
    insDb = ClsDatabasepool()
    return await insDb.fnGetPool()


@router.post("/process", response_model=MdlProcessQuotationResponse)
async def fnProcessQuotation(
    mdlRequest: MdlProcessQuotationRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetCurrentUser)
):
    """
    Process raw text using AI to generate quotation items.

    Example request:
    {
        "strRawText": "2 cameras, 1 DVR, wiring 100m, customer John 9876543210"
    }

    Returns AI-generated quotation items matched with inventory.
    """
    insService = ClsAIQuotationService(insPool, intUserId)
    return await insService.fnProcessQuotation(mdlRequest.strRawText)
