import asyncpg 
from typing import Optional

class ClsDatabasepool:
    def __init__(self) -> None:
        self.pool:Optional[asyncpg.pool] =None
        
    async def fnConnectDb(self):
        """Create Database pool"""
        
        try:
            self.pool = await asyncpg.create_pool(
                # host=settings.DB_HOST,
                # port=settings.DB_PORT,
                # database=settings.DB_NAME,
                # user=settings.DB_USER,
                # password=settings.DB_PASSWORD,
                # min_size=settings.DB_POOL_MIN_SIZE,
                # max_size=settings.DB_POOL_MAX_SIZE,
                host="localhost",
                port=5432,
                database="db_quotation_saas_pro_12_12_2025",
                user="postgres",
                password="Anand@123",
                command_timeout=60,
            )
            print("Database Pool Created")
        except Exception as e:
            print(f"pool creation failed '{e}'")
            raise e
    
    async def fnDisconnectPool(self):
        """Close the databse pool"""
        
        if self.pool:
            await self.pool.close()
            print("DatabasePool Closed")
    
    async def fnGetPool(self)->asyncpg.pool:
        """Get pool connection"""
        if not self.pool:
            await self.fnConnectDb()
        return self.pool
            


