from pydantic import BaseModel
from typing import Optional, List

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


class MdlCreateServiceRequest(MdlBaseRequest):
    strServiceName: str
    strDisplayName: str
    strDescription: Optional[str] = None
    strAiPrompt: Optional[str] = None
    blnAiReady: bool = False
    blnActive: bool = True
    intSortOrder: int = 0


class MdlUpdateServiceRequest(MdlBaseRequest):
    intServiceId: int
    strDisplayName: Optional[str] = None
    strDescription: Optional[str] = None
    strAiPrompt: Optional[str] = None
    blnAiReady: Optional[bool] = None
    blnActive: Optional[bool] = None
    intSortOrder: Optional[int] = None


class MdlDeleteServiceRequest(MdlBaseRequest):
    intServiceId: int


class MdlServiceInfo(BaseModel):
    intServiceId: int
    strServiceName: str
    strDisplayName: str
    strDescription: Optional[str] = None
    blnAiReady: bool = False
    blnActive: bool = True
    intSortOrder: int = 0
    intUserCount: int = 0
    blnHasPrompt: bool = False


class MdlServiceDetail(MdlServiceInfo):
    """Includes prompt text (admin only)"""
    strAiPrompt: Optional[str] = None


class MdlServiceListResponse(MdlBaseResponse):
    lstServices: List[MdlServiceInfo] = []


class MdlServiceDetailResponse(MdlBaseResponse):
    data: Optional[MdlServiceDetail] = None
