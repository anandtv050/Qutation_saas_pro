from typing import Annotated
from fastapi import APIRouter, Depends
import asyncpg

from app.api.invoice.schema import (
    MdlCreateInvoiceRequest,
    MdlGetInvoiceRequest,
    MdlDeleteInvoiceRequest,
    MdlInvoiceResponse,
    MdlInvoiceListResponse,
    MdlDeleteInvoiceResponse
)
from app.api.invoice.service import ClsInvoiceService
from app.core.database import ClsDatabasepool
from app.core.baseSchema import ResponseStatus
from app.core.security import fnGetCurrentUser
from app.core.logger import getUserLogger

router = APIRouter(prefix="/invoice", tags=["Invoice"])


@router.post("/list", response_model=MdlInvoiceListResponse)
async def fnGetInvoiceList(intUserId: Annotated[int, Depends(fnGetCurrentUser)]):
    """Get all invoices"""
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnGetAllInvoiceList()
    except asyncpg.PostgresError as e:
        logger.error(f"Database error in invoice list: {str(e)}")
        return MdlInvoiceListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            lstInvoice=[]
        )
    except Exception as e:
        logger.error(f"Error in invoice list: {str(e)}", exc_info=True)
        return MdlInvoiceListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}",
            lstInvoice=[]
        )


@router.post("/get", response_model=MdlInvoiceResponse)
async def fnGetInvoice(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlRequest: MdlGetInvoiceRequest
):
    """Get single invoice with items"""
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnGetSingleInvoiceDetails(mdlRequest.intInvoiceId)
    except asyncpg.PostgresError as e:
        logger.error(f"Database error getting invoice {mdlRequest.intInvoiceId}: {str(e)}")
        return MdlInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        logger.error(f"Error getting invoice {mdlRequest.intInvoiceId}: {str(e)}", exc_info=True)
        return MdlInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}",
            data=None
        )


@router.post("/add", response_model=MdlInvoiceResponse)
async def fnAddInvoice(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlRequest: MdlCreateInvoiceRequest
):
    """Create new invoice"""
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnAddInvoiceService(mdlRequest)
    except asyncpg.PostgresError as e:
        logger.error(f"Database error creating invoice: {str(e)}")
        return MdlInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}", exc_info=True)
        return MdlInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}",
            data=None
        )


@router.post("/delete", response_model=MdlDeleteInvoiceResponse)
async def fnDeleteInvoice(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlRequest: MdlDeleteInvoiceRequest
):
    """Delete invoice"""
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnDeleteInvoiceService(mdlRequest.intInvoiceId)
    except asyncpg.PostgresError as e:
        logger.error(f"Database error deleting invoice {mdlRequest.intInvoiceId}: {str(e)}")
        return MdlDeleteInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            intDeletedId=None
        )
    except Exception as e:
        logger.error(f"Error deleting invoice {mdlRequest.intInvoiceId}: {str(e)}", exc_info=True)
        return MdlDeleteInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}",
            intDeletedId=None
        )
