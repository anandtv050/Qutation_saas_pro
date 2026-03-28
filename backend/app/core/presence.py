import time
from asyncpg import Pool
from app.core.logger import getLogger


class ClsPresenceTracker:
    """
    Tracks user online/offline status by updating tim_last_heartbeat in DB.
    Uses in-memory throttle: only writes to DB once per 60s per user,
    regardless of how many API calls the user makes.
    """
    _instance = None
    THROTTLE_SECONDS = 60  # Only write to DB once per 60s per user

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        # {user_id: last_db_write_timestamp}
        self.dctLastWrite = {}
        self.logger = getLogger()

    async def fnUpdatePresence(self, pool: Pool, intUserId: int):
        """Update user's heartbeat. Throttled: max 1 DB write per 60s per user."""
        fltNow = time.time()
        fltLastWrite = self.dctLastWrite.get(intUserId, 0)

        # Skip if we wrote less than 60s ago
        if fltNow - fltLastWrite < self.THROTTLE_SECONDS:
            return

        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE tbl_user SET tim_last_heartbeat = NOW() WHERE pk_bint_user_id = $1",
                    intUserId
                )
            self.dctLastWrite[intUserId] = fltNow
        except Exception as e:
            self.logger.error(f"Presence update failed for user {intUserId}: {e}")

    async def fnClearPresence(self, pool: Pool, intUserId: int):
        """Set heartbeat to NULL (user logged out). Immediate, no throttle."""
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE tbl_user SET tim_last_heartbeat = NULL WHERE pk_bint_user_id = $1",
                    intUserId
                )
            # Remove from memory so next login triggers immediate write
            self.dctLastWrite.pop(intUserId, None)
        except Exception as e:
            self.logger.error(f"Presence clear failed for user {intUserId}: {e}")

    async def fnSetLogin(self, pool: Pool, intUserId: int):
        """Mark user as logged in. Sets both last_login and heartbeat."""
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE tbl_user SET tim_last_login = NOW(), tim_last_heartbeat = NOW() WHERE pk_bint_user_id = $1",
                    intUserId
                )
            self.dctLastWrite[intUserId] = time.time()
        except Exception as e:
            self.logger.error(f"Login presence update failed for user {intUserId}: {e}")
