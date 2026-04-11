from pydantic import BaseModel
from typing import Optional
from datetime import date


class MdlCreateOrderRequest(BaseModel):
    intPlanId: int


class MdlCreateOrderResponse(BaseModel):
    strOrderId: str
    dblAmount: float
    strCurrency: str
    strKeyId: str
    strPlanName: str


class MdlVerifyPaymentRequest(BaseModel):
    strRazorpayPaymentId: str
    strRazorpayOrderId: str
    strRazorpaySignature: str
    intPlanId: int


class MdlSubscriptionStatus(BaseModel):
    intPlanId: int
    strPlanName: str
    strDisplayName: str
    strStatus: str  # trial, active, expired, cancelled
    datStartDate: date
    datEndDate: date
    intDaysRemaining: int
    intMaxQuotationsPerMonth: int
    blnAiEnabled: bool


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
