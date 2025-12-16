from pydantic import BaseModel
from typing import Optional

class MdlGetInventoryListRequest(BaseModel):
    intUserId: int

# Create inventory Request 
class MdlCreateInventoryRequest(BaseModel):
    strItemCode: str
    strItemName: str
    strCategory: str
    strUnit: str ="piece"
    dblUnitPrice: float
    intStockQuantity: int
    strDescription: Optional[str] = None

# Update Inventory Request
class MdlUpdateInventoryRequest(BaseModel):
    intPkInventoryId:int
    strItemCode: Optional[str] = None
    strItemName: Optional[str] = None
    strCategory: Optional[str] = None
    strUnit: Optional[str] = None
    dblUnitPrice: Optional[float] = None
    intStockQuantity: Optional[int] = None
    strDescription: Optional[str] = None

# Response model for both create and update
class MdlInventoryResponse(BaseModel):
    intPkInventoryId: int
    strItemCode: str
    strItemName: str
    strCategory: str
    strUnit: str
    dblUnitPrice: float
    intStockQuantity: int
    # strDescription: Optional[str] = None

# response for list inventory 
class MdlInventoryListResponse(BaseModel):
    lstItem: list[MdlInventoryResponse]
    
    