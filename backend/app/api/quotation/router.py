from typing import Annotated
from fastapi import APIRouter, Depends
import asyncpg

from app.api.quotation.schema import (
    MdlCreateQuotationRequest,
    MdlUpdateQuotationRequest,
    MdlGetQuotationRequest,
    MdlDeleteQuotationRequest,
    MdlQuotationResponse,
    MdlQuotationListResponse,
    MdlDeleteQuotationResponse
)
from app.api.quotation.service import ClsQuotationService
from app.core.database import ClsDatabasepool
from app.core.baseSchema import ResponseStatus
from app.core.security import fnGetCurrentUser
from app.core.logger import getUserLogger

router = APIRouter(prefix="/quotation", tags=["Quotation"])


@router.post("/list", response_model=MdlQuotationListResponse)
async def fnGetQutationList(intUserId: Annotated[int, Depends(fnGetCurrentUser)]):
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
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
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlGetQuotationRequest: MdlGetQuotationRequest
):
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
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
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlCreateQuotationRequest: MdlCreateQuotationRequest
):
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
        return await insQuotationService.fnAddQuotationService(mdlCreateQuotationRequest)

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
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlUpdateQuotationRequest: MdlUpdateQuotationRequest
):
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
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


@router.post("/delete", response_model=MdlDeleteQuotationResponse)
async def fnDeleteQuotation(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlDeleteQuotationRequest: MdlDeleteQuotationRequest
):
    logger = getUserLogger(intUserId)
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
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
