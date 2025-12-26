import asyncpg
import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class ClsDatabasepool:
    """Singleton Database Pool - Only ONE instance created"""

    _instance: Optional['ClsDatabasepool'] = None  # Singleton instance
    _pool: Optional[asyncpg.Pool] = None           # Shared pool

    def __new__(cls):
        """Create only one instance (Singleton)"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def fnConnectDb(self):
        """Create Database pool (only once)"""

        if ClsDatabasepool._pool is not None:
            return  # Pool already exists

        try:
            # Read from environment variables
            db_host = os.getenv("DB_HOST", "localhost")
            db_port = int(os.getenv("DB_PORT", "5432"))
            db_name = os.getenv("DB_NAME", "postgres")
            db_user = os.getenv("DB_USER", "postgres")
            db_password = os.getenv("DB_PASSWORD", "")

            # Supabase requires SSL
            ssl_mode = "require" if db_host != "localhost" else None

            ClsDatabasepool._pool = await asyncpg.create_pool(
                host=db_host,
                port=db_port,
                database=db_name,
                user=db_user,
                password=db_password,
                command_timeout=60,
                min_size=2,
                max_size=10,
                ssl=ssl_mode,
            )
            print(f"Database Pool Created - Connected to {db_host}")
        except Exception as e:
            print(f"Pool creation failed: '{e}'")
            raise e

    async def fnDisconnectPool(self):
        """Close the database pool"""

        if ClsDatabasepool._pool:
            await ClsDatabasepool._pool.close()
            ClsDatabasepool._pool = None
            print("Database Pool Closed")

    async def fnGetPool(self) -> asyncpg.Pool:
        """Get pool connection (reuses same pool)"""
        if ClsDatabasepool._pool is None:
            await self.fnConnectDb()
        return ClsDatabasepool._pool
