from typing import List, Optional

from pydantic import BaseModel, field_validator


class MdlProfileRequest(BaseModel):
    businessName: str
    phone: Optional[str] = None

    @field_validator("businessName")
    @classmethod
    def validate_business_name(cls, v):
        v = (v or "").strip()
        if not v:
            raise ValueError("Business name is required")
        return v[:200]

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = (v or "").strip()
        return v[:20] or None


class MdlFinishRequest(BaseModel):
    """Optional body of POST /onboarding/finish. Existing callers send none."""
    blnSkipSample: bool = False   # website editor flow: the user already has a real quotation


class MdlTradeRequest(BaseModel):
    strTrade: str


class MdlTradeInfo(BaseModel):
    strKey: str
    strLabel: str


class MdlChecklist(BaseModel):
    blnAccount: bool = True
    blnFirstQuotation: bool = False
    blnLogo: bool = False
    blnPdfDownloaded: bool = False


class MdlOnboardingState(BaseModel):
    blnNeedsOnboarding: bool
    blnShowChecklist: bool                # self-serve user who has not ticked everything yet
    strUserName: str = ""
    strBusinessName: str = ""
    strPhone: str = ""
    strTrade: str = ""
    intSampleQuotationId: Optional[int] = None
    dctChecklist: MdlChecklist
    lstTrades: List[MdlTradeInfo]
