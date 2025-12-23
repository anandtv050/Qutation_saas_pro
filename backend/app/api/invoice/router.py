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

router = APIRouter(prefix="/invoice", tags=["Invoice"])


@router.post("/list", response_model=MdlInvoiceListResponse)
async def fnGetInvoiceList(intUserId: Annotated[int, Depends(fnGetCurrentUser)]):
    """Get all invoices"""
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnGetAllInvoiceList()
    except asyncpg.PostgresError as e:
        return MdlInvoiceListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            lstInvoice=[]
        )
    except Exception as e:
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
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnGetSingleInvoiceDetails(mdlRequest.intInvoiceId)
    except asyncpg.PostgresError as e:
        return MdlInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
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
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnAddInvoiceService(mdlRequest)
    except asyncpg.PostgresError as e:
        return MdlInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
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
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(pool, intUserId)
        return await insService.fnDeleteInvoiceService(mdlRequest.intInvoiceId)
    except asyncpg.PostgresError as e:
        return MdlDeleteInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            intDeletedId=None
        )
    except Exception as e:
        return MdlDeleteInvoiceResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Error: {str(e)}",
            intDeletedId=None
        )
