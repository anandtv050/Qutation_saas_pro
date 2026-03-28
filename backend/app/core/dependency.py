from pydantic import BaseModel
from dataclasses import dataclass
from asyncpg import Pool
from fastapi import Depends

from app.core.security import fnGetCurrentUser, fnGetAdminUser
from app.core.database import ClsDatabasepool


@dataclass
class MdlDepndencyContext:
    objPool: Pool
    intUserId: int


async def fnGetContext(intUserId: int = Depends(fnGetCurrentUser)):
    """
    Dependency that provides database pool and current user ID.

    Now its only 1 db - not specific db!
    When we set different db, check userid and map to diff db.
    """

    objDatabase = ClsDatabasepool()
    objPool = await objDatabase.fnGetPool()

    yield MdlDepndencyContext(objPool=objPool, intUserId=intUserId)


async def fnGetAdminContext(intUserId: int = Depends(fnGetAdminUser)):
    """
    Dependency for admin-only endpoints.
    Verifies user is admin (user_id=1) and provides database pool.
    """
    objDatabase = ClsDatabasepool()
    objPool = await objDatabase.fnGetPool()

    yield MdlDepndencyContext(objPool=objPool, intUserId=intUserId)