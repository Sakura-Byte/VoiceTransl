"""
VoiceTransl REST API Main Application
FastAPI application providing transcription and translation services
"""

import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

from api.core.config import get_settings
from api.core.task_manager import TaskManager
from api.routers import transcription, translation, tasks, config as config_router
from api.core.exceptions import VoiceTranslException


# Global task manager instance
task_manager: TaskManager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global task_manager
    
    # Startup
    logging.info("Starting VoiceTransl API server...")
    task_manager = TaskManager()
    await task_manager.initialize()
    
    # Store task manager in app state
    app.state.task_manager = task_manager
    
    yield
    
    # Shutdown
    logging.info("Shutting down VoiceTransl API server...")
    if task_manager:
        await task_manager.cleanup()


def create_app() -> FastAPI:
    """Create and configure FastAPI application"""
    settings = get_settings()
    
    app = FastAPI(
        title="VoiceTransl API",
        description="REST API for audio transcription and translation services",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Add exception handlers
    @app.exception_handler(VoiceTranslException)
    async def voicetransl_exception_handler(request, exc: VoiceTranslException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.message, "detail": exc.detail}
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail}
        )
    
    # Include routers
    app.include_router(transcription.router, prefix="/api", tags=["transcription"])
    app.include_router(translation.router, prefix="/api", tags=["translation"])
    app.include_router(tasks.router, prefix="/api", tags=["tasks"])
    app.include_router(config_router.router, prefix="/api", tags=["configuration"])
    
    # Health check endpoint
    @app.get("/health")
    async def health_check():
        return {"status": "healthy", "version": "1.0.0"}
    
    return app


# Create app instance
app = create_app()


def run_server(host: str = "127.0.0.1", port: int = 8000, reload: bool = False):
    """Run the API server"""
    uvicorn.run(
        "api.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )


if __name__ == "__main__":
    run_server()
