"""
Response formatting service for standardizing API responses
"""

import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from enum import Enum

from api.models.base import TaskStatus, TaskType, TaskMetadata
from api.models.transcription import TranscriptionResult, LRCEntry
from api.models.translation import TranslationResult, TranslationEntry


logger = logging.getLogger(__name__)


class ResponseFormatter:
    """Formats API responses into standardized JSON structures"""
    
    @staticmethod
    def format_task_response(
        task_id: str,
        task_type: TaskType,
        status: TaskStatus,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
        metadata: Optional[TaskMetadata] = None,
        progress: Optional[float] = None,
        current_step: Optional[str] = None
    ) -> Dict[str, Any]:
        """Format a standardized task response"""
        
        response = {
            "task_id": task_id,
            "task_type": task_type.value,
            "status": status.value,
            "timestamp": datetime.utcnow().isoformat(),
            "success": status != TaskStatus.FAILED
        }
        
        # Add progress information if available
        if progress is not None:
            response["progress"] = progress
        
        if current_step:
            response["current_step"] = current_step
        
        # Add result if completed successfully
        if status == TaskStatus.COMPLETED and result:
            response["result"] = result
        
        # Add error information if failed
        if status == TaskStatus.FAILED and error:
            response["error"] = error
        
        # Add metadata if available
        if metadata:
            response["metadata"] = ResponseFormatter._format_metadata(metadata)
        
        return response
    
    @staticmethod
    def format_transcription_result(
        lrc_content: str,
        entries: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format transcription result"""
        
        # Parse entries into LRCEntry objects for validation
        lrc_entries = []
        for entry in entries:
            try:
                lrc_entry = LRCEntry(
                    start=entry.get('start', 0.0),
                    end=entry.get('end', 0.0),
                    text=entry.get('text', '')
                )
                lrc_entries.append(lrc_entry.dict())
            except Exception as e:
                logger.warning(f"Invalid LRC entry: {entry}, error: {e}")
                continue
        
        return {
            "lrc_content": lrc_content,
            "entries": lrc_entries,
            "entry_count": len(lrc_entries),
            "total_duration": ResponseFormatter._calculate_total_duration(lrc_entries),
            "metadata": metadata
        }
    
    @staticmethod
    def format_translation_result(
        lrc_content: str,
        entries: List[Dict[str, Any]],
        metadata: Dict[str, Any],
        total_entries: int,
        successful_translations: int,
        failed_translations: int
    ) -> Dict[str, Any]:
        """Format translation result"""
        
        # Parse entries into TranslationEntry objects for validation
        translation_entries = []
        for entry in entries:
            try:
                translation_entry = TranslationEntry(
                    start=entry.get('start', 0.0),
                    end=entry.get('end', 0.0),
                    original_text=entry.get('original_text', ''),
                    translated_text=entry.get('translated_text', ''),
                    confidence=entry.get('confidence', 0.0)
                )
                translation_entries.append(translation_entry.dict())
            except Exception as e:
                logger.warning(f"Invalid translation entry: {entry}, error: {e}")
                continue
        
        return {
            "lrc_content": lrc_content,
            "entries": translation_entries,
            "statistics": {
                "total_entries": total_entries,
                "successful_translations": successful_translations,
                "failed_translations": failed_translations,
                "success_rate": (successful_translations / total_entries * 100) if total_entries > 0 else 0
            },
            "total_duration": ResponseFormatter._calculate_total_duration(translation_entries),
            "metadata": metadata
        }
    
    @staticmethod
    def format_error_response(
        error_message: str,
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Format error response"""
        
        response = {
            "success": False,
            "error": error_message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if error_code:
            response["error_code"] = error_code
        
        if details:
            response["details"] = details
        
        if task_id:
            response["task_id"] = task_id
        
        return response
    
    @staticmethod
    def format_status_response(
        task_id: str,
        status: str,
        progress: Optional[float] = None,
        current_step: Optional[str] = None,
        estimated_time_remaining: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Format task status response"""
        
        response = {
            "task_id": task_id,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if progress is not None:
            response["progress"] = {
                "percentage": progress,
                "stage": current_step or "processing"
            }
        
        if estimated_time_remaining is not None:
            response["estimated_time_remaining"] = estimated_time_remaining
        
        if metadata:
            response["metadata"] = metadata
        
        if additional_info:
            response.update(additional_info)
        
        return response
    
    @staticmethod
    def format_list_response(
        items: List[Dict[str, Any]],
        total: int,
        page: int = 1,
        size: int = 10,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Format paginated list response"""
        
        pages = (total + size - 1) // size  # Ceiling division
        
        response = {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "size": size,
                "pages": pages,
                "has_next": page < pages,
                "has_prev": page > 1
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if filters:
            response["filters"] = filters
        
        return response
    
    @staticmethod
    def format_config_response(
        config_data: Dict[str, Any],
        config_type: str = "general"
    ) -> Dict[str, Any]:
        """Format configuration response"""
        
        return {
            "config_type": config_type,
            "config": config_data,
            "timestamp": datetime.utcnow().isoformat(),
            "success": True
        }
    
    @staticmethod
    def format_health_response(
        status: str = "healthy",
        components: Optional[Dict[str, str]] = None,
        checks: Optional[Dict[str, bool]] = None,
        version: str = "1.0.0"
    ) -> Dict[str, Any]:
        """Format health check response"""
        
        response = {
            "status": status,
            "version": version,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if components:
            response["components"] = components
        
        if checks:
            response["checks"] = checks
            response["all_checks_passed"] = all(checks.values())
        
        return response
    
    @staticmethod
    def _format_metadata(metadata: Union[TaskMetadata, Dict[str, Any]]) -> Dict[str, Any]:
        """Format metadata for response"""
        
        if isinstance(metadata, TaskMetadata):
            return metadata.dict()
        elif isinstance(metadata, dict):
            return metadata
        else:
            return {}
    
    @staticmethod
    def _calculate_total_duration(entries: List[Dict[str, Any]]) -> float:
        """Calculate total duration from entries"""
        
        if not entries:
            return 0.0
        
        try:
            # Find the maximum end time
            max_end = max(entry.get('end', 0.0) for entry in entries)
            return max_end
        except (ValueError, TypeError):
            return 0.0
    
    @staticmethod
    def format_validation_error(
        field_errors: Dict[str, List[str]],
        message: str = "Validation failed"
    ) -> Dict[str, Any]:
        """Format validation error response"""
        
        return {
            "success": False,
            "error": message,
            "validation_errors": field_errors,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def format_success_message(
        message: str,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Format simple success message response"""
        
        response = {
            "success": True,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if data:
            response["data"] = data
        
        return response


# Utility functions for common formatting tasks

def format_lrc_content(entries: List[Dict[str, Any]]) -> str:
    """Convert entries to LRC format string"""
    
    lrc_lines = []
    
    for entry in entries:
        try:
            start = entry.get('start', 0.0)
            text = entry.get('translated_text') or entry.get('text', '')
            
            if text:
                minutes = int(start // 60)
                seconds = start % 60
                lrc_line = f"[{minutes:02d}:{seconds:05.2f}]{text}"
                lrc_lines.append(lrc_line)
        
        except Exception as e:
            logger.warning(f"Failed to format LRC entry: {entry}, error: {e}")
            continue
    
    return '\n'.join(lrc_lines)


def parse_lrc_content(lrc_content: str) -> List[Dict[str, Any]]:
    """Parse LRC content string into entries"""
    
    entries = []
    lines = lrc_content.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        if not line or not line.startswith('['):
            continue
        
        try:
            # Parse LRC format: [mm:ss.xx]text
            bracket_end = line.find(']')
            if bracket_end == -1:
                continue
            
            time_str = line[1:bracket_end]
            text = line[bracket_end + 1:].strip()
            
            if not text:
                continue
            
            # Parse time
            if ':' in time_str:
                parts = time_str.split(':')
                if len(parts) == 2:
                    minutes = float(parts[0])
                    seconds = float(parts[1])
                    start_time = minutes * 60 + seconds
                    
                    entries.append({
                        'start': start_time,
                        'end': start_time + 3.0,  # Default duration
                        'text': text
                    })
        
        except Exception as e:
            logger.warning(f"Failed to parse LRC line '{line}': {e}")
            continue
    
    # Update end times based on next entry start times
    for i in range(len(entries) - 1):
        entries[i]['end'] = entries[i + 1]['start']
    
    return entries
