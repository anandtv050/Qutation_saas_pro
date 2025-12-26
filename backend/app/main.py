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
import os

from app.core.database import ClsDatabasepool


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


@asynccontextmanager
async def lifespan(app:FastAPI):
    """Application life span"""
    insDb = ClsDatabasepool()
    await insDb.fnConnectDb()  # Connect to database
    #startup
    print("Starting Qutation Saas Pro API...")
    yield
    await insDb.fnDisconnectPool()
    #Shotdown
    print("Shutting down Qutation Saas Pro API...")



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
    print(f"CORS Origins: {cors_origins}")

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
        
        # Dynamically load routers
    for strModulePath in LST_ROUTERS:
        try:
            module = importlib.import_module(strModulePath)
            router = getattr(module, 'router', None)
            
            if router is None:
                print(f"⚠️  Warning: Router not found in {strModulePath}")
                continue
            
            app.include_router(router)
            print(f" Loaded router: {strModulePath}")
            
        except Exception as e:
            print(f" Failed to load router {strModulePath}: {e}")
            raise

    return app


# Create app instance
app = fnCreateApp()
