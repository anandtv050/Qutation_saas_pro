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


async def get_pool() -> Pool:
    db = ClsDatabasepool()
    return await db.fnGetPool()


@router.post("/process", response_model=MdlProcessQuotationResponse)
async def process_quotation(
    request: MdlProcessQuotationRequest,
    pool: Pool = Depends(get_pool),
    user_id: int = Depends(fnGetCurrentUser)
):
    """
    Process raw text using AI to generate quotation items.

    Example request:
    {
        "strRawText": "2 cameras, 1 DVR, wiring 100m, customer John 9876543210"
    }

    Returns AI-generated quotation items matched with inventory.
    """
    service = ClsAIQuotationService(pool, user_id)
    return await service.fnProcessQuotation(request.strRawText)
