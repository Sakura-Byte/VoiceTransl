"""
Configuration API endpoints
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from api.models.config import (
    ServerConfigResponse, TranscriptionConfigResponse, TranslationConfigResponse,
    ConfigUpdateRequest, ConfigUpdateResponse, SystemStatusResponse, HealthCheckResponse
)
from api.core.config import get_settings, get_config_bridge, get_gui_integration
from api.core.exceptions import ConfigurationError

router = APIRouter()


@router.get("/config", response_model=Dict[str, Any])
async def get_full_config():
    """Get complete configuration"""
    settings = get_settings()
    config_bridge = get_config_bridge()
    
    gui_config = config_bridge.load_gui_config()
    transcription_config = config_bridge.get_transcription_config()
    translation_config = config_bridge.get_translation_config()
    
    return {
        "server": {
            "host": settings.host,
            "port": settings.port,
            "max_concurrent_tasks": settings.max_concurrent_tasks,
            "rate_limit_requests": settings.rate_limit_requests,
            "rate_limit_window": settings.rate_limit_window,
            "max_file_size": settings.max_file_size,
            "version": "1.0.0"
        },
        "transcription": transcription_config,
        "translation": translation_config,
        "gui_integration": gui_config
    }


@router.post("/config", response_model=ConfigUpdateResponse)
async def update_config(request: ConfigUpdateRequest):
    """Update configuration"""
    config_bridge = get_config_bridge()
    updated_sections = []
    warnings = []
    
    try:
        # Update GUI configuration if provided
        if request.translation:
            success = config_bridge.update_gui_config(request.translation)
            if success:
                updated_sections.append("translation")
            else:
                warnings.append("Failed to update translation configuration")
        
        # Note: Server and transcription config updates would require restart
        if request.server:
            warnings.append("Server configuration changes require restart")
        
        if request.transcription:
            warnings.append("Transcription configuration changes require restart")
        
        return ConfigUpdateResponse(
            updated_sections=updated_sections,
            restart_required=bool(request.server or request.transcription),
            warnings=warnings if warnings else None
        )
        
    except Exception as e:
        raise ConfigurationError(f"Failed to update configuration: {str(e)}")


@router.get("/config/server", response_model=ServerConfigResponse)
async def get_server_config():
    """Get server configuration"""
    settings = get_settings()
    
    return ServerConfigResponse(
        host=settings.host,
        port=settings.port,
        max_concurrent_tasks=settings.max_concurrent_tasks,
        rate_limit_requests=settings.rate_limit_requests,
        rate_limit_window=settings.rate_limit_window,
        max_file_size=settings.max_file_size,
        supported_formats=["mp3", "wav", "m4a", "flac", "ogg", "mp4", "avi", "mkv"],
        version="1.0.0"
    )


@router.get("/config/transcription", response_model=TranscriptionConfigResponse)
async def get_transcription_config():
    """Get transcription configuration"""
    config_bridge = get_config_bridge()
    transcription_config = config_bridge.get_transcription_config()
    
    return TranscriptionConfigResponse(
        default_language=transcription_config.get('language', 'ja'),
        default_output_format=transcription_config.get('output_format', 'lrc'),
        available_backends=["anime-whisper", "hybrid", "tiny-whisper"],
        current_backend="hybrid",
        backend_settings={
            "use_hybrid": True,
            "alignment_backend": "qwen3"
        },
        supported_languages=["ja", "en", "zh-cn", "zh-tw", "ko", "ru", "fr"]
    )


@router.get("/config/translation", response_model=TranslationConfigResponse)
async def get_translation_config():
    """Get translation configuration"""
    config_bridge = get_config_bridge()
    translation_config = config_bridge.get_translation_config()
    
    # Import translator mappings
    try:
        from app import TRANSLATOR_SUPPORTED, ONLINE_TRANSLATOR_MAPPING
        
        available_translators = {}
        for translator in TRANSLATOR_SUPPORTED:
            if translator in ONLINE_TRANSLATOR_MAPPING:
                available_translators[translator] = f"Online API: {translator}"
            else:
                available_translators[translator] = translator
    except ImportError:
        available_translators = {
            "不进行翻译": "No translation",
            "gpt-custom": "Custom GPT",
            "sakura-009": "Sakura 0.09",
            "sakura-010": "Sakura 0.10"
        }
    
    return TranslationConfigResponse(
        available_translators=available_translators,
        current_translator=translation_config.get('translator', '不进行翻译'),
        default_target_language='zh-cn',
        translator_settings={
            'gpt_address': translation_config.get('gpt_address', ''),
            'gpt_model': translation_config.get('gpt_model', ''),
            'sakura_file': translation_config.get('sakura_file', ''),
            'sakura_mode': translation_config.get('sakura_mode', 0)
        },
        supported_languages=["ja", "en", "zh-cn", "zh-tw", "ko", "ru", "fr"]
    )


@router.get("/system/status", response_model=SystemStatusResponse)
async def get_system_status():
    """Get system status"""
    import psutil
    import time
    
    # Get memory usage
    memory = psutil.virtual_memory()
    
    # Get disk usage
    disk = psutil.disk_usage('/')
    
    return SystemStatusResponse(
        server_status="running",
        active_tasks=0,  # Will be updated with actual task manager stats
        total_tasks_processed=0,
        uptime=time.time(),
        memory_usage={
            "total": memory.total,
            "available": memory.available,
            "percent": memory.percent
        },
        disk_usage={
            "total": disk.total,
            "free": disk.free,
            "percent": (disk.used / disk.total) * 100
        }
    )


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    gui_integration = get_gui_integration()
    
    components = {
        "api_server": "healthy",
        "task_manager": "healthy",
        "gui_integration": "healthy" if gui_integration.is_initialized() else "initializing"
    }
    
    checks = {
        "database_connection": True,  # No database in this implementation
        "file_system": True,
        "memory": True
    }
    
    return HealthCheckResponse(
        status="healthy",
        version="1.0.0",
        components=components,
        checks=checks
    )
