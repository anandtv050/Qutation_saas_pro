from datetime import date
from fastapi import HTTPException, status

ADMIN_USER_ID = 1

# Valid operations that map to tbl_plan_module columns
OPERATION_COLUMNS = {
    "create": "int_create",
    "read": "int_read",
    "update": "int_update",
    "delete": "int_delete",
    "print": "int_print",
}


async def fnCheckModuleOperation(objPool, intUserId: int, strModuleKey: str, strOperation: str) -> dict:
    """
    Unified check: does the user's plan allow this operation on this module?

    Checks tbl_plan_module for the user's active subscription plan.
    Also checks usage limits (monthly/daily) for 'create' operations.

    Returns: {"blnAllowed": True, "intLimit": N, "intUsed": N, "intRemaining": N}
    Raises: HTTP 403 if blocked, HTTP 400 if over limit.
    """
    if intUserId == ADMIN_USER_ID:
        return {"blnAllowed": True, "intLimit": -1, "intUsed": 0, "intRemaining": -1}

    strColumn = OPERATION_COLUMNS.get(strOperation)
    if not strColumn:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid operation: {strOperation}"
        )

    async with objPool.acquire() as conn:
        rstPerm = await conn.fetchrow(
            f"""SELECT pm.{strColumn}, pm.int_monthly_limit, pm.int_daily_limit,
                       pm.fk_bint_module_id, m.vchr_display_name
                FROM tbl_plan_module pm
                JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
                JOIN tbl_subscription s ON pm.fk_bint_plan_id = s.fk_bint_plan_id
                WHERE s.fk_bint_user_id = $1
                  AND s.vchr_status IN ('trial', 'active')
                  AND m.vchr_module_key = $2
                ORDER BY s.pk_bint_subscription_id DESC
                LIMIT 1""",
            intUserId, strModuleKey
        )

    if not rstPerm:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This module is not available in your plan. Please upgrade."
        )

    intOperationValue = rstPerm[strColumn]
    strModuleName = rstPerm['vchr_display_name']
    intModuleId = rstPerm['fk_bint_module_id']

    # 0 = blocked
    if intOperationValue == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have {strOperation} access for {strModuleName}. Please upgrade your plan."
        )

    # -1 = unlimited (but still check daily/monthly for create)
    if intOperationValue == -1 and strOperation != "create":
        return {"blnAllowed": True, "intLimit": -1, "intUsed": 0, "intRemaining": -1}

    # For create operations, check usage limits
    if strOperation == "create":
        intDailyLimit = rstPerm['int_daily_limit']
        intMonthlyLimit = rstPerm['int_monthly_limit']

        # Check daily limit
        if intDailyLimit > 0:
            intUsedToday = await _fnGetUsageCount(objPool, intUserId, intModuleId, "create", "daily")
            if intUsedToday >= intDailyLimit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You've reached your daily limit ({intDailyLimit}) for {strModuleName}. Please upgrade your plan."
                )
            return {"blnAllowed": True, "intLimit": intDailyLimit, "intUsed": intUsedToday, "intRemaining": intDailyLimit - intUsedToday}

        # Check monthly limit
        if intMonthlyLimit > 0:
            intUsedThisMonth = await _fnGetUsageCount(objPool, intUserId, intModuleId, "create", "monthly")
            if intUsedThisMonth >= intMonthlyLimit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You've reached your monthly limit ({intMonthlyLimit}) for {strModuleName}. Please upgrade your plan."
                )
            return {"blnAllowed": True, "intLimit": intMonthlyLimit, "intUsed": intUsedThisMonth, "intRemaining": intMonthlyLimit - intUsedThisMonth}

    return {"blnAllowed": True, "intLimit": -1, "intUsed": 0, "intRemaining": -1}


