from fastapi import HTTPException, status

ADMIN_USER_ID = 1

# Valid operations that map to tbl_plan_module columns
VALID_OPERATIONS = {"create", "read", "update", "delete", "print"}


async def fnCheckModuleOperation(objPool, intUserId: int, strModuleKey: str, strOperation: str) -> dict:
    """
    Check if the user's plan allows this operation on this module.
    Uses the DB function fn_check_permission() which handles:
    - Plan lookup, module lookup, permission check, quota counting.

    Returns: {"blnAllowed": True, "intLimit": N, "intUsed": N, "intRemaining": N}
    Raises: HTTP 403 if blocked, HTTP 400 if over limit.
    """
    if intUserId == ADMIN_USER_ID:
        return {"blnAllowed": True, "intLimit": -1, "intUsed": 0, "intRemaining": -1}

    if strOperation not in VALID_OPERATIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid operation: {strOperation}"
        )

    async with objPool.acquire() as conn:
        rstPerm = await conn.fetchrow(
            "SELECT * FROM fn_check_permission($1, $2, $3)",
            intUserId, strModuleKey, strOperation
        )

    if not rstPerm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This module is not available in your plan. Please upgrade."
        )

    intPermission = rstPerm['int_permission']
    blnAllowed = rstPerm['bln_is_allowed']
    intUsed = rstPerm['int_quota_used']

    # 0 = blocked (no subscription or no permission)
    if intPermission == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have {strOperation} access for this module. Please upgrade your plan."
        )

    # -1 = unlimited
    if intPermission == -1:
        return {"blnAllowed": True, "intLimit": -1, "intUsed": 0, "intRemaining": -1}

    # Quota-limited: check if over limit
    if not blnAllowed:
        strPeriod = rstPerm['vchr_quota_period'] or "daily"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You've reached your {strPeriod} limit ({intPermission}) for this module. Please upgrade your plan."
        )

    return {
        "blnAllowed": True,
        "intLimit": intPermission,
        "intUsed": intUsed,
        "intRemaining": intPermission - intUsed,
    }


async def fnIncrementModuleUsage(objPool, intUserId: int, strModuleKey: str, strOperation: str = "create",
                                  strResourceType: str = None, strResourceId: str = None, jsonMetadata=None):
    """
    Record a usage event after a successful operation.
    Uses the DB function fn_record_usage().
    """
    if intUserId == ADMIN_USER_ID:
        return

    async with objPool.acquire() as conn:
        await conn.fetchval(
            "SELECT fn_record_usage($1, $2, $3, $4, $5, $6)",
            intUserId, strModuleKey, strOperation,
            strResourceType, strResourceId, jsonMetadata
        )


async def fnGetModuleUsageSummary(objPool, intUserId: int) -> list:
    """
    Get all modules with their permissions + current usage for a user.
    Uses the DB function fn_get_user_permissions().
    """
    async with objPool.acquire() as conn:
        rstModules = await conn.fetch(
            "SELECT * FROM fn_get_user_permissions($1)", intUserId
        )

    lstResult = []
    for row in rstModules:
        intUsed = 0
        intLimit = -1
        strQuotaPeriod = row['quota_period']
        intPerm = row['perm_create']

        # If there's a quota, get the current usage count
        if strQuotaPeriod and intPerm > 0:
            intLimit = intPerm
            async with objPool.acquire() as conn:
                rstCheck = await conn.fetchrow(
                    "SELECT * FROM fn_check_permission($1, $2, 'create')",
                    intUserId, row['module_key']
                )
            if rstCheck:
                intUsed = rstCheck['int_quota_used']

        lstResult.append({
            "strModuleKey": row['module_key'],
            "strDisplayName": row['display_name'],
            "strIcon": row['icon'],
            "intCreate": row['perm_create'],
            "intRead": row['perm_read'],
            "intUpdate": row['perm_update'],
            "intDelete": row['perm_delete'],
            "intPrint": row['perm_print'],
            "strQuotaPeriod": strQuotaPeriod,
            "intUsed": intUsed,
            "intRemaining": -1 if intLimit == -1 else max(intLimit - intUsed, 0),
        })

    return lstResult
