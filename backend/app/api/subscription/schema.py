from pydantic import BaseModel
from typing import Optional
from datetime import date


class MdlCreateOrderRequest(BaseModel):
    intPlanId: int


class MdlCreateOrderResponse(BaseModel):
    strOrderId: str
    dblAmount: float                       # Effective amount charged (offer or regular)
    dblOriginalAmount: Optional[float] = None  # Regular price (for strikethrough UI if offer applied)
    strOfferLabel: Optional[str] = None    # Offer name if offer was applied
    strCurrency: str
    strKeyId: str
    strPlanName: str


class MdlVerifyPaymentRequest(BaseModel):
    strRazorpayPaymentId: str
    strRazorpayOrderId: str
    strRazorpaySignature: str
    intPlanId: int


class MdlSubscriptionStatus(BaseModel):
    """Current plan info for a user (stored on tbl_user after B2B refactor)."""
    intPlanId: Optional[int] = None
    strPlanName: Optional[str] = None
    strDisplayName: Optional[str] = None
    strStatus: str  # trial, active, expired, canceled, paused, past_due
    datStartDate: Optional[date] = None
    datEndDate: Optional[date] = None
    datCurrentPeriodStart: Optional[date] = None
    datCurrentPeriodEnd: Optional[date] = None
    intDaysRemaining: int = 0
    blnCancelAtPeriodEnd: bool = False


# =====================================================
# ADMIN: Manage user subscriptions
# =====================================================

class MdlAdminActivateRequest(BaseModel):
    """Admin activate/extend a user's subscription"""
    intTargetUserId: int
    intPlanId: int
    intDays: int = 365  # default 1 year


class MdlAdminSuspendRequest(BaseModel):
    """Admin suspend a user's subscription"""
    intTargetUserId: int


class MdlAdminRecordPaymentRequest(BaseModel):
    """Admin record a manual payment"""
    intTargetUserId: int
    intPlanId: int
    dblAmount: float
    strPaymentMethod: str = "upi"  # upi, bank_transfer, cash
    strReference: str = ""  # UPI ref / transaction ID
    strNotes: str = ""
    intDays: int = 365


class MdlAdminUserSubscription(BaseModel):
    """User subscription info for admin list"""
    intUserId: int
    strEmail: str
    strUsername: str
    strBusinessName: Optional[str] = None
    strStatus: Optional[str] = None
    strPlanName: Optional[str] = None
    datStartDate: Optional[date] = None
    datEndDate: Optional[date] = None
    intDaysRemaining: Optional[int] = None