async def fnIncrementModuleUsage(objPool, intUserId: int, strModuleKey: str, strOperation: str = "create"):
    """
    Increment usage counter after a successful operation.
    Figures out the period (daily/monthly) from the plan config.
    """
    if intUserId == ADMIN_USER_ID:
        return

    async with objPool.acquire() as conn:
        # Get module ID and plan limits
        rstPerm = await conn.fetchrow(
            """SELECT pm.fk_bint_module_id, pm.int_monthly_limit, pm.int_daily_limit
               FROM tbl_plan_module pm
               JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
               JOIN tbl_subscription s ON pm.fk_bint_plan_id = s.fk_bint_plan_id
               WHERE s.fk_bint_user_id = $1
                 AND s.vchr_status IN ('trial', 'active')
                 AND m.vchr_module_key = $2
               ORDER BY s.pk_bint_subscription_id DESC
               LIMIT 1""",
            intUserId, strModuleKey
        )

    if not rstPerm:
        return

    intModuleId = rstPerm['fk_bint_module_id']

    # Determine period based on which limit is set
    if rstPerm['int_daily_limit'] > 0:
        datPeriodStart = date.today()
    elif rstPerm['int_monthly_limit'] > 0:
        datPeriodStart = date.today().replace(day=1)
    else:
        return  # unlimited, no tracking needed

    async with objPool.acquire() as conn:
        await conn.execute(
            """INSERT INTO tbl_module_usage (fk_bint_user_id, fk_bint_module_id, vchr_operation, int_count, dat_period_start)
               VALUES ($1, $2, $3, 1, $4)
               ON CONFLICT (fk_bint_user_id, fk_bint_module_id, vchr_operation, dat_period_start)
               DO UPDATE SET int_count = tbl_module_usage.int_count + 1""",
            intUserId, intModuleId, strOperation, datPeriodStart
        )


async def fnGetModuleUsageSummary(objPool, intUserId: int) -> list:
    """
    Get all modules with their permissions + current usage for a user.
    Used for dashboard/status display.
    """
    async with objPool.acquire() as conn:
        rstModules = await conn.fetch(
            """SELECT m.vchr_module_key, m.vchr_display_name, m.vchr_icon,
                      pm.int_create, pm.int_read, pm.int_update, pm.int_delete, pm.int_print,
                      pm.int_monthly_limit, pm.int_daily_limit, pm.fk_bint_module_id
               FROM tbl_plan_module pm
               JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
               JOIN tbl_subscription s ON pm.fk_bint_plan_id = s.fk_bint_plan_id
               WHERE s.fk_bint_user_id = $1
                 AND s.vchr_status IN ('trial', 'active')
               ORDER BY m.int_sort_order""",
            intUserId
        )

    lstResult = []
    for row in rstModules:
        intUsed = 0
        intLimit = -1

        if row['int_daily_limit'] > 0:
            intUsed = await _fnGetUsageCount(objPool, intUserId, row['fk_bint_module_id'], "create", "daily")
            intLimit = row['int_daily_limit']
        elif row['int_monthly_limit'] > 0:
            intUsed = await _fnGetUsageCount(objPool, intUserId, row['fk_bint_module_id'], "create", "monthly")
            intLimit = row['int_monthly_limit']

        lstResult.append({
            "strModuleKey": row['vchr_module_key'],
            "strDisplayName": row['vchr_display_name'],
            "strIcon": row['vchr_icon'],
            "intCreate": row['int_create'],
            "intRead": row['int_read'],
            "intUpdate": row['int_update'],
            "intDelete": row['int_delete'],
            "intPrint": row['int_print'],
            "intMonthlyLimit": row['int_monthly_limit'],
            "intDailyLimit": row['int_daily_limit'],
            "intUsed": intUsed,
            "intRemaining": -1 if intLimit == -1 else max(intLimit - intUsed, 0),
        })

    return lstResult


async def _fnGetUsageCount(objPool, intUserId: int, intModuleId: int, strOperation: str, strPeriod: str) -> int:
    """Get current usage count for a user/module/operation/period"""
    datPeriodStart = date.today() if strPeriod == "daily" else date.today().replace(day=1)

    async with objPool.acquire() as conn:
        rstUsage = await conn.fetchrow(
            """SELECT int_count FROM tbl_module_usage
               WHERE fk_bint_user_id = $1
                 AND fk_bint_module_id = $2
                 AND vchr_operation = $3
                 AND dat_period_start = $4""",
            intUserId, intModuleId, strOperation, datPeriodStart
        )

    return rstUsage['int_count'] if rstUsage else 0
