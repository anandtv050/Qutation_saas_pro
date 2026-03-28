from pydantic import BaseModel
from typing import Optional, List

from app.core.baseSchema import MdlBaseResponse


# ── User Dashboard (unchanged) ──

class MdlDashboardSummary(BaseModel):
    dblTotalCollected: float = 0.0
    dblTodayEarnings: float = 0.0
    intTotalInvoices: int = 0
    intPaidInvoices: int = 0
    intPendingInvoices: int = 0
    intTotalQuotations: int = 0
    intTodayInvoices: int = 0


class MdlDashboardResponse(MdlBaseResponse):
    data: Optional[MdlDashboardSummary] = None


# ── Admin Request ──

class MdlAdminRequest(BaseModel):
    strPeriod: str = "30d"  # 7d, 30d, 90d, all


# ── Admin Platform Summary ──

class MdlMetric(BaseModel):
    intCurrent: int = 0
    intPrevious: int = 0
    dblChange: float = 0.0  # % change


class MdlRevenueMetric(BaseModel):
    dblCurrent: float = 0.0
    dblPrevious: float = 0.0
    dblChange: float = 0.0


class MdlPlatformSummary(BaseModel):
    objAiCalls: MdlMetric = MdlMetric()
    objQuotations: MdlMetric = MdlMetric()
    objInvoices: MdlMetric = MdlMetric()
    objRevenue: MdlRevenueMetric = MdlRevenueMetric()
    dblAiQuoteRatio: float = 0.0       # % of quotations made via AI
    intActiveUsers: int = 0             # users with activity in period
    intTotalUsers: int = 0
    dblAvgQuotationValue: float = 0.0
    intTotalTokens: int = 0
    # Status breakdowns for charts
    intAiQuotes: int = 0
    intManualQuotes: int = 0
    intQuotationsDraft: int = 0
    intQuotationsSent: int = 0
    intQuotationsAccepted: int = 0
    intQuotationsRejected: int = 0
    intInvoicesPaid: int = 0
    intInvoicesPending: int = 0


# ── Daily Breakdown ──

class MdlDailyActivity(BaseModel):
    datDay: str
    intAiCalls: int = 0
    intQuotations: int = 0
    intInvoices: int = 0
    dblRevenue: float = 0.0
    intTokens: int = 0


# ── Per-User Row ──

class MdlUserRow(BaseModel):
    intUserId: int
    strName: str
    strEmail: str
    intAiCalls: int = 0
    intQuotations: int = 0
    intInvoices: int = 0
    dblRevenue: float = 0.0
    strLastSeen: Optional[str] = None
    strHealth: str = "inactive"   # active, at_risk, inactive
    blnOnline: bool = False


# ── Admin Summary Response ──

class MdlAdminDashboardData(BaseModel):
    strPeriod: str
    objSummary: MdlPlatformSummary = MdlPlatformSummary()
    lstDaily: List[MdlDailyActivity] = []
    lstUsers: List[MdlUserRow] = []


class MdlAdminDashboardResponse(MdlBaseResponse):
    data: Optional[MdlAdminDashboardData] = None


# ── Admin User Detail ──

class MdlUserDetail(BaseModel):
    # Profile
    intUserId: int
    strName: str = ""
    strEmail: str = ""
    strBusinessName: str = ""
    strPhone: str = ""
    datJoined: Optional[str] = None
    blnOnline: bool = False
    strLastSeen: Optional[str] = None

    # Funnel — current period + previous period
    intAiCalls: int = 0
    intAiCallsPrev: int = 0
    intQuotations: int = 0
    intQuotationsPrev: int = 0
    intInvoices: int = 0
    intInvoicesPrev: int = 0
    dblRevenue: float = 0.0
    dblRevenuePrev: float = 0.0

    # Conversion
    dblAiToQuoteRate: float = 0.0
    dblQuoteToInvoiceRate: float = 0.0

    # AI Performance
    intTotalTokens: int = 0
    dblAiCostInr: float = 0.0
    dblAiQuoteRatio: float = 0.0   # % of quotes made via AI

    # Value
    dblAvgQuotationValue: float = 0.0
    dblAvgInvoiceValue: float = 0.0
    intUniqueCustomers: int = 0
    intRepeatCustomers: int = 0
    intInventoryItems: int = 0
    intInventoryCategories: int = 0
    dblAvgItemsPerQuotation: float = 0.0

    # Timing
    dblSignupToFirstAiDays: float = -1       # -1 = never used AI
    dblAvgAiToQuoteHours: float = -1         # -1 = no data
    strLastLogin: Optional[str] = None

    # Feature usage
    intQuotationsWithTax: int = 0
    intQuotationsWithDiscount: int = 0

    # Engagement
    intActiveDays: int = 0
    intDaysOnPlatform: int = 0
    intQuotationsDraft: int = 0
    intQuotationsSent: int = 0
    intQuotationsAccepted: int = 0
    intQuotationsRejected: int = 0
    intInvoicesPaid: int = 0
    intInvoicesPending: int = 0

    # Daily breakdown
    lstDaily: List[MdlDailyActivity] = []


class MdlAdminUserDetailResponse(MdlBaseResponse):
    data: Optional[MdlUserDetail] = None
