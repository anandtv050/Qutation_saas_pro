"""
Quttaion Saas Pro - Backend API
Multi-tenant SaaS application for quotations and invoices
"""
__author__ = "Anand"

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import importlib
import asyncio
import os

from app.core.database import ClsDatabasepool
from app.core.logger import getLogger

# Initialize app logger
logger = getLogger()

# Router registry - Easy to see all APIs
LST_ROUTERS = [
    "app.api.login.router",
    "app.api.inventory.router",
    "app.api.quotation.router",
    "app.api.invoice.router",
    "app.api.dashboard.router",
    "app.api.pdf.router",
    "app.api.ai.router",
    "app.api.user.router",          # User management (Admin only)
]


async def fnConnectDbBackground():
    """Connect to database in background (non-blocking)"""
    try:
        insDb = ClsDatabasepool()
        await insDb.fnConnectDb()
    except Exception as e:
        logger.error(f"Background DB connection failed: {str(e)}")


@asynccontextmanager
async def lifespan(app:FastAPI):
    """Application life span - Start server first, connect DB in background"""
    logger.info("Starting Quotely API Server...")

    # Start DB connection in background (non-blocking)
    # Server starts immediately, DB connects while server is running
    asyncio.create_task(fnConnectDbBackground())

    yield

    # Shutdown
    insDb = ClsDatabasepool()
    await insDb.fnDisconnectPool()
    logger.info("Shutting down Quotely API Server...")



def fnCreateApp() -> FastAPI:
    """Create FastAPI application with dynamic router loading"""
    
    app = FastAPI(
        title="Quotation Saas Pro",
        description="Multi-tenant SaaS for Quotations & Invoices",
        version="1.0.0",
        lifespan=lifespan,
        debug=True,
    )
    
    # CORS middleware - Read from environment variable
    cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]
    logger.info(f"CORS Origins: {cors_origins}")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
# Register routers


    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "message": "Quotation SaaS Pro API",
            "version": "1.0.0",
            "docs": "/docs"
        }

    @app.get("/health")
    async def health_check():
        """Health check endpoint for monitoring"""
        insDb = ClsDatabasepool()
        db_health = await insDb.fnHealthCheck()
        pool_stats = await insDb.fnGetPoolStats()

        return {
            "status": "ok" if db_health.get("status") == "healthy" else "degraded",
            "database": db_health,
            "pool": pool_stats
        }

    # Dynamically load routers
    for strModulePath in LST_ROUTERS:
        try:
            module = importlib.import_module(strModulePath)
            router = getattr(module, 'router', None)

            if router is None:
                logger.warning(f"Router not found in {strModulePath}")
                continue

            app.include_router(router)
            logger.debug(f"Loaded router: {strModulePath}")

        except Exception as e:
            logger.error(f"Failed to load router {strModulePath}: {e}")
            raise

    return app


# Create app instance
app = fnCreateApp()
