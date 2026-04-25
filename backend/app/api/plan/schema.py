from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# =====================================================
# MODULE PERMISSION MODEL (per module per plan)
# =====================================================

class MdlPlanModule(BaseModel):
    """Module permissions + quota for a plan"""
    intModuleId: int
    strModuleKey: str = ""
    strDisplayName: str = ""
    strIcon: str = ""
    intCreate: int = 0        # 0=blocked, -1=unlimited, >0=limit
    intRead: int = 0
    intUpdate: int = 0
    intDelete: int = 0
    intPrint: int = 0
    strQuotaPeriod: Optional[str] = None  # 'daily', 'monthly', 'total', or None


# =====================================================
# REQUEST MODELS
# =====================================================

class MdlCreatePlanRequest(MdlBaseRequest):
    """Create new subscription plan (Admin only)"""
    strPlanName: str
    strDisplayName: str
    strDescription: Optional[str] = None
    dblPriceMonthly: float = 0.00
    dblPriceYearly: float = 0.00
    strCurrency: str = "INR"
    strOfferLabel: Optional[str] = None
    dblOfferPriceMonthly: Optional[float] = None
    dblOfferPriceYearly: Optional[float] = None
    blnOfferActive: bool = False
    datOfferValidUntil: Optional[date] = None
    intTrialDays: int = 0
    intGracePeriodDays: int = 0
    jsonbFeaturesDisplay: Optional[list] = []
    intSortOrder: int = 0
    blnIsPublic: bool = True
    blnActive: bool = True
    lstModules: List[MdlPlanModule] = []


class MdlUpdatePlanRequest(MdlBaseRequest):
    """Update subscription plan (Admin only)"""
    intPlanId: int
    strDisplayName: Optional[str] = None
    strDescription: Optional[str] = None
    dblPriceMonthly: Optional[float] = None
    dblPriceYearly: Optional[float] = None
    strCurrency: Optional[str] = None
    strOfferLabel: Optional[str] = None
    dblOfferPriceMonthly: Optional[float] = None
    dblOfferPriceYearly: Optional[float] = None
    blnOfferActive: Optional[bool] = None
    datOfferValidUntil: Optional[date] = None
    intTrialDays: Optional[int] = None
    intGracePeriodDays: Optional[int] = None
    jsonbFeaturesDisplay: Optional[list] = None
    intSortOrder: Optional[int] = None
    blnIsPublic: Optional[bool] = None
    blnActive: Optional[bool] = None
    lstModules: Optional[List[MdlPlanModule]] = None


class MdlDeletePlanRequest(MdlBaseRequest):
    """Delete subscription plan (Admin only)"""
    intPlanId: int


# =====================================================
# RESPONSE MODELS
# =====================================================

class MdlPlanInfo(BaseModel):
    """Single plan info"""
    intPlanId: int
    strPlanName: str
    strDisplayName: str
    strDescription: Optional[str] = None
    dblPriceMonthly: float
    dblPriceYearly: float
    strCurrency: str = "INR"
    strOfferLabel: Optional[str] = None
    dblOfferPriceMonthly: Optional[float] = None
    dblOfferPriceYearly: Optional[float] = None
    blnOfferActive: bool = False
    datOfferValidUntil: Optional[date] = None
    intTrialDays: int = 0
    intGracePeriodDays: int = 0
    jsonbFeaturesDisplay: Optional[list] = []
    intSortOrder: int = 0
    blnIsPublic: bool = True
    blnActive: bool
    intSubscriberCount: int = 0
    lstModules: List[MdlPlanModule] = []


class MdlPlanListResponse(MdlBaseResponse):
    """List of all plans"""
    lstPlans: List[MdlPlanInfo] = []


class MdlPlanResponse(MdlBaseResponse):
    """Single plan response"""
    data: Optional[MdlPlanInfo] = None
