from fastapi import APIRouter, Depends
from asyncpg import Pool

from app.core.database import ClsDatabasepool
from app.core.security import fnGetAdminUser, fnGetCurrentUser
from app.core.logger import getLogger
from app.api.user.service import ClsUserService
from app.api.user.schema import (
    MdlCreateUserRequest,
    MdlUpdateUserRequest,
    MdlGetUserRequest,
    MdlDeleteUserRequest,
    MdlGetPermissionsRequest,
    MdlAddModuleRequest,
    MdlUpdateModuleRequest,
    MdlDeleteModuleRequest,
    MdlSetModuleOverrideRequest,
    MdlDeleteModuleOverrideRequest,
    MdlListModuleOverridesRequest,
    MdlUpdateSettingsRequest,
    MdlAddSettingRequest,
    MdlDeleteSettingRequest,
    MdlGetUserOverridesRequest,
    MdlSetUserOverrideRequest,
    MdlUserResponse,
    MdlUserListResponse,
    MdlDeleteUserResponse
)

logger = getLogger()

router = APIRouter(prefix="/user", tags=["User Management"])


async def fnGetPool() -> Pool:
    insDb = ClsDatabasepool()
    return await insDb.fnGetPool()


# =====================================================
# USER CRUD
# =====================================================

@router.post("/list", response_model=MdlUserListResponse)
async def fnGetAllUsers(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get all users (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetAllUsers()


@router.post("/get", response_model=MdlUserResponse)
async def fnGetSingleUser(
    mdlRequest: MdlGetUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get single user details (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetSingleUser(mdlRequest.intUserId)


@router.post("/add", response_model=MdlUserResponse)
async def fnAddUser(
    mdlRequest: MdlCreateUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Create new user (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnAddUser(mdlRequest)


@router.post("/update", response_model=MdlUserResponse)
async def fnUpdateUser(
    mdlRequest: MdlUpdateUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetCurrentUser)
):
    """Update user details. Users can update themselves, Admin can update anyone."""
    # User can only update their own profile (unless admin)
    blnIsAdmin = intUserId == 1
    if not blnIsAdmin and mdlRequest.intUserId != intUserId:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile"
        )
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnUpdateUser(mdlRequest)


@router.post("/me", response_model=MdlUserResponse)
async def fnGetMyProfile(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetCurrentUser)
):
    """Get current logged-in user's profile"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetSingleUser(intUserId)


@router.post("/delete", response_model=MdlDeleteUserResponse)
async def fnDeleteUser(
    mdlRequest: MdlDeleteUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Delete user (Admin only). Cannot delete admin user (user_id=1)."""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnDeleteUser(mdlRequest.intUserId)


@router.post("/toggle-active")
async def fnToggleUserActive(
    mdlRequest: MdlGetUserRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Activate or deactivate a user (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    async with insPool.acquire() as conn:
        rstUser = await conn.fetchrow(
            "SELECT bln_is_active FROM tbl_user WHERE pk_bint_user_id = $1",
            mdlRequest.intUserId
        )
    blnNewState = not (rstUser['bln_is_active'] if rstUser else True)
    return await insService.fnToggleUserActive(mdlRequest.intUserId, blnNewState)


# =====================================================
# MODULE CRUD
# =====================================================

@router.post("/module/add")
async def fnAddModule(
    mdlRequest: MdlAddModuleRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Add a new module (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnAddModule(
        mdlRequest.strModuleKey, mdlRequest.strModuleCode,
        mdlRequest.strDisplayName, mdlRequest.strIcon,
        mdlRequest.strPath, mdlRequest.strLabel,
        mdlRequest.blnShowInSidebar, mdlRequest.blnIsAdminOnly,
        mdlRequest.intSortOrder
    )


@router.post("/module/update")
async def fnUpdateModule(
    mdlRequest: MdlUpdateModuleRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Update a module (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnUpdateModule(
        mdlRequest.intModuleId,
        strDisplayName=mdlRequest.strDisplayName,
        strIcon=mdlRequest.strIcon,
        strPath=mdlRequest.strPath,
        strLabel=mdlRequest.strLabel,
        blnShowInSidebar=mdlRequest.blnShowInSidebar,
        blnIsAdminOnly=mdlRequest.blnIsAdminOnly,
        blnActive=mdlRequest.blnActive,
        intSortOrder=mdlRequest.intSortOrder,
    )


@router.post("/module/delete")
async def fnDeleteModule(
    mdlRequest: MdlDeleteModuleRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Delete a module (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnDeleteModule(mdlRequest.intModuleId)


# =====================================================
# MODULE PERMISSIONS
# =====================================================

@router.post("/permissions/get")
async def fnGetUserPermissions(
    mdlRequest: MdlGetPermissionsRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get module permissions for a user (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetUserPermissions(mdlRequest.intTargetUserId)


@router.get("/my-permissions")
async def fnGetMyPermissions(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetCurrentUser)
):
    """Get current user's allowed modules (for frontend sidebar)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetCurrentUserPermissions(intUserId)


# =====================================================
# PERMISSION GRID
# =====================================================

@router.get("/permissions/grid")
async def fnGetPermissionGrid(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get full users x modules permission grid (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetPermissionGrid()


# =====================================================
# MODULE PERMISSION OVERRIDES (per-user grant/revoke)
# =====================================================

@router.post("/override/set")
async def fnSetUserModuleOverride(
    mdlRequest: MdlSetModuleOverrideRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: grant or revoke module access for a specific user (overrides plan)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnSetUserModuleOverride(mdlRequest)


@router.post("/override/delete")
async def fnDeleteUserModuleOverride(
    mdlRequest: MdlDeleteModuleOverrideRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: remove a per-user module permission override (revert to plan default)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnDeleteUserModuleOverride(
        mdlRequest.intTargetUserId, mdlRequest.intModuleId
    )


@router.post("/override/list")
async def fnListUserModuleOverrides(
    mdlRequest: MdlListModuleOverridesRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Admin: list all active (non-expired) module overrides for a user"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnListUserModuleOverrides(mdlRequest.intTargetUserId)


# =====================================================
# SETTINGS
# =====================================================

@router.get("/settings/all")
async def fnGetAllSettings(
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get all module settings (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetAllModulesWithSettings()


@router.post("/settings/update")
async def fnUpdateSettings(
    mdlRequest: MdlUpdateSettingsRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Update settings for a module (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnUpdateSettings(
        mdlRequest.strModule,
        mdlRequest.lstSettings
    )


@router.post("/settings/add")
async def fnAddSetting(
    mdlRequest: MdlAddSettingRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Add new setting (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnAddSetting(
        mdlRequest.strModule, mdlRequest.strKey, mdlRequest.strValue,
        mdlRequest.strType, mdlRequest.strLabel, mdlRequest.strDescription
    )


@router.post("/settings/delete")
async def fnDeleteSetting(
    mdlRequest: MdlDeleteSettingRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Delete a setting (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnDeleteSetting(mdlRequest.strModule, mdlRequest.strKey)


@router.post("/settings/user-overrides")
async def fnGetUserOverrides(
    mdlRequest: MdlGetUserOverridesRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Get all settings with user overrides (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnGetUserSettingOverrides(mdlRequest.intTargetUserId)


@router.post("/settings/user-override")
async def fnSetUserOverride(
    mdlRequest: MdlSetUserOverrideRequest,
    insPool: Pool = Depends(fnGetPool),
    intUserId: int = Depends(fnGetAdminUser)
):
    """Set or clear a user setting override (Admin only)"""
    insService = ClsUserService(insPool, intUserId)
    return await insService.fnSetUserSettingOverride(
        mdlRequest.intTargetUserId,
        mdlRequest.strKey,
        mdlRequest.strValue
    )
