from pydantic import BaseModel, EmailStr
from typing import Optional, List

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
