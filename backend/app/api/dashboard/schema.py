from pydantic import BaseModel
from typing import Optional

from app.core.baseSchema import MdlBaseResponse


class MdlDashboardSummary(BaseModel):
    """Dashboard summary data"""
    dblTotalCollected: float = 0.0
    dblTodayEarnings: float = 0.0
    intTotalInvoices: int = 0
    intPaidInvoices: int = 0
    intPendingInvoices: int = 0
    intTotalQuotations: int = 0
    intTodayInvoices: int = 0


class MdlDashboardResponse(MdlBaseResponse):
    """Response with dashboard summary"""
    data: Optional[MdlDashboardSummary] = None
