"""
Translation API models
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator

from .base import (
    BaseResponse, TaskResponse, TaskType, LanguageCode, 
    TaskMetadata
)


class TranslationRequest(BaseModel):
    """Translation request model"""
    lrc_content: str = Field(..., description="LRC format content to translate")
    
    # Translation options - source language is always Japanese
    target_language: LanguageCode = LanguageCode.CHINESE_SIMPLIFIED
    
    # Translator selection (will use GUI-configured translator by default)
    translator: Optional[str] = None
    
    # Custom translation settings (optional override)
    translation_config: Optional[Dict[str, Any]] = None
    
    @validator('lrc_content')
    def validate_lrc_content(cls, v):
        """Validate LRC content format"""
        if not v.strip():
            raise ValueError("LRC content cannot be empty")
        
        # Basic LRC format validation
        lines = v.strip().split('\n')
        has_timestamp = False
        
        for line in lines:
            line = line.strip()
            if line.startswith('[') and ']' in line:
                has_timestamp = True
                break
        
        if not has_timestamp:
            raise ValueError("Invalid LRC format: no timestamps found")
        
        return v
    
    @validator('target_language')
    def validate_different_languages(cls, v):
        """Ensure target language is not Japanese (source is always ja)"""
        if v == LanguageCode.JAPANESE:
            raise ValueError("Target language cannot be Japanese (source is always Japanese)")
        return v


class TranslationEntry(BaseModel):
    """Translation entry with original and translated text"""
    start: float = Field(..., description="Start time in seconds")
    end: float = Field(..., description="End time in seconds")
    original_text: str = Field(..., description="Original text")
    translated_text: str = Field(..., description="Translated text")
    confidence: Optional[float] = Field(None, description="Translation confidence score")


class TranslationResult(BaseModel):
    """Translation result data"""
    lrc_content: str = Field(..., description="Translated LRC format content")
    entries: List[TranslationEntry] = Field(..., description="Translation entries")
    metadata: TaskMetadata
    
    # Translation statistics
    total_entries: int = Field(..., description="Total number of translated entries")
    successful_translations: int = Field(..., description="Number of successful translations")
    failed_translations: int = Field(default=0, description="Number of failed translations")


class TranslationResponse(TaskResponse):
    """Translation response model"""
    task_type: TaskType = TaskType.TRANSLATION
    result: Optional[TranslationResult] = None


class TranslationStatusResponse(BaseResponse):
    """Translation status response"""
    task_id: str
    status: str
    progress: Optional[float] = None
    current_entry: Optional[int] = None
    total_entries: Optional[int] = None
    estimated_time_remaining: Optional[float] = None
    metadata: Optional[TaskMetadata] = None


class TranslationListResponse(BaseResponse):
    """List of translation tasks response"""
    tasks: List[TranslationResponse]
    total: int
    page: int
    size: int


class SupportedTranslatorsResponse(BaseResponse):
    """Supported translators response"""
    translators: Dict[str, str] = Field(..., description="Available translators with descriptions")
    current_translator: Optional[str] = Field(None, description="Currently configured translator")


class TranslationConfigResponse(BaseResponse):
    """Translation configuration response"""
    translator: str
    target_language: str
    api_settings: Optional[Dict[str, Any]] = None
    model_settings: Optional[Dict[str, Any]] = None
