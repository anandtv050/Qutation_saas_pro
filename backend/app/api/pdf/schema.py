from pydantic import BaseModel
from typing import List, Optional


class MdlPDFItem(BaseModel):
    strItemName: str
    dblQuantity: float
    dblUnitPrice: float


class MdlQuotationPDFRequest(BaseModel):
    intQuotationId: Optional[int] = None
    strCustomerName: Optional[str] = None
    strCustomerPhone: Optional[str] = None
    strCustomerAddress: Optional[str] = None
    strQuotationDate: Optional[str] = None
    strQuotationNumber: Optional[str] = None
    lstItems: Optional[List[MdlPDFItem]] = None
    blnIncludeInfoPage: bool = True


class MdlInvoicePDFRequest(BaseModel):
    intInvoiceId: Optional[int] = None
    strCustomerName: Optional[str] = None
    strCustomerPhone: Optional[str] = None
    strCustomerAddress: Optional[str] = None
    strInvoiceDate: Optional[str] = None
    strInvoiceNumber: Optional[str] = None
    strDueDate: Optional[str] = None
    lstItems: Optional[List[MdlPDFItem]] = None
    blnIncludeInfoPage: bool = False
