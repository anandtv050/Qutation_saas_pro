from fastapi import APIRouter, Depends
import asyncpg

from app.api.advance_receipt.schema import (
    MdlCreateAdvanceReceiptRequest,
    MdlUpdateAdvanceReceiptRequest,
    MdlGetAdvanceReceiptRequest,
    MdlByQuotationRequest,
    MdlVoidAdvanceReceiptRequest,
    MdlAdvanceReceiptResponse,
    MdlAdvanceReceiptListResponse,
)
from app.api.advance_receipt.service import ClsAdvanceReceiptService
from app.core.baseSchema import ResponseStatus
from app.core.dependency import fnRequireModule
from app.core.feature import fnCheckModuleOperation, fnIncrementModuleUsage
from app.core.logger import getUserLogger

router = APIRouter(prefix="/advance-receipt", tags=["Advance Receipt"])


@router.post("/list", response_model=MdlAdvanceReceiptListResponse)
async def fnGetAdvanceReceiptList(objContext=Depends(fnRequireModule("advance_receipt"))):
    """All advance receipts for the current user (Reports tab)."""
    logger = getUserLogger(objContext.intUserId)
    try:
        insService = ClsAdvanceReceiptService(objContext.objPool, objContext.intUserId)
        return await insService.fnGetList()
    except Exception as e:
        logger.error(f"Error in advance receipt list: {str(e)}", exc_info=True)
        return MdlAdvanceReceiptListResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}", lstReceipts=[],
        )


@router.post("/by-quotation", response_model=MdlAdvanceReceiptListResponse)
async def fnGetAdvanceReceiptsByQuotation(
    mdlRequest: MdlByQuotationRequest,
    objContext=Depends(fnRequireModule("advance_receipt")),
):
    """Receipts for one quotation, plus running received/balance totals."""
    logger = getUserLogger(objContext.intUserId)
    try:
        insService = ClsAdvanceReceiptService(objContext.objPool, objContext.intUserId)
        return await insService.fnGetByQuotation(mdlRequest.intQuotationId)
    except Exception as e:
        logger.error(f"Error fetching receipts for quotation {mdlRequest.intQuotationId}: {str(e)}", exc_info=True)
        return MdlAdvanceReceiptListResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}", lstReceipts=[],
        )


@router.post("/get", response_model=MdlAdvanceReceiptResponse)
async def fnGetAdvanceReceipt(
    mdlRequest: MdlGetAdvanceReceiptRequest,
    objContext=Depends(fnRequireModule("advance_receipt")),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        insService = ClsAdvanceReceiptService(objContext.objPool, objContext.intUserId)
        return await insService.fnGet(mdlRequest.intReceiptId)
    except Exception as e:
        logger.error(f"Error getting receipt {mdlRequest.intReceiptId}: {str(e)}", exc_info=True)
        return MdlAdvanceReceiptResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}", data=None,
        )


@router.post("/add", response_model=MdlAdvanceReceiptResponse)
async def fnAddAdvanceReceipt(
    mdlRequest: MdlCreateAdvanceReceiptRequest,
    objContext=Depends(fnRequireModule("advance_receipt")),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "advance_receipt", "create")

        insService = ClsAdvanceReceiptService(objContext.objPool, objContext.intUserId)
        objResponse = await insService.fnCreate(mdlRequest)

        if objResponse.intStatus == ResponseStatus.SUCCESS:
            await fnIncrementModuleUsage(objContext.objPool, objContext.intUserId, "advance_receipt", "create")

        return objResponse
    except asyncpg.PostgresError as e:
        logger.error(f"Database error creating advance receipt: {str(e)}")
        return MdlAdvanceReceiptResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}", data=None,
        )
    except Exception as e:
        logger.error(f"Error creating advance receipt: {str(e)}", exc_info=True)
        return MdlAdvanceReceiptResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}", data=None,
        )


@router.post("/update", response_model=MdlAdvanceReceiptResponse)
async def fnUpdateAdvanceReceipt(
    mdlRequest: MdlUpdateAdvanceReceiptRequest,
    objContext=Depends(fnRequireModule("advance_receipt")),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "advance_receipt", "update")
        insService = ClsAdvanceReceiptService(objContext.objPool, objContext.intUserId)
        return await insService.fnUpdate(mdlRequest)
    except Exception as e:
        logger.error(f"Error updating advance receipt: {str(e)}", exc_info=True)
        return MdlAdvanceReceiptResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}", data=None,
        )


@router.post("/void", response_model=MdlAdvanceReceiptResponse)
async def fnVoidAdvanceReceipt(
    mdlRequest: MdlVoidAdvanceReceiptRequest,
    objContext=Depends(fnRequireModule("advance_receipt")),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "advance_receipt", "delete")
        insService = ClsAdvanceReceiptService(objContext.objPool, objContext.intUserId)
        return await insService.fnVoid(mdlRequest.intReceiptId)
    except Exception as e:
        logger.error(f"Error voiding advance receipt: {str(e)}", exc_info=True)
        return MdlAdvanceReceiptResponse(
            intStatus=ResponseStatus.ERROR, strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}", data=None,
        )
