"""
Custom exceptions for VoiceTransl API
"""

from typing import Optional


class VoiceTranslException(Exception):
    """Base exception for VoiceTransl API"""
    
    def __init__(
        self, 
        message: str, 
        status_code: int = 500, 
        detail: Optional[str] = None
    ):
        self.message = message
        self.status_code = status_code
        self.detail = detail
        super().__init__(self.message)


class TranscriptionError(VoiceTranslException):
    """Exception raised during transcription process"""
    
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(message, status_code=422, detail=detail)


class TranslationError(VoiceTranslException):
    """Exception raised during translation process"""
    
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(message, status_code=422, detail=detail)


class TaskNotFoundError(VoiceTranslException):
    """Exception raised when task is not found"""
    
    def __init__(self, task_id: str):
        super().__init__(
            f"Task not found: {task_id}", 
            status_code=404, 
            detail=f"No task found with ID {task_id}"
        )


class InvalidInputError(VoiceTranslException):
    """Exception raised for invalid input data"""
    
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(message, status_code=400, detail=detail)


class ConfigurationError(VoiceTranslException):
    """Exception raised for configuration issues"""
    
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(message, status_code=500, detail=detail)


class RateLimitError(VoiceTranslException):
    """Exception raised when rate limit is exceeded"""
    
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(message, status_code=429, detail="Too many requests")


class FileProcessingError(VoiceTranslException):
    """Exception raised during file processing"""
    
    def __init__(self, message: str, detail: Optional[str] = None):
        super().__init__(message, status_code=422, detail=detail)
