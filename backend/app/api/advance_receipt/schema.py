from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# =====================================================
# REQUEST MODELS
# =====================================================

class MdlCreateAdvanceReceiptRequest(MdlBaseRequest):
    """Create a new advance/partial-payment receipt against a quotation."""
    intQuotationId: int
    datReceiptDate: Optional[date] = None
    strReceivedFrom: Optional[str] = None       # defaults to quotation's customer name
    dblAmountPaid: float
    strPaymentFor: Optional[str] = None
    strPaymentMode: Optional[str] = "cash"      # cash|cheque|upi|account|other
    strReceivedBy: Optional[str] = None


class MdlUpdateAdvanceReceiptRequest(MdlBaseRequest):
    """Edit an existing (still-issued) receipt."""
    intReceiptId: int
    datReceiptDate: Optional[date] = None
    strReceivedFrom: Optional[str] = None
    dblAmountPaid: Optional[float] = None
    strPaymentFor: Optional[str] = None
    strPaymentMode: Optional[str] = None
    strReceivedBy: Optional[str] = None


class MdlGetAdvanceReceiptRequest(MdlBaseRequest):
    intReceiptId: int


class MdlByQuotationRequest(MdlBaseRequest):
    intQuotationId: int


class MdlVoidAdvanceReceiptRequest(MdlBaseRequest):
    intReceiptId: int


# =====================================================
# RESPONSE MODELS
# =====================================================

class MdlAdvanceReceipt(BaseModel):
    intPkReceiptId: int
    intQuotationId: int
    strQuotationNumber: Optional[str] = None
    strReceiptNumber: str
    datReceiptDate: date
    strReceivedFrom: str
    dblAmountPaid: float
    strPaymentFor: Optional[str] = None
    strPaymentMode: str
    strReceivedBy: Optional[str] = None
    dblAmountDueSnapshot: Optional[float] = None
    dblBalanceSnapshot: Optional[float] = None
    strStatus: str


class MdlAdvanceReceiptResponse(MdlBaseResponse):
    data: Optional[MdlAdvanceReceipt] = None


class MdlAdvanceReceiptListResponse(MdlBaseResponse):
    lstReceipts: List[MdlAdvanceReceipt] = []
    dblQuotationTotal: Optional[float] = None
    dblTotalReceived: Optional[float] = None
    dblBalanceDue: Optional[float] = None
