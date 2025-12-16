from typing import Annotated
from fastapi import APIRouter, Depends
import asyncpg

from app.api.inventory.schema import (
    MdlCreateInventoryRequest,
    MdlUpdateInventoryRequest,
    MdlInventoryListResponse,
    MdlInventoryResponse,
    MdlDeleteInventoryRequest,
    MdlDeleteInventoryResponse
)
from app.api.inventory.service import ClsInventoryService
from app.core.database import ClsDatabasepool
from app.core.baseSchema import ResponseStatus
from app.core.security import fnGetCurrentUser

router = APIRouter(prefix="/inventory", tags=["Inventory"])


# List - Get all inventory
@router.post("/list", response_model=MdlInventoryListResponse)
async def fnGetInventoryList(intUserId: Annotated[int, Depends(fnGetCurrentUser)]):
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insInventoryService = ClsInventoryService(pool, intUserId)
        return await insInventoryService.fnGetInventoryListService()

    except asyncpg.PostgresError as e:
        return MdlInventoryListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            lstItem=[]
        )
    except Exception as e:
        return MdlInventoryListResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            lstItem=[]
        )


# Add - Create new inventory
@router.post("/add", response_model=MdlInventoryResponse)
async def fnAddInventory(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlCreateInventoryRequest: MdlCreateInventoryRequest
):
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insInventoryService = ClsInventoryService(pool, intUserId)
        return await insInventoryService.fnAddInventoryService(mdlCreateInventoryRequest)

    except asyncpg.PostgresError as e:
        return MdlInventoryResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        return MdlInventoryResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            data=None
        )


# Update - Update Inventory
@router.post("/update", response_model=MdlInventoryResponse)
async def fnUpdateInventory(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlUpdateInventoryRequest: MdlUpdateInventoryRequest
):
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insInventoryService = ClsInventoryService(pool, intUserId)
        return await insInventoryService.fnUpdateInventoryService(mdlUpdateInventoryRequest)

    except asyncpg.PostgresError as e:
        return MdlInventoryResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            data=None
        )
    except Exception as e:
        return MdlInventoryResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            data=None
        )


# Delete - Delete inventory
@router.post("/delete", response_model=MdlDeleteInventoryResponse)
async def fnDeleteInventory(
    intUserId: Annotated[int, Depends(fnGetCurrentUser)],
    mdlDeleteInventoryRequest: MdlDeleteInventoryRequest
):
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()

        insInventoryService = ClsInventoryService(pool, intUserId)
        return await insInventoryService.fnDeleteInventory(
            mdlDeleteInventoryRequest.intInventoryId
        )

    except asyncpg.PostgresError as e:
        return MdlDeleteInventoryResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Database error: {str(e)}",
            intDeletedId=None
        )
    except Exception as e:
        return MdlDeleteInventoryResponse(
            intStatus=ResponseStatus.ERROR,
            strStatus=ResponseStatus.ERROR_STR,
            intStatusCode=ResponseStatus.HTTP_INTERNAL_ERROR,
            strMessage=f"Unexpected error: {str(e)}",
            intDeletedId=None
        )
