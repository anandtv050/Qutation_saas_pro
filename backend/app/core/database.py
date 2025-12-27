import asyncpg
import asyncio
import os
from typing import Optional
from dotenv import load_dotenv

from app.core.logger import getLogger

# Load environment variables
load_dotenv()

# Database logger
logger = getLogger()


class ClsDatabasepool:
    """Singleton Database Pool - Only ONE instance created"""

    _instance: Optional['ClsDatabasepool'] = None  # Singleton instance
    _pool: Optional[asyncpg.Pool] = None           # Shared pool
    _connection_retries: int = 5                   # Retry attempts (increased for cold starts)
    _retry_delay: int = 10                         # Seconds between retries

    def __new__(cls):
        """Create only one instance (Singleton)"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def fnConnectDb(self):
        """Create Database pool with retry logic"""

        if ClsDatabasepool._pool is not None:
            return  # Pool already exists

        # Read from environment variables
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = int(os.getenv("DB_PORT", "5432"))
        db_name = os.getenv("DB_NAME", "postgres")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "")

        # Log config (hide password)
        logger.info("=== Database Connection ===")
        logger.info(f"DB_HOST: {db_host}")
        logger.info(f"DB_PORT: {db_port}")
        logger.info(f"DB_NAME: {db_name}")
        logger.info(f"DB_USER: {db_user}")
        logger.info(f"DB_PASSWORD: {'***SET***' if db_password else '***EMPTY***'}")

        # Supabase requires SSL
        ssl_mode = "require" if db_host != "localhost" else None
        logger.info(f"SSL_MODE: {ssl_mode or 'disabled'}")

        # Retry logic for cold starts
        for attempt in range(1, self._connection_retries + 1):
            try:
                logger.info(f"Connection attempt {attempt}/{self._connection_retries}...")

                ClsDatabasepool._pool = await asyncpg.create_pool(
                    host=db_host,
                    port=db_port,
                    database=db_name,
                    user=db_user,
                    password=db_password,
                    timeout=30,           # Connection timeout (reduced - let retry handle it)
                    command_timeout=60,   # Query timeout
                    min_size=1,           # Lower min for cold start
                    max_size=10,
                    ssl=ssl_mode,
                )

                logger.info(f"Database Pool Created Successfully!")
                logger.info(f"Pool Size: min=1, max=10")
                logger.info("===========================")
                return

            except asyncio.TimeoutError as e:
                logger.error(f"Connection timeout (attempt {attempt}): {str(e)}")
                if attempt < self._connection_retries:
                    logger.info(f"Retrying in {self._retry_delay} seconds...")
                    await asyncio.sleep(self._retry_delay)
                else:
                    logger.error("All connection attempts failed - TimeoutError")
                    raise

            except asyncpg.PostgresError as e:
                logger.error(f"PostgreSQL error (attempt {attempt}): {str(e)}")
                if attempt < self._connection_retries:
                    logger.info(f"Retrying in {self._retry_delay} seconds...")
                    await asyncio.sleep(self._retry_delay)
                else:
                    logger.error("All connection attempts failed - PostgresError")
                    raise

            except Exception as e:
                logger.error(f"Unexpected error (attempt {attempt}): {str(e)}", exc_info=True)
                if attempt < self._connection_retries:
                    logger.info(f"Retrying in {self._retry_delay} seconds...")
                    await asyncio.sleep(self._retry_delay)
                else:
                    logger.error("All connection attempts failed")
                    raise

    async def fnDisconnectPool(self):
        """Close the database pool"""

        if ClsDatabasepool._pool:
            logger.info("Closing database pool...")
            await ClsDatabasepool._pool.close()
            ClsDatabasepool._pool = None
            logger.info("Database Pool Closed")

    async def fnGetPool(self) -> asyncpg.Pool:
        """Get pool connection (reuses same pool)"""
        if ClsDatabasepool._pool is None:
            logger.warning("Pool not initialized, creating new pool...")
            await self.fnConnectDb()
        return ClsDatabasepool._pool

    async def fnHealthCheck(self) -> dict:
        """Check database connection health"""
        try:
            pool = await self.fnGetPool()
            async with pool.acquire() as conn:
                result = await conn.fetchval("SELECT 1")
                pool_size = pool.get_size()
                pool_free = pool.get_idle_size()
                pool_used = pool_size - pool_free

                health = {
                    "status": "healthy",
                    "pool_size": pool_size,
                    "pool_used": pool_used,
                    "pool_free": pool_free,
                    "test_query": result == 1
                }
                logger.debug(f"Health check: {health}")
                return health

        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e)
            }

    async def fnGetPoolStats(self) -> dict:
        """Get current pool statistics"""
        if ClsDatabasepool._pool is None:
            return {"status": "not_initialized"}

        pool = ClsDatabasepool._pool
        return {
            "status": "active",
            "size": pool.get_size(),
            "idle": pool.get_idle_size(),
            "used": pool.get_size() - pool.get_idle_size(),
            "min_size": pool.get_min_size(),
            "max_size": pool.get_max_size()
        }
