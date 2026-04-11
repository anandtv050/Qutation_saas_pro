from datetime import date
from asyncpg import Pool

from app.core.baseSchema import ResponseStatus
from app.core.security import fnHashPassword, ADMIN_USER_ID
from app.core.logger import getLogger
from app.api.user.schema import (
    MdlCreateUserRequest,
    MdlUpdateUserRequest,
    MdlUserResponse,
    MdlUserListResponse,
    MdlDeleteUserResponse,
    MdlUserInfo,
    MdlUserPermissionInfo,
)


class ClsUserService:
    def __init__(self, insPool: Pool, intUserId: int):
        self.insPool = insPool
        self.intUserId = intUserId
        self.logger = getLogger()  # Admin operations use app logger

    async def fnGetAllUsers(self):
        """Get all users (Admin only)"""
        self.logger.info(f"Admin user {self.intUserId} fetching all users")

        strQuery = """
            SELECT
                pk_bint_user_id,
                vchr_email,
                vchr_username,
                vchr_business_name,
                vchr_phone,
                txt_address,
                bln_is_active
            FROM tbl_user
            ORDER BY pk_bint_user_id
        """

        async with self.insPool.acquire() as conn:
            rstUsers = await conn.fetch(strQuery)

        if not rstUsers:
            return MdlUserListResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="No users found",
                lstUsers=[]
            )

        lstUsers = []
        for row in rstUsers:
            mdlUser = MdlUserInfo(
                intPkUserId=row['pk_bint_user_id'],
                strEmail=row['vchr_email'],
                strUsername=row['vchr_username'],
                strBusinessName=row['vchr_business_name'],
                strPhone=row['vchr_phone'],
                strAddress=row['txt_address'],
                blnIsActive=row.get('bln_is_active', True)
            )
            lstUsers.append(mdlUser)

        self.logger.info(f"Found {len(lstUsers)} users")
        return MdlUserListResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage=f"Found {len(lstUsers)} users",
            lstUsers=lstUsers
        )

    async def fnGetSingleUser(self, intUserId: int):
        """Get single user details"""

        strQuery = """
            SELECT
                pk_bint_user_id,
                vchr_email,
                vchr_username,
                vchr_business_name,
                vchr_phone,
                txt_address
            FROM tbl_user
            WHERE pk_bint_user_id = $1
        """

        async with self.insPool.acquire() as conn:
            rstUser = await conn.fetchrow(strQuery, intUserId)

        if not rstUser:
            self.logger.warning(f"User not found: ID={intUserId}")
            return MdlUserResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="User not found",
                data=None
            )

        mdlUser = MdlUserInfo(
            intPkUserId=rstUser['pk_bint_user_id'],
            strEmail=rstUser['vchr_email'],
            strUsername=rstUser['vchr_username'],
            strBusinessName=rstUser['vchr_business_name'],
            strPhone=rstUser['vchr_phone'],
            strAddress=rstUser['txt_address']
        )

        return MdlUserResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="User found",
            data=mdlUser
        )

    async def fnAddUser(self, mdlRequest: MdlCreateUserRequest):
        """Create new user (Admin only)"""
        self.logger.info(f"Creating new user: {mdlRequest.strEmail}")

        # Check if email already exists
        async with self.insPool.acquire() as conn:
            strCheckQuery = """
                SELECT pk_bint_user_id FROM tbl_user WHERE vchr_email = $1
            """
            rstExisting = await conn.fetchrow(strCheckQuery, mdlRequest.strEmail)

            if rstExisting:
                self.logger.warning(f"Email already exists: {mdlRequest.strEmail}")
                return MdlUserResponse(
                    intStatus=ResponseStatus.ERROR,
                    strStatus=ResponseStatus.ERROR_STR,
                    intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                    strMessage=f"Email '{mdlRequest.strEmail}' already exists",
                    data=None
                )

            # Hash password
            strHashedPassword = fnHashPassword(mdlRequest.strPassword)

            # Insert new user
            strInsertQuery = """
                INSERT INTO tbl_user (
                    vchr_email,
                    vchr_password_hash,
                    vchr_username,
                    vchr_business_name,
                    vchr_phone,
                    txt_address
                ) VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING pk_bint_user_id
            """
            rstNew = await conn.fetchrow(
                strInsertQuery,
                mdlRequest.strEmail,
                strHashedPassword,
                mdlRequest.strUsername,
                mdlRequest.strBusinessName,
                mdlRequest.strPhone,
                mdlRequest.strAddress
            )

            intNewUserId = rstNew['pk_bint_user_id']

            # Auto-create 7-day trial subscription
            rstTrialPlan = await conn.fetchrow(
                "SELECT pk_bint_plan_id FROM tbl_subscription_plan WHERE vchr_plan_name = 'free_trial' LIMIT 1"
            )
            if rstTrialPlan:
                await conn.execute(
                    """INSERT INTO tbl_subscription (fk_bint_user_id, fk_bint_plan_id, vchr_status, dat_start_date, dat_end_date)
                       VALUES ($1, $2, 'trial', CURRENT_DATE, CURRENT_DATE + 7)""",
                    intNewUserId, rstTrialPlan['pk_bint_plan_id']
                )

            self.logger.info(f"User created with 7-day trial: ID={intNewUserId} | Email={mdlRequest.strEmail}")

        # Return the created user
        return await self.fnGetSingleUser(intNewUserId)

    async def fnUpdateUser(self, mdlRequest: MdlUpdateUserRequest):
        """Update user details (Admin only)"""
        self.logger.info(f"Updating user: ID={mdlRequest.intUserId}")

        # Build dynamic SET clause — only update fields that are provided
        dctFieldMap = {
            "strUsername": "vchr_username",
            "strBusinessName": "vchr_business_name",
            "strPhone": "vchr_phone",
            "strAddress": "txt_address",
        }

        lstSets = []
        lstParams = []
        intIdx = 1

        for strKey, strCol in dctFieldMap.items():
            strValue = getattr(mdlRequest, strKey, None)
            if strValue is not None:
                lstSets.append(f"{strCol} = ${intIdx}")
                lstParams.append(strValue)
                intIdx += 1

        # Handle password update separately (needs hashing)
        if mdlRequest.strPassword:
            strHashedPassword = fnHashPassword(mdlRequest.strPassword)
            lstSets.append(f"vchr_password_hash = ${intIdx}")
            lstParams.append(strHashedPassword)
            intIdx += 1

        if not lstSets:
            return MdlUserResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                strMessage="No fields to update",
                data=None
            )

        lstParams.append(mdlRequest.intUserId)
        strQuery = f"""
            UPDATE tbl_user
            SET {', '.join(lstSets)}
            WHERE pk_bint_user_id = ${intIdx}
            RETURNING pk_bint_user_id
        """

        async with self.insPool.acquire() as conn:
            rstUpdated = await conn.fetchrow(strQuery, *lstParams)

        if not rstUpdated:
            return MdlUserResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="User not found",
                data=None
            )

        self.logger.info(f"User updated: ID={mdlRequest.intUserId}")
        return await self.fnGetSingleUser(mdlRequest.intUserId)

    async def fnDeleteUser(self, intUserId: int):
        """Soft delete user (Admin only, cannot delete admin) — sets bln_is_active = false"""
        self.logger.info(f"Soft deleting user: ID={intUserId}")

        # Prevent deleting admin user
        if intUserId == ADMIN_USER_ID:
            self.logger.warning(f"Attempted to delete admin user")
            return MdlDeleteUserResponse(
                intStatus=ResponseStatus.ERROR,
                strStatus=ResponseStatus.ERROR_STR,
                intStatusCode=ResponseStatus.HTTP_BAD_REQUEST,
                strMessage="Cannot delete admin user",
                intDeletedId=None
            )

        strQuery = """
            UPDATE tbl_user
            SET bln_is_active = false
            WHERE pk_bint_user_id = $1
            RETURNING pk_bint_user_id
        """

        async with self.insPool.acquire() as conn:
            rstDeleted = await conn.fetchrow(strQuery, intUserId)

        if not rstDeleted:
            self.logger.warning(f"User not found for deletion: ID={intUserId}")
            return MdlDeleteUserResponse(
                intStatus=ResponseStatus.NO_DATA,
                strStatus=ResponseStatus.NO_DATA_STR,
                intStatusCode=ResponseStatus.HTTP_NOT_FOUND,
                strMessage="User not found",
                intDeletedId=None
            )

        self.logger.info(f"User soft deleted (deactivated): ID={intUserId}")
        return MdlDeleteUserResponse(
            intStatus=ResponseStatus.SUCCESS,
            strStatus=ResponseStatus.SUCCESS_STR,
            intStatusCode=ResponseStatus.HTTP_OK,
            strMessage="User deactivated",
            intDeletedId=intUserId
        )

    async def fnToggleUserActive(self, intTargetUserId: int, blnIsActive: bool):
        """Admin: Activate or deactivate a user"""
        if intTargetUserId == ADMIN_USER_ID:
            return {"strMessage": "Cannot deactivate admin user", "blnSuccess": False}

        async with self.insPool.acquire() as conn:
            await conn.execute(
                "UPDATE tbl_user SET bln_is_active = $1 WHERE pk_bint_user_id = $2",
                blnIsActive, intTargetUserId
            )

        strAction = "activated" if blnIsActive else "deactivated"
        self.logger.info(f"User {strAction}: ID={intTargetUserId}")
        return {"strMessage": f"User {strAction}", "blnSuccess": True}

    # =====================================================
    # MODULE PERMISSIONS
    # =====================================================

    async def fnGetUserPermissions(self, intTargetUserId: int):
        """Get all module permissions for a user"""
        async with self.insPool.acquire() as conn:
            # Get all modules with user's permission status
            rstModules = await conn.fetch(
                """SELECT m.pk_bint_module_id, m.vchr_module_key, m.vchr_display_name,
                          m.txt_description, m.vchr_icon, m.int_sort_order,
                          COALESCE(p.bln_enabled, true) AS bln_enabled
                   FROM tbl_module m
                   LEFT JOIN tbl_user_module_permission p
                       ON p.fk_bint_module_id = m.pk_bint_module_id
                       AND p.fk_bint_user_id = $1
                   WHERE m.bln_active = true
                   ORDER BY m.int_sort_order""",
                intTargetUserId
            )

        lstPermissions = [
            MdlUserPermissionInfo(
                intModuleId=row['pk_bint_module_id'],
                strModuleKey=row['vchr_module_key'],
                strDisplayName=row['vchr_display_name'],
                strDescription=row['txt_description'],
                strIcon=row['vchr_icon'],
                blnEnabled=row['bln_enabled'],
            )
            for row in rstModules
        ]

        return {"intUserId": intTargetUserId, "lstPermissions": lstPermissions}

    async def fnSetUserPermissions(self, intTargetUserId: int, lstPermissions: list):
        """Set module permissions for a user (list of {intModuleId, blnEnabled})"""
        async with self.insPool.acquire() as conn:
            for dctPerm in lstPermissions:
                await conn.execute(
                    """INSERT INTO tbl_user_module_permission (fk_bint_user_id, fk_bint_module_id, bln_enabled)
                       VALUES ($1, $2, $3)
                       ON CONFLICT (fk_bint_user_id, fk_bint_module_id)
                       DO UPDATE SET bln_enabled = $3""",
                    intTargetUserId,
                    dctPerm["intModuleId"],
                    dctPerm["blnEnabled"]
                )

        self.logger.info(f"Permissions updated for user {intTargetUserId}: {len(lstPermissions)} modules")
        return {"strMessage": "Permissions updated", "blnSuccess": True}

    # ── Module CRUD ──

    async def fnAddModule(self, strModuleKey: str, strDisplayName: str, strIcon: str = "Package",
                          strPath: str = "", strLabel: str = "", blnShowInSidebar: bool = True,
                          blnIsAdminOnly: bool = False, intSortOrder: int = 50):
        """Admin: Add a new module"""
        async with self.insPool.acquire() as conn:
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_module_id FROM tbl_module WHERE vchr_module_key = $1", strModuleKey
            )
            if rstExisting:
                return {"strMessage": f"Module '{strModuleKey}' already exists", "blnSuccess": False}

            await conn.execute(
                """INSERT INTO tbl_module (vchr_module_key, vchr_display_name, vchr_icon, vchr_path,
                    vchr_label, bln_show_in_sidebar, bln_is_admin_only, int_sort_order)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
                strModuleKey, strDisplayName, strIcon, strPath,
                strLabel or strDisplayName, blnShowInSidebar, blnIsAdminOnly, intSortOrder
            )
        return {"strMessage": "Module added", "blnSuccess": True}

    async def fnUpdateModule(self, intModuleId: int, **kwargs):
        """Admin: Update a module"""
        dctFieldMap = {
            "strDisplayName": "vchr_display_name", "strIcon": "vchr_icon",
            "strPath": "vchr_path", "strLabel": "vchr_label",
            "blnShowInSidebar": "bln_show_in_sidebar", "blnIsAdminOnly": "bln_is_admin_only",
            "blnActive": "bln_active", "intSortOrder": "int_sort_order",
        }
        lstSets, lstParams = [], []
        intIdx = 1
        for strKey, strCol in dctFieldMap.items():
            if strKey in kwargs and kwargs[strKey] is not None:
                lstSets.append(f"{strCol} = ${intIdx}")
                lstParams.append(kwargs[strKey])
                intIdx += 1

        if not lstSets:
            return {"strMessage": "No fields to update", "blnSuccess": False}

        lstParams.append(intModuleId)
        async with self.insPool.acquire() as conn:
            await conn.execute(
                f"UPDATE tbl_module SET {', '.join(lstSets)} WHERE pk_bint_module_id = ${intIdx}",
                *lstParams
            )
        return {"strMessage": "Module updated", "blnSuccess": True}

    async def fnDeleteModule(self, intModuleId: int):
        """Admin: Delete a module and all related permissions/plan references"""
        async with self.insPool.acquire() as conn:
            await conn.execute("DELETE FROM tbl_plan_module WHERE fk_bint_module_id = $1", intModuleId)
            await conn.execute("DELETE FROM tbl_user_module_permission WHERE fk_bint_module_id = $1", intModuleId)
            await conn.execute("DELETE FROM tbl_module WHERE pk_bint_module_id = $1", intModuleId)
        return {"strMessage": "Module deleted", "blnSuccess": True}

    async def fnGetPermissionGrid(self):
        """Get all users × all modules permission grid"""
        async with self.insPool.acquire() as conn:
            # Get all active modules
            rstModules = await conn.fetch(
                "SELECT pk_bint_module_id, vchr_module_key, vchr_display_name, vchr_icon FROM tbl_module WHERE bln_active = true ORDER BY int_sort_order"
            )
            # Get all non-admin users
            rstUsers = await conn.fetch(
                """SELECT pk_bint_user_id, vchr_username, vchr_email, vchr_business_name, bln_is_active
                   FROM tbl_user WHERE pk_bint_user_id != 1 ORDER BY pk_bint_user_id"""
            )
            # Get all permissions
            rstPerms = await conn.fetch(
                "SELECT fk_bint_user_id, fk_bint_module_id, bln_enabled FROM tbl_user_module_permission"
            )

        # Build permission lookup
        dctPerms = {}
        for row in rstPerms:
            dctPerms[(row['fk_bint_user_id'], row['fk_bint_module_id'])] = row['bln_enabled']

        lstModules = [
            {"intModuleId": r['pk_bint_module_id'], "strKey": r['vchr_module_key'],
             "strName": r['vchr_display_name'], "strIcon": r['vchr_icon']}
            for r in rstModules
        ]

        lstUsers = []
        for u in rstUsers:
            dctModules = {}
            for m in rstModules:
                key = (u['pk_bint_user_id'], m['pk_bint_module_id'])
                dctModules[m['vchr_module_key']] = dctPerms.get(key, True)  # default = enabled

            lstUsers.append({
                "intUserId": u['pk_bint_user_id'],
                "strUsername": u['vchr_username'],
                "strEmail": u['vchr_email'],
                "strBusinessName": u['vchr_business_name'],
                "blnIsActive": u['bln_is_active'],
                "dctModules": dctModules,
            })

        return {"lstModules": lstModules, "lstUsers": lstUsers}

    async def fnToggleModulePermission(self, intTargetUserId: int, strModuleKey: str, blnEnabled: bool):
        """Toggle a single module permission for a user"""
        async with self.insPool.acquire() as conn:
            rstModule = await conn.fetchrow(
                "SELECT pk_bint_module_id FROM tbl_module WHERE vchr_module_key = $1",
                strModuleKey
            )
            if not rstModule:
                return {"strMessage": "Module not found", "blnSuccess": False}

            await conn.execute(
                """INSERT INTO tbl_user_module_permission (fk_bint_user_id, fk_bint_module_id, bln_enabled)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (fk_bint_user_id, fk_bint_module_id)
                   DO UPDATE SET bln_enabled = $3""",
                intTargetUserId, rstModule['pk_bint_module_id'], blnEnabled
            )

        return {"strMessage": "Permission updated", "blnSuccess": True}

    # ── Settings ──

    async def fnGetModuleSettings(self, strModule: str):
        """Get settings for a specific module"""
        async with self.insPool.acquire() as conn:
            rstSettings = await conn.fetch(
                """SELECT pk_bint_setting_id, vchr_module, vchr_key, vchr_value,
                          vchr_type, vchr_label, txt_description
                   FROM tbl_settings
                   WHERE vchr_module = $1
                   ORDER BY int_sort_order""",
                strModule
            )

        return {
            "strModule": strModule,
            "lstSettings": [
                {
                    "intSettingId": r['pk_bint_setting_id'],
                    "strKey": r['vchr_key'],
                    "strValue": r['vchr_value'],
                    "strType": r['vchr_type'],
                    "strLabel": r['vchr_label'],
                    "strDescription": r['txt_description'],
                }
                for r in rstSettings
            ]
        }

    async def fnUpdateSettings(self, strModule: str, lstSettings: list):
        """Update settings for a module"""
        async with self.insPool.acquire() as conn:
            for dctSetting in lstSettings:
                await conn.execute(
                    "UPDATE tbl_settings SET vchr_value = $1 WHERE vchr_module = $2 AND vchr_key = $3",
                    str(dctSetting["strValue"]), strModule, dctSetting["strKey"]
                )

        self.logger.info(f"Settings updated for module: {strModule}")
        return {"strMessage": "Settings saved", "blnSuccess": True}

    async def fnAddSetting(self, strModule: str, strKey: str, strValue: str,
                           strType: str = "string", strLabel: str = "", strDescription: str = ""):
        """Add a new system setting"""
        async with self.insPool.acquire() as conn:
            rstExisting = await conn.fetchrow(
                "SELECT pk_bint_setting_id FROM tbl_settings WHERE vchr_module = $1 AND vchr_key = $2",
                strModule, strKey
            )
            if rstExisting:
                return {"strMessage": f"Setting '{strKey}' already exists in {strModule}", "blnSuccess": False}

            await conn.execute(
                """INSERT INTO tbl_settings (vchr_module, vchr_key, vchr_value, vchr_type, vchr_label, txt_description)
                   VALUES ($1, $2, $3, $4, $5, $6)""",
                strModule, strKey, strValue, strType, strLabel or strKey, strDescription
            )

        return {"strMessage": "Setting added", "blnSuccess": True}

    async def fnDeleteSetting(self, strModule: str, strKey: str):
        """Delete a system setting + all user overrides"""
        async with self.insPool.acquire() as conn:
            await conn.execute(
                "DELETE FROM tbl_user_settings WHERE vchr_key = $1",
                strKey
            )
            await conn.execute(
                "DELETE FROM tbl_settings WHERE vchr_module = $1 AND vchr_key = $2",
                strModule, strKey
            )
        return {"strMessage": "Setting deleted", "blnSuccess": True}

    async def fnGetUserSettingOverrides(self, intTargetUserId: int):
        """Get all settings with user overrides for a specific user"""
        async with self.insPool.acquire() as conn:
            rstAll = await conn.fetch(
                """SELECT s.vchr_module, s.vchr_key, s.vchr_value AS str_default,
                          s.vchr_type, s.vchr_label,
                          us.vchr_value AS str_override
                   FROM tbl_settings s
                   LEFT JOIN tbl_user_settings us
                       ON us.vchr_key = s.vchr_key AND us.fk_bint_user_id = $1
                   ORDER BY s.vchr_module, s.int_sort_order""",
                intTargetUserId
            )

        return {
            "intUserId": intTargetUserId,
            "lstSettings": [
                {
                    "strModule": r['vchr_module'],
                    "strKey": r['vchr_key'],
                    "strDefault": r['str_default'],
                    "strOverride": r['str_override'],
                    "strType": r['vchr_type'],
                    "strLabel": r['vchr_label'],
                }
                for r in rstAll
            ]
        }

    async def fnSetUserSettingOverride(self, intTargetUserId: int, strKey: str, strValue: str = None):
        """Set or clear a user setting override. Pass None to clear (use system default)."""
        async with self.insPool.acquire() as conn:
            if strValue is None:
                await conn.execute(
                    "DELETE FROM tbl_user_settings WHERE fk_bint_user_id = $1 AND vchr_key = $2",
                    intTargetUserId, strKey
                )
            else:
                await conn.execute(
                    """INSERT INTO tbl_user_settings (fk_bint_user_id, vchr_key, vchr_value)
                       VALUES ($1, $2, $3)
                       ON CONFLICT (fk_bint_user_id, vchr_key) DO UPDATE SET vchr_value = $3""",
                    intTargetUserId, strKey, strValue
                )
        return {"strMessage": "Override saved", "blnSuccess": True}

    async def fnGetAllModulesWithSettings(self):
        """Get all modules and their settings (for admin page)"""
        async with self.insPool.acquire() as conn:
            rstModules = await conn.fetch(
                "SELECT DISTINCT vchr_module FROM tbl_settings ORDER BY vchr_module"
            )
            rstAll = await conn.fetch(
                "SELECT * FROM tbl_settings ORDER BY vchr_module, int_sort_order"
            )

        dctGrouped = {}
        for r in rstAll:
            mod = r['vchr_module']
            if mod not in dctGrouped:
                dctGrouped[mod] = []
            dctGrouped[mod].append({
                "intSettingId": r['pk_bint_setting_id'],
                "strKey": r['vchr_key'],
                "strValue": r['vchr_value'],
                "strType": r['vchr_type'],
                "strLabel": r['vchr_label'],
                "strDescription": r['txt_description'],
            })

        return {"dctModuleSettings": dctGrouped}

    async def fnGetCurrentUserPermissions(self, intUserId: int):
        """Get current user's allowed modules with full nav info (for frontend sidebar)"""
        blnIsAdmin = intUserId == ADMIN_USER_ID

        async with self.insPool.acquire() as conn:
            if blnIsAdmin:
                rstModules = await conn.fetch(
                    """SELECT vchr_module_key, vchr_display_name, vchr_label, vchr_icon,
                              vchr_path, bln_show_in_sidebar, bln_is_admin_only
                       FROM tbl_module WHERE bln_active = true ORDER BY int_sort_order"""
                )
            else:
                rstModules = await conn.fetch(
                    """SELECT m.vchr_module_key, m.vchr_display_name, m.vchr_label, m.vchr_icon,
                              m.vchr_path, m.bln_show_in_sidebar, m.bln_is_admin_only
                       FROM tbl_module m
                       LEFT JOIN tbl_user_module_permission p
                           ON p.fk_bint_module_id = m.pk_bint_module_id
                           AND p.fk_bint_user_id = $1
                       WHERE m.bln_active = true
                         AND COALESCE(p.bln_enabled, true) = true
                         AND m.bln_is_admin_only = false
                       ORDER BY m.int_sort_order""",
                    intUserId
                )

        return {
            "lstModules": [row['vchr_module_key'] for row in rstModules],
            "lstNav": [
                {
                    "strKey": row['vchr_module_key'],
                    "strLabel": row['vchr_label'] or row['vchr_display_name'],
                    "strIcon": row['vchr_icon'],
                    "strPath": row['vchr_path'],
                    "blnShowInSidebar": row['bln_show_in_sidebar'],
                    "blnAdminOnly": row['bln_is_admin_only'],
                }
                for row in rstModules
            ],
        }

    # =====================================================
    # PLAN USAGE STATS (Admin only)
    # =====================================================

    async def fnGetAllUsersUsageStats(self):
        """Admin: Get all users with their plan, subscription status, and module usage"""
        async with self.insPool.acquire() as conn:
            # Get all users with their plan info
            rstUsers = await conn.fetch(
                """SELECT u.pk_bint_user_id, u.vchr_username, u.vchr_email,
                          u.vchr_business_name, u.bln_is_active,
                          s.vchr_status AS str_sub_status,
                          s.dat_start_date, s.dat_end_date,
                          p.vchr_display_name AS str_plan_name,
                          p.vchr_plan_name AS str_plan_key
                   FROM tbl_user u
                   LEFT JOIN tbl_subscription s ON s.fk_bint_user_id = u.pk_bint_user_id
                       AND s.pk_bint_subscription_id = (
                           SELECT MAX(pk_bint_subscription_id) FROM tbl_subscription WHERE fk_bint_user_id = u.pk_bint_user_id
                       )
                   LEFT JOIN tbl_subscription_plan p ON s.fk_bint_plan_id = p.pk_bint_plan_id
                   WHERE u.pk_bint_user_id != 1
                   ORDER BY u.pk_bint_user_id"""
            )

            # Get module usage totals per user (all time)
            rstUsage = await conn.fetch(
                """SELECT mu.fk_bint_user_id, m.vchr_module_key, m.vchr_display_name,
                          mu.vchr_operation, SUM(mu.int_count) AS int_total
                   FROM tbl_module_usage mu
                   JOIN tbl_module m ON mu.fk_bint_module_id = m.pk_bint_module_id
                   GROUP BY mu.fk_bint_user_id, m.vchr_module_key, m.vchr_display_name, mu.vchr_operation
                   ORDER BY mu.fk_bint_user_id, m.vchr_module_key"""
            )

            # Get today's usage per user (for daily limits)

            rstTodayUsage = await conn.fetch(
                """SELECT mu.fk_bint_user_id, m.vchr_module_key, mu.vchr_operation, mu.int_count
                   FROM tbl_module_usage mu
                   JOIN tbl_module m ON mu.fk_bint_module_id = m.pk_bint_module_id
                   WHERE mu.dat_period_start = $1""",
                date.today()
            )

            # Get plan limits per user
            rstLimits = await conn.fetch(
                """SELECT s.fk_bint_user_id, m.vchr_module_key, m.vchr_display_name,
                          pm.int_create, pm.int_read, pm.int_daily_limit, pm.int_monthly_limit
                   FROM tbl_plan_module pm
                   JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
                   JOIN tbl_subscription s ON pm.fk_bint_plan_id = s.fk_bint_plan_id
                       AND s.pk_bint_subscription_id = (
                           SELECT MAX(pk_bint_subscription_id) FROM tbl_subscription WHERE fk_bint_user_id = s.fk_bint_user_id
                       )
                   WHERE s.fk_bint_user_id != 1"""
            )

        # Build usage lookup: {userId: {moduleKey: {operation: total}}}
        dctUsage = {}
        for row in rstUsage:
            uid = row['fk_bint_user_id']
            mkey = row['vchr_module_key']
            if uid not in dctUsage:
                dctUsage[uid] = {}
            if mkey not in dctUsage[uid]:
                dctUsage[uid][mkey] = {"strDisplayName": row['vchr_display_name']}
            dctUsage[uid][mkey][row['vchr_operation']] = row['int_total']

        # Build today's usage lookup: {userId: {moduleKey: count}}
        dctToday = {}
        for row in rstTodayUsage:
            uid = row['fk_bint_user_id']
            if uid not in dctToday:
                dctToday[uid] = {}
            dctToday[uid][row['vchr_module_key']] = row['int_count']

        # Build limits lookup: {userId: {moduleKey: {limits}}}
        dctLimits = {}
        for row in rstLimits:
            uid = row['fk_bint_user_id']
            if uid not in dctLimits:
                dctLimits[uid] = {}
            dctLimits[uid][row['vchr_module_key']] = {
                "strDisplayName": row['vchr_display_name'],
                "intCreate": row['int_create'],
                "intRead": row['int_read'],
                "intDailyLimit": row['int_daily_limit'],
                "intMonthlyLimit": row['int_monthly_limit'],
            }

        # Build response
        lstUsers = []
        for row in rstUsers:
            uid = row['pk_bint_user_id']
            intDaysRemaining = 0
            if row['dat_end_date']:
    
                intDaysRemaining = max((row['dat_end_date'] - date.today()).days, 0)

            lstModules = []
            userLimits = dctLimits.get(uid, {})
            userUsage = dctUsage.get(uid, {})
            userToday = dctToday.get(uid, {})

            for mkey, limits in userLimits.items():
                modUsage = userUsage.get(mkey, {})
                lstModules.append({
                    "strModuleKey": mkey,
                    "strDisplayName": limits["strDisplayName"],
                    "intTotalCreated": modUsage.get("create", 0),
                    "intTodayUsed": userToday.get(mkey, 0),
                    "intDailyLimit": limits["intDailyLimit"],
                    "intMonthlyLimit": limits["intMonthlyLimit"],
                    "blnBlocked": limits["intCreate"] == 0 and limits["intRead"] == 0,
                })

            lstUsers.append({
                "intUserId": uid,
                "strUsername": row['vchr_username'],
                "strEmail": row['vchr_email'],
                "strBusinessName": row['vchr_business_name'],
                "blnIsActive": row['bln_is_active'],
                "strPlanName": row['str_plan_name'] or "No Plan",
                "strPlanKey": row['str_plan_key'] or "",
                "strSubStatus": row['str_sub_status'] or "none",
                "intDaysRemaining": intDaysRemaining,
                "lstModules": lstModules,
            })

        return {"lstUsers": lstUsers}
