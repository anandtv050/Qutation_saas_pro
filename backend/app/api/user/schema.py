from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date

from app.core.baseSchema import MdlBaseRequest, MdlBaseResponse


# =====================================================
# REQUEST MODELS
# =====================================================

class MdlCreateUserRequest(MdlBaseRequest):
    """
    REQUEST: Create new user (Admin only)

    ENDPOINT: POST /user/add

    NOTE: Only admin (user_id=1) can create new users

    EXAMPLE:
    {
        "strEmail": "newuser@example.com",
        "strPassword": "securePassword123",
        "strUsername": "New User",
        "strBusinessName": "User's Business",
        "strPhone": "9876543210",
        "strAddress": "123 Main St"
    }
    """
    strEmail: EmailStr
    strPassword: str
    strUsername: str
    strBusinessName: Optional[str] = None
    strPhone: Optional[str] = None
    strAddress: Optional[str] = None


class MdlGetUserRequest(MdlBaseRequest):
    """
    REQUEST: Get single user details

    ENDPOINT: POST /user/get

    EXAMPLE:
    {
        "intUserId": 2
    }
    """
    intUserId: int


class MdlUpdateUserRequest(MdlBaseRequest):
    """
    REQUEST: Update user details (Admin only)

    ENDPOINT: POST /user/update

    EXAMPLE:
    {
        "intUserId": 2,
        "strUsername": "Updated Name",
        "strBusinessName": "New Business",
        "strPhone": "9876543210",
        "strAddress": "456 New St"
    }
    """
    intUserId: int
    strUsername: Optional[str] = None
    strBusinessName: Optional[str] = None
    strPhone: Optional[str] = None
    strAddress: Optional[str] = None
    strPassword: Optional[str] = None


class MdlDeleteUserRequest(MdlBaseRequest):
    """
    REQUEST: Delete user (Admin only)

    ENDPOINT: POST /user/delete

    NOTE: Cannot delete admin user (user_id=1)

    EXAMPLE:
    {
        "intUserId": 2
    }
    """
    intUserId: int


# =====================================================
# RESPONSE MODELS
# =====================================================

class MdlUserInfo(BaseModel):
    """Single user info for responses"""
    intPkUserId: int
    strEmail: str
    strUsername: str
    strBusinessName: Optional[str] = None
    strPhone: Optional[str] = None
    strAddress: Optional[str] = None
    blnIsActive: bool = True


class MdlUserResponse(MdlBaseResponse):
    """
    RESPONSE: Single user details

    RETURNED BY:
    - POST /user/add    -> After creating
    - POST /user/get    -> When fetching

    SUCCESS EXAMPLE:
    {
        "intStatus": 1,
        "strStatus": "SUCCESS",
        "intStatusCode": 200,
        "strMessage": "User created successfully",
        "data": { ...MdlUserInfo... }
    }
    """
    data: Optional[MdlUserInfo] = None


class MdlUserListResponse(MdlBaseResponse):
    """
    RESPONSE: List of all users (Admin only)

    RETURNED BY:
    - POST /user/list

    SUCCESS EXAMPLE:
    {
        "intStatus": 1,
        "strStatus": "SUCCESS",
        "intStatusCode": 200,
        "strMessage": "Found 3 users",
        "lstUsers": [...]
    }
    """
    lstUsers: List[MdlUserInfo] = []


class MdlUserPermissionInfo(BaseModel):
    """Module permission info (plan-based)"""
    intModuleId: int = 0
    strModuleKey: str
    strDisplayName: str
    strDescription: Optional[str] = None
    strIcon: Optional[str] = None
    intCreate: int = 0
    intRead: int = 0
    intUpdate: int = 0
    intDelete: int = 0
    intPrint: int = 0
    strQuotaPeriod: Optional[str] = None


class MdlGetPermissionsRequest(MdlBaseRequest):
    intTargetUserId: int


# =====================================================
# MODULE CRUD REQUESTS
# =====================================================

class MdlAddModuleRequest(MdlBaseRequest):
    strModuleKey: str
    strModuleCode: str
    strDisplayName: str
    strIcon: str = "Package"
    strPath: str = ""
    strLabel: str = ""
    blnShowInSidebar: bool = True
    blnIsAdminOnly: bool = False
    intSortOrder: int = 50


class MdlUpdateModuleRequest(MdlBaseRequest):
    intModuleId: int
    strDisplayName: Optional[str] = None
    strIcon: Optional[str] = None
    strPath: Optional[str] = None
    strLabel: Optional[str] = None
    blnShowInSidebar: Optional[bool] = None
    blnIsAdminOnly: Optional[bool] = None
    blnActive: Optional[bool] = None
    intSortOrder: Optional[int] = None


class MdlDeleteModuleRequest(MdlBaseRequest):
    intModuleId: int


# =====================================================
# PERMISSION REQUESTS
# =====================================================

# =====================================================
# SETTINGS REQUESTS
# =====================================================

class MdlUpdateSettingsRequest(MdlBaseRequest):
    strModule: str
    lstSettings: list  # [{strKey, strValue}]


class MdlAddSettingRequest(MdlBaseRequest):
    strModule: str
    strKey: str
    strValue: str = ""
    strType: str = "string"
    strLabel: str = ""
    strDescription: str = ""


class MdlDeleteSettingRequest(MdlBaseRequest):
    strModule: str
    strKey: str


class MdlGetUserOverridesRequest(MdlBaseRequest):
    intTargetUserId: int


class MdlSetUserOverrideRequest(MdlBaseRequest):
    intTargetUserId: int
    strKey: str
    strValue: Optional[str] = None  # None = clear override


class MdlDeleteUserResponse(MdlBaseResponse):
    """
    RESPONSE: After deleting user

    RETURNED BY:
    - POST /user/delete

    SUCCESS EXAMPLE:
    {
        "intStatus": 1,
        "strStatus": "SUCCESS",
        "intStatusCode": 200,
        "strMessage": "User deleted",
        "intDeletedId": 2
    }
    """
    intDeletedId: Optional[int] = None


# =====================================================
# MODULE PERMISSION OVERRIDE (Per-user grant/revoke)
# =====================================================

class MdlUserModuleOverride(BaseModel):
    """A single per-user module permission override"""
    intOverrideId: int = 0
    intUserId: int
    intModuleId: int
    strModuleKey: str = ""
    strModuleDisplayName: str = ""
    intCreate: int = 0
    intRead: int = 0
    intUpdate: int = 0
    intDelete: int = 0
    intPrint: int = 0
    strQuotaPeriod: Optional[str] = None
    datExpiresAt: Optional[date] = None
    strReason: Optional[str] = None


class MdlSetModuleOverrideRequest(MdlBaseRequest):
    """Admin: create or update a module permission override for a user"""
    intTargetUserId: int
    intModuleId: int
    intCreate: int = 0
    intRead: int = 0
    intUpdate: int = 0
    intDelete: int = 0
    intPrint: int = 0
    strQuotaPeriod: Optional[str] = None
    datExpiresAt: Optional[date] = None
    strReason: Optional[str] = None


class MdlDeleteModuleOverrideRequest(MdlBaseRequest):
    """Admin: remove a module permission override for a user"""
    intTargetUserId: int
    intModuleId: int


class MdlListModuleOverridesRequest(MdlBaseRequest):
    """Admin: list all active module overrides for a user"""
    intTargetUserId: int
