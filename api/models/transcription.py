"""
Transcription API models
"""

from typing import Optional, Union, List, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, validator
from fastapi import UploadFile

from .base import (
    BaseResponse, TaskResponse, TaskType, LanguageCode, 
    OutputFormat, TaskMetadata
)


class TranscriptionRequest(BaseModel):
    """Transcription request model"""
    # Input can be either URL or will be handled as binary upload
    url: Optional[HttpUrl] = None
    
    # Processing options - language is always Japanese, other settings from GUI
    output_format: OutputFormat = OutputFormat.LRC


class LRCEntry(BaseModel):
    """LRC format entry"""
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds") 
    text: str = Field(..., description="Transcribed text")


class TranscriptionResult(BaseModel):
    """Transcription result data"""
    lrc_content: str = Field(..., description="LRC format content")
    entries: List[LRCEntry] = Field(..., description="Parsed LRC entries")
    metadata: TaskMetadata


class TranscriptionResponse(TaskResponse):
    """Transcription response model"""
    task_type: TaskType = TaskType.TRANSCRIPTION
    result: Optional[TranscriptionResult] = None


class TranscriptionStatusResponse(BaseResponse):
    """Transcription status response"""
    task_id: str
    status: str
    progress: Optional[float] = None
    current_step: Optional[str] = None
    estimated_time_remaining: Optional[float] = None
    metadata: Optional[TaskMetadata] = None


class TranscriptionListResponse(BaseResponse):
    """List of transcription tasks response"""
    tasks: List[TranscriptionResponse]
    total: int
    page: int
    size: int
