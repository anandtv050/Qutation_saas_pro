"""
Quttaion Saas Pro - Backend API
Multi-tenant SaaS application for quotations and invoices
"""
__author__ = "Anand"

from pathlib import Path
from dotenv import load_dotenv

# Load env in a stable order:
# 1) legacy app-local env (if present)
# 2) project backend/.env (wins and should be the source of truth)
_APP_ENV_PATH = Path(__file__).parent / ".env"
_BACKEND_ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(_APP_ENV_PATH)
load_dotenv(_BACKEND_ENV_PATH, override=True)

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import importlib
import asyncio
import os

from fastapi import Request
from starlette.background import BackgroundTask
from app.core.database import ClsDatabasepool
from app.core.logger import getLogger
from app.core.security import fnDecodeAccessToken
from app.core.presence import ClsPresenceTracker

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
    "app.api.print_settings.router", # Print model settings per user
    "app.api.subscription.router",   # Subscription & payment
    "app.api.plan.router",            # Plan management (Admin only)
    "app.api.service.router",         # Service management (Admin only)
]



@asynccontextmanager
async def lifespan(app:FastAPI):
    """Application life span - Start server first, connect DB in background"""
    logger.info("Starting Quotely API Server...")
    insDb = ClsDatabasepool()
    await insDb.fnStartUp()

    # Telegram bot — no-op if TELEGRAM_BOT_TOKEN is unset. A bot failure must
    # not crash the API.
    from app.telegram_bot.bot import fnStartBot, fnStopBot
    try:
        await fnStartBot()
    except Exception as e:
        logger.error(f"Telegram bot failed to start: {e}")

    yield

    try:
        await fnStopBot()
    except Exception as e:
        logger.error(f"Telegram bot stop error: {e}")

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
    cors_origins_str = os.getenv("CORS_ORIGINS", "http://localhost:5174,http://localhost:3000")
    cors_origins = [origin.strip() for origin in cors_origins_str.split(",")]
    logger.info(f"CORS Origins: {cors_origins}")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Presence middleware — updates user heartbeat on every authenticated request
    @app.middleware("http")
    async def presence_middleware(request: Request, call_next):
        response = await call_next(request)

        # Extract user_id from JWT token (non-blocking, after response)
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            payload = fnDecodeAccessToken(token)
            if payload and "user_id" in payload:
                intUserId = int(payload["user_id"])
                # Update presence in background (throttled: max 1 DB write per 60s)
                insDb = ClsDatabasepool()
                pool = await insDb.fnGetPool()
                if pool:
                    insPresence = ClsPresenceTracker()
                    await insPresence.fnUpdatePresence(pool, intUserId)

        return response

# Register routers


    @app.get("/")
    async def root():
        """Root endpoint"""
        return {
            "message": "Quotation SaaS Pro API",
            "version": "1.0.0",
            "docs": "/docs"
        }

    @app.api_route("/health", methods=["GET", "HEAD"])
    async def health_check():
        """Health check endpoint for monitoring - keeps DB connection alive"""
        insDb = ClsDatabasepool()

        # Quick check if pool exists
        pool_stats = await insDb.fnGetPoolStats()
        if pool_stats.get("status") == "not_initialized":
            return {"status": "starting", "database": "connecting"}

        # Do health check (this keeps the connection warm)
        db_health = await insDb.fnHealthCheck()

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

    # Serve uploaded files (logos, signatures) at /uploads/
    uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

    return app


# Create app instance
app = fnCreateApp()
