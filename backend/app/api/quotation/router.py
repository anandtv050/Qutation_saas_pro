from typing import Annotated
from fastapi import APIRouter, Depends
import asyncpg

from app.api.quotation.schema import (
    MdlCreateQuotationRequest,
    MdlUpdateQuotationRequest,
    MdlUpdateWarrantyRequest,
    MdlGetQuotationRequest,
    MdlDeleteQuotationRequest,
    MdlQuotationResponse,
    MdlQuotationListResponse,
    MdlDeleteQuotationResponse
)
from app.api.quotation.service import ClsQuotationService
from app.core.database import ClsDatabasepool
from app.core.baseSchema import ResponseStatus
from app.core.dependency import fnGetContext, fnRequireModule
from app.core.feature import fnCheckModuleOperation, fnIncrementModuleUsage
from app.core.logger import getUserLogger

router = APIRouter(prefix="/quotation", tags=["Quotation"])


@router.post("/list", response_model=MdlQuotationListResponse)
async def fnGetQutationList(objContext = Depends(fnRequireModule("quotation"))):
    logger = getUserLogger(objContext.intUserId)
    try:

        insQuotationService = ClsQuotationService(objContext.objPool, objContext.intUserId)
        return await insQuotationService.fnGetAllQuotationList()
    except asyncpg.PostgresError as e:
        logger.error(f"Database error in quotation list: {str(e)}")
        return MdlQuotationListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            lstQuotation=[]
        )
    except Exception as e:
        logger.error(f"Error in quotation list: {str(e)}", exc_info=True)
        return MdlQuotationListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            lstQuotation=[]
        )


@router.post("/get", response_model=MdlQuotationResponse)
async def fnGetQuotation(
    mdlGetQuotationRequest: MdlGetQuotationRequest,
    objContext = Depends(fnRequireModule("quotation"))
):
    logger = getUserLogger(objContext.intUserId)
    try:

        insQuotationService = ClsQuotationService(objContext.objPool, objContext.intUserId)
        return await insQuotationService.fnGetSingleQuotationDetails(mdlGetQuotationRequest.intQuotationId)
    except asyncpg.PostgresError as e:
        logger.error(f"Database error getting quotation {mdlGetQuotationRequest.intQuotationId}: {str(e)}")
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error getting quotation {mdlGetQuotationRequest.intQuotationId}: {str(e)}", exc_info=True)
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
        )


@router.post("/add", response_model=MdlQuotationResponse)
async def fnAddQuotation(
    mdlCreateQuotationRequest: MdlCreateQuotationRequest,
    objContext = Depends(fnRequireModule("quotation"))
):
    logger = getUserLogger(objContext.intUserId)
    try:
        # Check quotation create limit
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "quotation", "create")

        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, objContext.intUserId)
        objResponse = await insQuotationService.fnAddQuotationService(mdlCreateQuotationRequest)

        # Increment usage after successful creation
        if objResponse.intStatus == ResponseStatus.SUCCESS:
            await fnIncrementModuleUsage(objContext.objPool, objContext.intUserId, "quotation", "create")

        return objResponse

    except asyncpg.PostgresError as e:
        logger.error(f"Database error creating quotation: {str(e)}")
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        logger.error(f"Error creating quotation: {str(e)}", exc_info=True)
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            data=None
        )


@router.post("/update", response_model=MdlQuotationResponse)
async def fnUpdateQuotation(
    mdlUpdateQuotationRequest: MdlUpdateQuotationRequest,
    objContext = Depends(fnRequireModule("quotation")),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        # Check quotation update permission
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "quotation", "update")

        insQuotationService = ClsQuotationService(objContext.objPool, objContext.intUserId)
        return await insQuotationService.fnUpdateQuotationService(mdlUpdateQuotationRequest)

    except asyncpg.PostgresError as e:
        logger.error(f"Database error updating quotation {mdlUpdateQuotationRequest.intPkQuotationId}: {str(e)}")
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        logger.error(f"Error updating quotation {mdlUpdateQuotationRequest.intPkQuotationId}: {str(e)}", exc_info=True)
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            data=None
        )


@router.post("/update-warranty", response_model=MdlQuotationResponse)
async def fnUpdateWarranty(
    mdlUpdateWarrantyRequest: MdlUpdateWarrantyRequest,
    objContext = Depends(fnRequireModule("quotation")),
):
    logger = getUserLogger(objContext.intUserId)
    try:
        # Check warranty feature permission
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "warranty", "update")

        insQuotationService = ClsQuotationService(objContext.objPool, objContext.intUserId)
        return await insQuotationService.fnUpdateWarrantyService(mdlUpdateWarrantyRequest)
    except asyncpg.PostgresError as e:
        logger.error(f"Database error updating warranty {mdlUpdateWarrantyRequest.intPkQuotationId}: {str(e)}")
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        logger.error(f"Error updating warranty {mdlUpdateWarrantyRequest.intPkQuotationId}: {str(e)}", exc_info=True)
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            data=None
        )


@router.post("/delete", response_model=MdlDeleteQuotationResponse)
async def fnDeleteQuotation(
    mdlDeleteQuotationRequest: MdlDeleteQuotationRequest,
    objContext = Depends(fnRequireModule("quotation"))
):
    logger = getUserLogger(objContext.intUserId)
    try:
        # Check quotation delete permission
        await fnCheckModuleOperation(objContext.objPool, objContext.intUserId, "quotation", "delete")

        insQuotationService = ClsQuotationService(objContext.objPool, objContext.intUserId)
        return await insQuotationService.fnDeleteQuotationService(mdlDeleteQuotationRequest.intQuotationId)

    except asyncpg.PostgresError as e:
        logger.error(f"Database error deleting quotation {mdlDeleteQuotationRequest.intQuotationId}: {str(e)}")
        return MdlDeleteQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            intDeletedId=None
        )
    except Exception as e:
        logger.error(f"Error deleting quotation {mdlDeleteQuotationRequest.intQuotationId}: {str(e)}", exc_info=True)
        return MdlDeleteQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            intDeletedId=None
        )
