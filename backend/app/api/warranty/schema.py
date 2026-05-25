from pydantic import BaseModel
from typing import Optional, List
from datetime import date

from app.core.baseSchema import MdlBaseResponse


class MdlWarrantyReportItem(BaseModel):
    """
    One row in the Warranty Report — flat view of warranty-bearing items
    across all the user's quotations.

    RETURNED BY: POST /warranty/list

    strStatus values:
      - "active"         : expiry date is more than 30 days away
      - "expiring_soon"  : expiry date within next 30 days (inclusive)
      - "expired"        : expiry date has passed
      - "unset"          : warranty period set but implementation/expiry date missing
    """
    intPkQuotationItemId: int
    intPkQuotationId: int
    strQuotationNumber: str
    datQuotationDate: date
    strCustomerName: str
    strCustomerPhone: Optional[str] = None
    strItemName: str
    strItemCode: Optional[str] = None
    dblQuantity: float
    intWarrantyYears: int = 0
    intWarrantyMonths: int = 0
    intWarrantyDays: int = 0
    datImplementationDate: Optional[date] = None
    datExpiryDate: Optional[date] = None
    intDaysRemaining: Optional[int] = None  # negative = expired
    strStatus: str


class MdlWarrantyReportResponse(MdlBaseResponse):
    """RESPONSE: List of all warranty-bearing items for the user."""
    lstWarranty: List[MdlWarrantyReportItem] = []
