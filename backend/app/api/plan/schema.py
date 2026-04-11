from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# =====================================================
# MODULE PERMISSION MODEL (per module per plan)
# =====================================================

class MdlPlanModule(BaseModel):
    """Module permissions + limits for a plan"""
    intModuleId: int
    strModuleKey: str = ""
    strDisplayName: str = ""
    strIcon: str = ""
    intCreate: int = 0        # 0=blocked, -1=unlimited, >0=limit
    intRead: int = -1
    intUpdate: int = 0
    intDelete: int = 0
    intPrint: int = 0
    intMonthlyLimit: int = -1
    intDailyLimit: int = -1


# =====================================================
# REQUEST MODELS
# =====================================================

class MdlCreatePlanRequest(MdlBaseRequest):
    """Create new subscription plan (Admin only)"""
    strPlanName: str
    strDisplayName: str
    dblPriceMonthly: float = 0.00
    dblPriceYearly: float = 0.00
    blnActive: bool = True
    lstModules: List[MdlPlanModule] = []
    # Legacy fields (kept for backward compat during transition)
    intMaxQuotationsPerMonth: Optional[int] = -1
    intMaxUsers: Optional[int] = 1
    blnAiEnabled: Optional[bool] = True
    intAiCallsPerDay: Optional[int] = -1


class MdlUpdatePlanRequest(MdlBaseRequest):
    """Update subscription plan (Admin only)"""
    intPlanId: int
    strDisplayName: Optional[str] = None
    dblPriceMonthly: Optional[float] = None
    dblPriceYearly: Optional[float] = None
    blnActive: Optional[bool] = None
    lstModules: Optional[List[MdlPlanModule]] = None
    # Legacy fields
    intMaxQuotationsPerMonth: Optional[int] = None
    intMaxUsers: Optional[int] = None
    blnAiEnabled: Optional[bool] = None


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
    dblPriceMonthly: float
    dblPriceYearly: float
    blnActive: bool
    intSubscriberCount: int = 0
    lstModules: List[MdlPlanModule] = []
    # Legacy fields (kept for backward compat)
    intMaxQuotationsPerMonth: int = -1
    intMaxUsers: int = 1
    blnAiEnabled: bool = True
    intAiCallsPerDay: int = -1


class MdlPlanListResponse(MdlBaseResponse):
    """List of all plans"""
    lstPlans: List[MdlPlanInfo] = []


class MdlPlanResponse(MdlBaseResponse):
    """Single plan response"""
    data: Optional[MdlPlanInfo] = None
