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
from app.core.dependency import fnGetContext, fnRequireModule
from app.core.feature import fnCheckModuleOperation, fnIncrementModuleUsage
from app.core.logger import getUserLogger

router = APIRouter(prefix="/invoice", tags=["Invoice"])


@router.post("/list", response_model=MdlInvoiceListResponse)
async def fnGetInvoiceList(objContext=Depends(fnRequireModule("invoice"))):
    """Get all invoices"""
    logger = getUserLogger(objContext.intUserId)
    try:
        insService = ClsInvoiceService(objContext.objPool, objContext.intUserId)
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
    mdlRequest : MdlGetInvoiceRequest,
    objContext=Depends(fnRequireModule("invoice"))
):
    """Get single invoice with items"""
    logger = getUserLogger(objContext.intUserId)
    try:

        insService = ClsInvoiceService(objContext.objPool, objContext.intUserId)
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
    mdlRequest : MdlCreateInvoiceRequest,
    objContext=Depends(fnRequireModule("invoice"))
):
    """Create new invoice"""
    logger = getUserLogger(objContext.intUserId)
    try:
        # Check invoice create limit
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "invoice", "create")

        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insService = ClsInvoiceService(objContext.objPool, objContext.intUserId)
        objResponse = await insService.fnAddInvoiceService(mdlRequest)

        # Increment usage after successful creation
        if objResponse.intStatus == ResponseStatus.SUCCESS:
            await fnIncrementModuleUsage(objContext.objPool, objContext.intUserId, "invoice", "create")

        return objResponse
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
    mdlRequest : MdlDeleteInvoiceRequest,
    objContext=Depends(fnRequireModule("invoice"))
):
    """Delete invoice"""
    logger = getUserLogger(objContext.intUserId)
    try:
        # Check invoice delete permission
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "invoice", "delete")

        insService = ClsInvoiceService(objContext.objPool, objContext.intUserId)
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
