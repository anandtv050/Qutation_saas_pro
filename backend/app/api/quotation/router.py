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

router = APIRouter(prefix="/quotation", tags=["Quotation"])

@router.post("/list", response_model=MdlQuotationListResponse)
async def fnGetQutationList(intUserId:Annotated[int, Depends(fnGetCurrentUser)]):
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
        return await insQuotationService.fnGetAllQuotationList()
    except asyncpg.PostgresError as e:
        return MdlQuotationListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            lstQuotation=[]
        )
    except Exception as e:
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
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
        return await insQuotationService.fnGetSingleQuotationDetails(mdlGetQuotationRequest.intQuotationId)
    except asyncpg.PostgresError as e:
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
        )
    except Exception as e:
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
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
        return await insQuotationService.fnAddQuotationService(mdlCreateQuotationRequest)
        
    except asyncpg.PostgresError as e:
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
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
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
        return await insQuotationService.fnUpdateQuotationService(mdlUpdateQuotationRequest)
        
    except asyncpg.PostgresError as e:
        return MdlQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
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
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insQuotationService = ClsQuotationService(pool, intUserId)
        mdlDeleteQuotationResponse = await insQuotationService.fnDeleteQuotationService(mdlDeleteQuotationRequest.intQuotationId)
        return mdlDeleteQuotationResponse
        
    except asyncpg.PostgresError as e:
        return MdlDeleteQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            intDeletedId=None
        )
    except Exception as e:
        return MdlDeleteQuotationResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            intDeletedId=None
        )


