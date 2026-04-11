from pydantic import BaseModel
from dataclasses import dataclass, field
from asyncpg import Pool
from fastapi import Depends, HTTPException, status

from app.core.security import fnGetCurrentUser, fnGetAdminUser, fnCheckModulePermission
from app.core.database import ClsDatabasepool
from app.core.subscription import fnCheckSubscription


@dataclass
class MdlDepndencyContext:
    objPool: Pool
    intUserId: int
    dctSubscription: dict = field(default_factory=dict)


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
    Factory that returns a dependency which checks module permission.
    Usage in router: Depends(fnRequireModule("quotation"))
    """
    async def _check(intUserId: int = Depends(fnGetCurrentUser)):
        objDatabase = ClsDatabasepool()
        objPool = await objDatabase.fnGetPool()

        blnAllowed = await fnCheckModulePermission(intUserId, strModuleKey, objPool)
        if not blnAllowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You don't have access to this module. Please contact admin."
            )

        # Also check subscription
        dctSubscription = await fnCheckSubscription(objPool, intUserId)

        return MdlDepndencyContext(objPool=objPool, intUserId=intUserId, dctSubscription=dctSubscription)

    return _check
