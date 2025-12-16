import asyncpg
from typing import Optional


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
            ClsDatabasepool._pool = await asyncpg.create_pool(
                host="localhost",
                port=5432,
                database="db_quotation_saas_pro_12_12_2025",
                user="postgres",
                password="Anand@123",
                command_timeout=60,
                min_size=2,
                max_size=10,
            )
            print("Database Pool Created (Singleton)")
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
