"""
Comprehensive error handling for VoiceTransl API
"""

import logging
import traceback
from typing import Dict, Any, Optional, Union
from datetime import datetime
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.status import HTTP_500_INTERNAL_SERVER_ERROR

from api.core.exceptions import (
    VoiceTranslException, TranscriptionError, TranslationError,
    TaskNotFoundError, InvalidInputError, ConfigurationError,
    RateLimitError, FileProcessingError
)
from api.services.response_formatter import ResponseFormatter


logger = logging.getLogger(__name__)


class ErrorHandler:
    """Centralized error handling for the API"""
    
    @staticmethod
    async def handle_voicetransl_exception(request: Request, exc: VoiceTranslException) -> JSONResponse:
        """Handle VoiceTransl-specific exceptions"""
        
        error_id = ErrorHandler._generate_error_id()
        
        # Log the error
        logger.error(
            f"VoiceTransl error [{error_id}]: {exc.message}",
            extra={
                "error_id": error_id,
                "error_type": type(exc).__name__,
                "status_code": exc.status_code,
                "detail": exc.detail,
                "request_url": str(request.url),
                "request_method": request.method
            }
        )
        
        # Format error response
        error_response = ResponseFormatter.format_error_response(
            error_message=exc.message,
            error_code=type(exc).__name__,
            details={
                "error_id": error_id,
                "status_code": exc.status_code,
                "detail": exc.detail
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response
        )
    
    @staticmethod
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        
        error_id = ErrorHandler._generate_error_id()
        
        # Log the error
        logger.warning(
            f"HTTP error [{error_id}]: {exc.detail}",
            extra={
                "error_id": error_id,
                "status_code": exc.status_code,
                "request_url": str(request.url),
                "request_method": request.method
            }
        )
        
        # Format error response
        error_response = ResponseFormatter.format_error_response(
            error_message=exc.detail,
            error_code="HTTPException",
            details={
                "error_id": error_id,
                "status_code": exc.status_code
            }
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response
        )
    
    @staticmethod
    async def handle_validation_error(request: Request, exc: Exception) -> JSONResponse:
        """Handle Pydantic validation errors"""
        
        error_id = ErrorHandler._generate_error_id()
        
        # Extract validation error details
        if hasattr(exc, 'errors'):
            validation_errors = {}
            for error in exc.errors():
                field = '.'.join(str(loc) for loc in error['loc'])
                message = error['msg']
                if field not in validation_errors:
                    validation_errors[field] = []
                validation_errors[field].append(message)
        else:
            validation_errors = {"general": [str(exc)]}
        
        # Log the error
        logger.warning(
            f"Validation error [{error_id}]: {validation_errors}",
            extra={
                "error_id": error_id,
                "request_url": str(request.url),
                "request_method": request.method,
                "validation_errors": validation_errors
            }
        )
        
        # Format error response
        error_response = ResponseFormatter.format_validation_error(
            field_errors=validation_errors,
            message="Request validation failed"
        )
        error_response["error_id"] = error_id
        
        return JSONResponse(
            status_code=422,
            content=error_response
        )
    
    @staticmethod
    async def handle_generic_exception(request: Request, exc: Exception) -> JSONResponse:
        """Handle unexpected exceptions"""
        
        error_id = ErrorHandler._generate_error_id()
        
        # Log the full traceback
        logger.error(
            f"Unexpected error [{error_id}]: {str(exc)}",
            extra={
                "error_id": error_id,
                "error_type": type(exc).__name__,
                "request_url": str(request.url),
                "request_method": request.method,
                "traceback": traceback.format_exc()
            }
        )
        
        # Format error response (don't expose internal details in production)
        error_response = ResponseFormatter.format_error_response(
            error_message="An unexpected error occurred",
            error_code="InternalServerError",
            details={
                "error_id": error_id,
                "message": "Please contact support with this error ID"
            }
        )
        
        return JSONResponse(
            status_code=HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response
        )
    
    @staticmethod
    def _generate_error_id() -> str:
        """Generate unique error ID for tracking"""
        from uuid import uuid4
        return str(uuid4())[:8]


class APIErrorLogger:
    """Enhanced logging for API errors and events"""
    
    def __init__(self, logger_name: str = "voicetransl.api"):
        self.logger = logging.getLogger(logger_name)
        self._setup_logger()
    
    def _setup_logger(self):
        """Setup logger with appropriate handlers and formatters"""
        
        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.INFO)
        
        # File handler (if configured)
        try:
            from api.core.config import get_settings
            settings = get_settings()
            
            if settings.log_file:
                file_handler = logging.FileHandler(settings.log_file)
                file_handler.setFormatter(formatter)
                file_handler.setLevel(logging.DEBUG)
                self.logger.addHandler(file_handler)
        
        except Exception:
            pass  # Continue without file logging if configuration fails
        
        self.logger.addHandler(console_handler)
        self.logger.setLevel(logging.DEBUG)
    
    def log_request(self, request: Request, response_status: int, processing_time: float):
        """Log API request details"""
        
        self.logger.info(
            f"{request.method} {request.url.path} - {response_status} - {processing_time:.3f}s",
            extra={
                "request_method": request.method,
                "request_path": request.url.path,
                "request_query": str(request.query_params),
                "response_status": response_status,
                "processing_time": processing_time,
                "client_ip": request.client.host if request.client else "unknown"
            }
        )
    
    def log_task_created(self, task_id: str, task_type: str, input_size: Optional[int] = None):
        """Log task creation"""
        
        self.logger.info(
            f"Task created: {task_id} ({task_type})",
            extra={
                "task_id": task_id,
                "task_type": task_type,
                "input_size": input_size,
                "event": "task_created"
            }
        )
    
    def log_task_completed(self, task_id: str, processing_time: float, success: bool):
        """Log task completion"""
        
        level = logging.INFO if success else logging.ERROR
        status = "completed" if success else "failed"
        
        self.logger.log(
            level,
            f"Task {status}: {task_id} in {processing_time:.3f}s",
            extra={
                "task_id": task_id,
                "processing_time": processing_time,
                "success": success,
                "event": "task_completed"
            }
        )
    
    def log_rate_limit_exceeded(self, client_ip: str, endpoint: str):
        """Log rate limit violations"""
        
        self.logger.warning(
            f"Rate limit exceeded: {client_ip} on {endpoint}",
            extra={
                "client_ip": client_ip,
                "endpoint": endpoint,
                "event": "rate_limit_exceeded"
            }
        )
    
    def log_configuration_change(self, section: str, changes: Dict[str, Any], user: Optional[str] = None):
        """Log configuration changes"""
        
        self.logger.info(
            f"Configuration updated: {section}",
            extra={
                "config_section": section,
                "changes": changes,
                "user": user or "api",
                "event": "config_changed"
            }
        )


# Global error logger instance
_error_logger = None


def get_error_logger() -> APIErrorLogger:
    """Get global error logger instance"""
    global _error_logger
    if _error_logger is None:
        _error_logger = APIErrorLogger()
    return _error_logger


# Error handling middleware
async def error_handling_middleware(request: Request, call_next):
    """Middleware for comprehensive error handling"""
    
    start_time = datetime.utcnow()
    error_logger = get_error_logger()
    
    try:
        # Process request
        response = await call_next(request)
        
        # Log successful request
        processing_time = (datetime.utcnow() - start_time).total_seconds()
        error_logger.log_request(request, response.status_code, processing_time)
        
        return response
        
    except VoiceTranslException as exc:
        return await ErrorHandler.handle_voicetransl_exception(request, exc)
    
    except HTTPException as exc:
        return await ErrorHandler.handle_http_exception(request, exc)
    
    except Exception as exc:
        # Check if it's a validation error
        if hasattr(exc, 'errors') and callable(getattr(exc, 'errors')):
            return await ErrorHandler.handle_validation_error(request, exc)
        else:
            return await ErrorHandler.handle_generic_exception(request, exc)
