from pydantic import BaseModel
from typing import Optional

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# Get Inventory List Request
class MdlGetInventoryListRequest(MdlBaseRequest):
    pass  # intUserId comes from MdlBaseRequest


# Create inventory Request
class MdlCreateInventoryRequest(MdlBaseRequest):
    strItemCode: str
    strItemName: str
    strCategory: str
    strUnit: str = "piece"
    dblUnitPrice: float
    intStockQuantity: int
    strDescription: Optional[str] = None


# Update Inventory Request
class MdlUpdateInventoryRequest(MdlBaseRequest):
    intPkInventoryId: int
    strItemCode: Optional[str] = None
    strItemName: Optional[str] = None
    strCategory: Optional[str] = None
    strUnit: Optional[str] = None
    dblUnitPrice: Optional[float] = None
    intStockQuantity: Optional[int] = None
    strDescription: Optional[str] = None


# Delete Inventory Request
class MdlDeleteInventoryRequest(MdlBaseRequest):
    intInventoryId: int


# Inventory Item Data Model
class MdlInventoryItem(BaseModel):
    intPkInventoryId: int
    strItemCode: str
    strItemName: str
    strCategory: str
    strUnit: str
    dblUnitPrice: float
    intStockQuantity: int


# Response for single inventory (create/update)
class MdlInventoryResponse(MdlBaseResponse):
    data: Optional[MdlInventoryItem] = None


# Response for list inventory
class MdlInventoryListResponse(MdlBaseResponse):
    lstItem: list[MdlInventoryItem] = []


# Response for delete
class MdlDeleteInventoryResponse(MdlBaseResponse):
    intDeletedId: Optional[int] = None
