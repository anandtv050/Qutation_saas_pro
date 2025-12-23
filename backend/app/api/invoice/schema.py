from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# =====================================================
# INVOICE ITEM MODELS
# =====================================================

class MdlInvoiceItemRequest(BaseModel):
    """Item when creating invoice - all data from frontend"""
    intInventoryId: Optional[int] = None
    strItemCode: Optional[str] = None
    strItemName: str
    strUnit: Optional[str] = "piece"
    dblQuantity: float
    dblUnitPrice: float
    intSortOrder: Optional[int] = 0


class MdlInvoiceItem(BaseModel):
    """Item in response"""
    intPkInvoiceItemId: int
    intInventoryId: Optional[int] = None
    strItemCode: Optional[str] = None
    strItemName: str
    strUnit: Optional[str] = None
    dblQuantity: float
    dblUnitPrice: float
    dblTotalPrice: float
    intSortOrder: int


# =====================================================
# REQUEST MODELS
# =====================================================

class MdlCreateInvoiceRequest(MdlBaseRequest):
    """
    Create invoice - all data from frontend

    intQuotationId: Optional - link to source quotation (NULL if independent)
    """
    intQuotationId: Optional[int] = None
    strCustomerName: str
    strCustomerPhone: Optional[str] = None
    strCustomerAddress: Optional[str] = None
    datInvoiceDate: Optional[date] = None
    datDueDate: Optional[date] = None
    dblTaxPercent: Optional[float] = 0.00
    dblDiscountAmount: Optional[float] = 0.00
    strNotes: Optional[str] = None
    strPaymentStatus: Optional[str] = "pending"
    lstItems: List[MdlInvoiceItemRequest]


class MdlGetInvoiceRequest(MdlBaseRequest):
    """Get single invoice"""
    intInvoiceId: int


class MdlDeleteInvoiceRequest(MdlBaseRequest):
    """Delete invoice"""
    intInvoiceId: int


# =====================================================
# RESPONSE MODELS
# =====================================================

class MdlInvoice(BaseModel):
    """Full invoice with items"""
    intPkInvoiceId: int
    intQuotationId: Optional[int] = None
    strQuotationNumber: Optional[str] = None
    strInvoiceNumber: str
    datInvoiceDate: date
    strCustomerName: str
    strCustomerPhone: Optional[str] = None
    strCustomerAddress: Optional[str] = None
    dblSubtotal: float
    dblTaxPercent: float
    dblTaxAmount: float
    dblDiscountAmount: float
    dblTotalAmount: float
    strNotes: Optional[str] = None
    strPaymentStatus: str
    datDueDate: Optional[date] = None
    lstItems: List[MdlInvoiceItem] = []


class MdlInvoiceListItem(BaseModel):
    """Invoice summary for list"""
    intPkInvoiceId: int
    intQuotationId: Optional[int] = None
    strQuotationNumber: Optional[str] = None
    strInvoiceNumber: str
    datInvoiceDate: date
    strCustomerName: str
    strCustomerPhone: Optional[str] = None
    dblTotalAmount: float
    strPaymentStatus: str
    intItemCount: int


class MdlInvoiceResponse(MdlBaseResponse):
    """Response with single invoice"""
    data: Optional[MdlInvoice] = None


class MdlInvoiceListResponse(MdlBaseResponse):
    """Response with invoice list"""
    lstInvoice: List[MdlInvoiceListItem] = []


class MdlDeleteInvoiceResponse(MdlBaseResponse):
    """Response after delete"""
    intDeletedId: Optional[int] = None
