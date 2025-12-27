from fastapi import APIRouter, Depends
from asyncpg import Pool

from app.core.database import ClsDatabasepool
from app.core.security import fnGetAdminUser
from app.core.logger import getLogger
from app.api.user.service import ClsUserService
from app.api.user.schema import (
    MdlCreateUserRequest,
    MdlGetUserRequest,
    MdlDeleteUserRequest,
    MdlUserResponse,
    MdlUserListResponse,
    MdlDeleteUserResponse
)

logger = getLogger()

router = APIRouter(prefix="/user", tags=["User Management"])


async def fnGetPool() -> Pool:
    insDb = ClsDatabasepool()
    return await insDb.fnGetPool()


@router.post("/list", response_model=MdlUserListResponse)
async def fnGetAllUsers(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)  # Admin only
):
    """
    Get all users (Admin only).

    Returns list of all registered users.
    """
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetAllUsers()


@router.post("/get", response_model=MdlUserResponse)
async def fnGetSingleUser(
    mdlRequest: MdlGetUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)  # Admin only
):
    """
    Get single user details (Admin only).

    Example request:
    {
        "intUserId": 2
    }
    """
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetSingleUser(mdlRequest.intUserId)


@router.post("/add", response_model=MdlUserResponse)
async def fnAddUser(
    mdlRequest: MdlCreateUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)  # Admin only
):
    """
    Create new user (Admin only).

    Example request:
    {
        "strEmail": "newuser@example.com",
        "strPassword": "securePassword123",
        "strUsername": "New User",
        "strBusinessName": "User's Business",
        "strPhone": "9876543210"
    }

    Returns the created user details.
    """
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnAddUser(mdlRequest)


@router.post("/delete", response_model=MdlDeleteUserResponse)
async def fnDeleteUser(
    mdlRequest: MdlDeleteUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)  # Admin only
):
    """
    Delete user (Admin only).

    NOTE: Cannot delete admin user (user_id=1).

    Example request:
    {
        "intUserId": 2
    }
    """
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnDeleteUser(mdlRequest.intUserId)
