from fastapi import APIRouter,HTTPException, status
import asyncpg

from app.api.inventory.schema import (
    MdlCreateInventoryRequest,
    MdlUpdateInventoryRequest,
    MdlInventoryListResponse,
    MdlGetInventoryListRequest
)
from app.api.inventory.service import ClsInventoryService
from app.core.database import ClsDatabasepool

router = APIRouter(prefix="/inventory",tags=["Inventory"])

#List - Get all inventory
@router.post("/getinventorylist",response_model=MdlInventoryListResponse)
async def fnGetInventoryList(mdlGetInventoryList:MdlGetInventoryListRequest):
    try:
        insPool = ClsDatabasepool()
        pool = await insPool.fnGetPool()
        
        insInventoryService = ClsInventoryService(pool)
        mdlInventoryListResponse = await insInventoryService.fnGetInventoryListService(mdlGetInventoryList)
        return mdlInventoryListResponse
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected Error"
        )
    except asyncpg.PostgresError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
# # Add - Create new inventory
# @router.post("/add",response_model=MdlInventoryResponse)
# async def fnAddInventory(mdlCreateInventoryRequest:MdlCreateInventoryRequest):
#     try:
#         insPool = ClsDatabasepool()
#         pool = await insPool.fnGetPool()
        
#         insInventoryService = ClsInventoryService(pool)
#         mdlInventoryResponse = await insInventoryService.fnAddInventoryService(mdlCreateInventoryRequest)
#         return mdlInventoryResponse
#     except HTTPException:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Unexpected Error"
#         )
#     except asyncpg.PostgresError as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Database error: {str(e)}"
#         )

# Update - update Inventory
# @router.post("")