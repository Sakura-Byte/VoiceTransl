"""
Configuration API models
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field

from .base import BaseResponse, LanguageCode


class ServerConfigResponse(BaseResponse):
    """Server configuration response"""
    host: str
    port: int
    max_concurrent_tasks: int
    rate_limit_requests: int
    rate_limit_window: int
    max_file_size: int
    supported_formats: List[str]
    version: str


class TranscriptionConfigResponse(BaseResponse):
    """Transcription configuration response"""
    default_language: LanguageCode
    default_output_format: str
    available_backends: List[str]
    current_backend: str
    backend_settings: Dict[str, Any]
    supported_languages: List[str]


class TranslationConfigResponse(BaseResponse):
    """Translation configuration response"""
    available_translators: Dict[str, str]
    current_translator: str
    default_target_language: LanguageCode
    translator_settings: Dict[str, Any]
    supported_languages: List[str]


class ConfigUpdateRequest(BaseModel):
    """Configuration update request"""
    transcription: Optional[Dict[str, Any]] = None
    translation: Optional[Dict[str, Any]] = None
    server: Optional[Dict[str, Any]] = None


class ConfigUpdateResponse(BaseResponse):
    """Configuration update response"""
    updated_sections: List[str]
    restart_required: bool = False
    warnings: Optional[List[str]] = None


class SystemStatusResponse(BaseResponse):
    """System status response"""
    server_status: str
    active_tasks: int
    total_tasks_processed: int
    uptime: float
    memory_usage: Optional[Dict[str, Any]] = None
    disk_usage: Optional[Dict[str, Any]] = None
    gpu_status: Optional[Dict[str, Any]] = None


class HealthCheckResponse(BaseResponse):
    """Health check response"""
    status: str = "healthy"
    version: str
    components: Dict[str, str]  # component_name -> status
    checks: Dict[str, bool]     # check_name -> passed
