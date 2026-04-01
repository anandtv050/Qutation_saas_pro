from pydantic import BaseModel
from typing import Optional

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# ── Column item inside the JSONB array ──────────────────────────
class MdlColumnConfig(BaseModel):
    key: str
    visible: bool = True
    order: int = 1
    widthPct: int = 10


# ── QR settings (nested in footer) ─────────────────────────────
class MdlQrConfig(BaseModel):
    enabled: bool = False
    link: Optional[str] = None
    label: str = "Scan to Pay"


# ── Save / Update request ──────────────────────────────────────
class MdlGetPrintSettingsRequest(MdlBaseRequest):
    intTargetUserId: Optional[int] = None  # Admin can load settings for any user
    vchModule: str = "QUOTATION"  # QUOTATION | INVOICE | WARRANTY


class MdlSavePrintSettingsRequest(MdlBaseRequest):
    intTargetUserId: Optional[int] = None  # Admin can save settings for any user
    vchModule: str = "QUOTATION"  # QUOTATION | INVOICE | WARRANTY

    # Theme
    vchPrimaryColor: str = "#1f2a67"
    vchAccentColor: str = "#0ea5a4"

    # Header
    vchHeaderTitle: str = "QUOTATION"
    blnShowCompanyName: bool = True
    blnShowPhone: bool = True
    blnShowEmail: bool = True
    blnShowAddress: bool = True
    vchLogoUrl: Optional[str] = None

    intLogoWidth: int = 160
    intLogoHeight: int = 64
    txtHeaderCustomHtml: Optional[str] = None

    # Body
    lstColumns: list[MdlColumnConfig] = []
    blnShowSubtotal: bool = True
    blnShowTax: bool = True
    blnShowDiscount: bool = True
    blnShowGrandTotal: bool = True

    # Footer
    txtTermsText: Optional[str] = None
    txtFooterNote: Optional[str] = None
    blnShowSignature: bool = True
    vchSignatureUrl: Optional[str] = None

    intSignatureWidth: int = 180
    intSignatureHeight: int = 56

    # QR
    blnQrEnabled: bool = False
    vchQrLink: Optional[str] = None
    vchQrLabel: str = "Scan to Pay"
    txtFooterCustomHtml: Optional[str] = None


# ── Data model returned from DB ─────────────────────────────────
class MdlPrintSettingsData(BaseModel):
    intPkPrintModelSettingsId: int
    intFkUserId: int
    vchModule: str

    # Theme
    vchPrimaryColor: str
    vchAccentColor: str

    # Header
    vchHeaderTitle: str
    blnShowCompanyName: bool
    blnShowPhone: bool
    blnShowEmail: bool
    blnShowAddress: bool
    vchLogoUrl: Optional[str] = None

    intLogoWidth: int
    intLogoHeight: int
    txtHeaderCustomHtml: Optional[str] = None

    # Body
    lstColumns: list[MdlColumnConfig] = []
    blnShowSubtotal: bool
    blnShowTax: bool
    blnShowDiscount: bool
    blnShowGrandTotal: bool

    # Footer
    txtTermsText: Optional[str] = None
    txtFooterNote: Optional[str] = None
    blnShowSignature: bool
    vchSignatureUrl: Optional[str] = None

    intSignatureWidth: int
    intSignatureHeight: int

    # QR
    blnQrEnabled: bool
    vchQrLink: Optional[str] = None
    vchQrLabel: str
    txtFooterCustomHtml: Optional[str] = None


# ── Responses ───────────────────────────────────────────────────
class MdlPrintSettingsResponse(MdlBaseResponse):
    data: Optional[MdlPrintSettingsData] = None
