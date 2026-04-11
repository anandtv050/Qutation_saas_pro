from pydantic import BaseModel
from dataclasses import dataclass, field
from asyncpg import Pool
from fastapi import Depends, HTTPException, status

from app.core.security import fnGetCurrentUser, fnGetAdminUser
from app.core.database import ClsDatabasepool
from app.core.subscription import fnCheckSubscription

ADMIN_USER_ID = 1


@dataclass
class MdlDepndencyContext:
    objPool: Pool
    intUserId: int
    dctSubscription: dict = field(default_factory=dict)
    dctModulePerms: dict = field(default_factory=dict)


async def fnGetContext(intUserId: int = Depends(fnGetCurrentUser)):
    """
    Dependency that provides database pool, current user ID, and subscription status.
    Raises HTTP 402 if subscription is expired.
    """
    objDatabase = ClsDatabasepool()
    objPool = await objDatabase.fnGetPool()

    # Check subscription (raises 402 if expired)
    dctSubscription = await fnCheckSubscription(objPool, intUserId)

    yield MdlDepndencyContext(objPool=objPool, intUserId=intUserId, dctSubscription=dctSubscription)


async def fnGetAdminContext(intUserId: int = Depends(fnGetAdminUser)):
    """
    Dependency for admin-only endpoints.
    Verifies user is admin (user_id=1) and provides database pool.
    """
    objDatabase = ClsDatabasepool()
    objPool = await objDatabase.fnGetPool()

    yield MdlDepndencyContext(objPool=objPool, intUserId=intUserId)


def fnRequireModule(strModuleKey: str):
    """
    Factory that returns a dependency which checks module permission via plan.
    Uses tbl_plan_module to check if user's plan allows this module.
    Usage in router: Depends(fnRequireModule("quotation"))
    """
    async def _check(intUserId: int = Depends(fnGetCurrentUser)):
        objDatabase = ClsDatabasepool()
        objPool = await objDatabase.fnGetPool()

        # Check subscription first (raises 402 if expired)
        dctSubscription = await fnCheckSubscription(objPool, intUserId)

        # Admin bypass
        if intUserId == ADMIN_USER_ID:
            return MdlDepndencyContext(
                objPool=objPool, intUserId=intUserId,
                dctSubscription=dctSubscription,
                dctModulePerms={"intCreate": -1, "intRead": -1, "intUpdate": -1, "intDelete": -1, "intPrint": -1, "intMonthlyLimit": -1, "intDailyLimit": -1}
            )

        # Check plan-level module access
        async with objPool.acquire() as conn:
            rstPerm = await conn.fetchrow(
                """SELECT pm.int_create, pm.int_read, pm.int_update, pm.int_delete, pm.int_print,
                          pm.int_monthly_limit, pm.int_daily_limit
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

        # If no plan_module row exists, check legacy tbl_user_module_permission
        if not rstPerm:
            # Fallback to old permission system during transition
            async with objPool.acquire() as conn:
                rstLegacy = await conn.fetchrow(
                    """SELECT p.bln_enabled
                       FROM tbl_user_module_permission p
                       JOIN tbl_module m ON p.fk_bint_module_id = m.pk_bint_module_id
                       WHERE p.fk_bint_user_id = $1 AND m.vchr_module_key = $2""",
                    intUserId, strModuleKey
                )
            # Legacy: no row = allowed, row with false = blocked
            if rstLegacy and not rstLegacy['bln_enabled']:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this module. Please contact admin."
                )
            return MdlDepndencyContext(
                objPool=objPool, intUserId=intUserId,
                dctSubscription=dctSubscription,
                dctModulePerms={"intCreate": -1, "intRead": -1, "intUpdate": -1, "intDelete": -1, "intPrint": -1, "intMonthlyLimit": -1, "intDailyLimit": -1}
            )

        # Check if module read is blocked (can't access at all)
        if rstPerm['int_read'] == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This module is not available in your plan. Please upgrade."
            )

        dctModulePerms = {
            "intCreate": rstPerm['int_create'],
            "intRead": rstPerm['int_read'],
            "intUpdate": rstPerm['int_update'],
            "intDelete": rstPerm['int_delete'],
            "intPrint": rstPerm['int_print'],
            "intMonthlyLimit": rstPerm['int_monthly_limit'],
            "intDailyLimit": rstPerm['int_daily_limit'],
        }

        return MdlDepndencyContext(
            objPool=objPool, intUserId=intUserId,
            dctSubscription=dctSubscription,
            dctModulePerms=dctModulePerms
        )

    return _check
