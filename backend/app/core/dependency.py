from pydantic import BaseModel
from dataclasses import dataclass
from asyncpg import Pool
from fastapi import Depends

from app.core.security import fnGetCurrentUser
from app.core.database import ClsDatabasepool


@dataclass
class MdlDepndencyContext:
    objPool: Pool
    intUserId: int


async def fnGetContext():
    """
    Dependency that provides database pool and current user ID.

    Now its only 1 db - not specific db!
    When we set different db, check userid and map to diff db.
    """

    objDatabase = ClsDatabasepool()
    objPool = await objDatabase.fnGetPool()

    yield MdlDepndencyContext(objPool=objPool, intUserId=1) 
    