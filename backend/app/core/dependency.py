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
                dctModulePerms={"intCreate": -1, "intRead": -1, "intUpdate": -1, "intDelete": -1, "intPrint": -1, "strQuotaPeriod": None}
            )

        # Check plan-level module access, with per-user override taking precedence
        async with objPool.acquire() as conn:
            rstPerm = await conn.fetchrow(
                """SELECT COALESCE(o.int_create, pm.int_create) AS int_create,
                          COALESCE(o.int_read,   pm.int_read)   AS int_read,
                          COALESCE(o.int_update, pm.int_update) AS int_update,
                          COALESCE(o.int_delete, pm.int_delete) AS int_delete,
                          COALESCE(o.int_print,  pm.int_print)  AS int_print,
                          COALESCE(o.vchr_quota_period, pm.vchr_quota_period) AS vchr_quota_period
                   FROM tbl_user u
                   JOIN tbl_plan_module pm ON pm.fk_bint_plan_id = u.fk_bint_plan_id
                   JOIN tbl_module m ON pm.fk_bint_module_id = m.pk_bint_module_id
                   LEFT JOIN tbl_user_module_override o
                          ON o.fk_bint_user_id = u.pk_bint_user_id
                         AND o.fk_bint_module_id = m.pk_bint_module_id
                         AND (o.dat_expires_at IS NULL OR o.dat_expires_at >= CURRENT_DATE)
                   WHERE u.pk_bint_user_id = $1
                     AND u.vchr_plan_status IN ('trial', 'active')
                     AND u.dat_plan_end_date >= CURRENT_DATE
                     AND m.vchr_module_key = $2
                   LIMIT 1""",
                intUserId, strModuleKey
            )

        if not rstPerm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This module is not available in your plan. Please upgrade."
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
            "strQuotaPeriod": rstPerm['vchr_quota_period'],
        }

        return MdlDepndencyContext(
            objPool=objPool, intUserId=intUserId,
            dctSubscription=dctSubscription,
            dctModulePerms=dctModulePerms
        )

    return _check
