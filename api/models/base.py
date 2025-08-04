"""
Base API models and common data structures
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import uuid


class TaskStatus(str, Enum):
    """Task processing status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskType(str, Enum):
    """Task type enumeration"""
    TRANSCRIPTION = "transcription"
    TRANSLATION = "translation"


class LanguageCode(str, Enum):
    """Supported language codes"""
    JAPANESE = "ja"
    ENGLISH = "en"
    CHINESE_SIMPLIFIED = "zh-cn"
    CHINESE_TRADITIONAL = "zh-tw"
    KOREAN = "ko"
    RUSSIAN = "ru"
    FRENCH = "fr"


class OutputFormat(str, Enum):
    """Supported output formats"""
    LRC = "lrc"
    SRT = "srt"
    JSON = "json"


class BaseResponse(BaseModel):
    """Base response model"""
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseResponse):
    """Error response model"""
    success: bool = False
    error: str
    detail: Optional[str] = None


class TaskMetadata(BaseModel):
    """Task metadata information"""
    duration: Optional[float] = None
    language: Optional[str] = None
    model_used: Optional[str] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskResponse(BaseResponse):
    """Base task response model"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: TaskStatus = TaskStatus.PENDING
    task_type: TaskType
    metadata: Optional[TaskMetadata] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1)
    size: int = Field(default=10, ge=1, le=100)


class PaginatedResponse(BaseResponse):
    """Paginated response model"""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
