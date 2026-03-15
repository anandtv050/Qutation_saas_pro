from dotenv import load_dotenv
import asyncpg,asyncio,os

load_dotenv()


class ClsDatabasepool:
    _shared_pool = None
    _shared_lock = None
    
    def __init__(self) -> None:
        pass
        
    def _get_lock(self)->asyncio.Lock:
        if ClsDatabasepool._shared_lock is None:
            ClsDatabasepool._shared_lock = asyncio.Lock()
        return ClsDatabasepool._shared_lock
        
    
    async def fnCreatePool(self)->asyncpg.Pool:
        """ pool creation """
        # Read from environment variables
        db_host = os.getenv("DB_HOST", "localhost")
        db_port = int(os.getenv("DB_PORT", "5432"))
        db_name = os.getenv("DB_NAME", "postgres")
        db_user = os.getenv("DB_USER", "postgres")
        db_password = os.getenv("DB_PASSWORD", "")
            
        # Supabase requires SSL
        ssl_mode = "require" if db_host != "localhost" else None
        # logger.info(f"SSL_MODE: {ssl_mode or 'disabled'}")
            
        objPool = await asyncpg.create_pool(
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
        
        return objPool

    async def fnGetPool(self):
        
        if ClsDatabasepool._shared_pool is not None:
            return ClsDatabasepool._shared_pool
        #Pool Already exist 
        # if self.objPool is not None:
        #     return self.objPool
        
        #Create New Pool
        async with self._get_lock():
            if ClsDatabasepool._shared_pool is None:
                ClsDatabasepool._shared_pool = await self.fnCreatePool()
        
        return ClsDatabasepool._shared_pool
    
    async def fnStartUp(self)-> None:
        if ClsDatabasepool._shared_pool is  None:
            ClsDatabasepool._shared_pool = await self.fnCreatePool()
            print(f"Database Created ")
    
    async def fnDisconnectPool(self):
     """disconnect pool"""
     if ClsDatabasepool._shared_pool :
        await ClsDatabasepool._shared_pool.close()
        ClsDatabasepool._shared_pool = None
         
                   
        
    