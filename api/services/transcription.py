"""
Transcription service implementation
Handles audio transcription using existing backends
"""

import os
import tempfile
import logging
import time
from typing import Dict, Any, Optional
from datetime import datetime
import requests

from api.core.config import get_gui_integration
from api.core.exceptions import TranscriptionError, FileProcessingError
from api.models.base import TaskMetadata
from api.models.transcription import LRCEntry


logger = logging.getLogger(__name__)


async def process_transcription_task(task) -> Dict[str, Any]:
    """
    Process a transcription task
    
    Args:
        task: Task object containing input data and metadata
        
    Returns:
        Dict containing transcription results
    """
    start_time = time.time()
    input_data = task.input_data
    
    try:
        # Update task progress
        task.progress = 10.0
        task.current_step = "Initializing transcription"
        
        # Get GUI integration
        gui_integration = get_gui_integration()
        if not gui_integration.is_initialized():
            gui_integration.initialize()
        
        # Prepare audio file
        task.progress = 20.0
        task.current_step = "Preparing audio file"
        
        audio_file_path = await _prepare_audio_file(input_data)
        
        try:
            # Initialize transcription backend
            task.progress = 30.0
            task.current_step = "Initializing transcription backend"
            
            # Get transcription settings from GUI configuration
            gui_config = gui_integration.load_gui_config()
            transcription_config = gui_integration.get_transcription_config()
            
            backend_type = "hybrid" if transcription_config.get("use_hybrid_backend", True) else "anime-whisper"
            backend = await _get_transcription_backend(backend_type, transcription_config)
            
            # Perform transcription
            task.progress = 40.0
            task.current_step = "Transcribing audio"
            
            result = await _transcribe_audio(backend, audio_file_path, input_data, task)
            
            # Process results
            task.progress = 90.0
            task.current_step = "Processing results"
            
            lrc_content, entries = _process_transcription_result(result, input_data)
            
            # Create metadata
            processing_time = time.time() - start_time
            metadata = TaskMetadata(
                duration=result.get('duration'),
                language=input_data.get('language', 'ja'),
                model_used=backend_type,
                processing_time=processing_time,
                file_size=input_data.get('file_size'),
                file_type=input_data.get('content_type')
            )
            
            task.metadata = metadata
            task.progress = 100.0
            task.current_step = "Completed"
            
            return {
                "lrc_content": lrc_content,
                "entries": [entry.dict() for entry in entries],
                "metadata": metadata.dict()
            }
            
        finally:
            # Clean up temporary file
            if audio_file_path and os.path.exists(audio_file_path):
                try:
                    os.unlink(audio_file_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary file {audio_file_path}: {e}")
    
    except Exception as e:
        logger.error(f"Transcription task failed: {e}")
        raise TranscriptionError(f"Transcription failed: {str(e)}")


async def _prepare_audio_file(input_data: Dict[str, Any]) -> str:
    """Prepare audio file from input data"""
    
    if "file_content" in input_data:
        # Handle uploaded file
        file_content = input_data["file_content"]
        filename = input_data.get("filename", "audio")
        
        # Create temporary file
        suffix = os.path.splitext(filename)[1] if filename else ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        input_data["file_size"] = len(file_content)
        return temp_file_path
        
    elif "url" in input_data:
        # Handle URL download
        url = input_data["url"]
        
        try:
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Determine file extension from URL or content type
            content_type = response.headers.get('content-type', '')
            if 'audio' in content_type or 'video' in content_type:
                # Try to get extension from URL
                suffix = os.path.splitext(url.split('?')[0])[1]
                if not suffix:
                    # Default based on content type
                    if 'mp3' in content_type:
                        suffix = '.mp3'
                    elif 'wav' in content_type:
                        suffix = '.wav'
                    elif 'mp4' in content_type:
                        suffix = '.mp4'
                    else:
                        suffix = '.audio'
            else:
                suffix = '.audio'
            
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                file_size = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        temp_file.write(chunk)
                        file_size += len(chunk)
                
                temp_file_path = temp_file.name
            
            input_data["file_size"] = file_size
            input_data["content_type"] = content_type
            return temp_file_path
            
        except Exception as e:
            raise FileProcessingError(f"Failed to download audio from URL: {str(e)}")
    
    else:
        raise FileProcessingError("No valid audio input provided")


async def _get_transcription_backend(backend_type: str, transcription_config: Dict[str, Any]):
    """Get and configure transcription backend"""
    gui_integration = get_gui_integration()
    
    if backend_type == "hybrid":
        # Import and configure hybrid backend
        from backends import HybridTranscriptionBackend
        
        # Get alignment backend from GUI configuration
        alignment_backend = transcription_config.get("alignment_backend", "qwen3")
        config = {"alignment_backend": alignment_backend}
        
        if alignment_backend in ["openai", "gemini"]:
            # Get API configuration from GUI
            api_config = transcription_config.get("api_config", {})
            config.update(api_config)
        
        backend = HybridTranscriptionBackend(config)
        if not backend.initialize():
            raise TranscriptionError("Failed to initialize hybrid transcription backend")
        
        return backend
        
    elif backend_type == "anime-whisper":
        # Get anime-whisper backend from GUI integration
        backend = gui_integration.get_transcription_backend("anime-whisper")
        if not backend:
            raise TranscriptionError("Anime-whisper backend not available")
        
        return backend
        
    else:
        raise TranscriptionError(f"Unknown backend type: {backend_type}")


async def _transcribe_audio(backend, audio_file_path: str, input_data: Dict[str, Any], task) -> Dict[str, Any]:
    """Perform audio transcription"""
    
    language = "ja"  # Always Japanese
    
    # Get transcription settings from GUI configuration
    gui_integration = get_gui_integration()
    transcription_config = gui_integration.get_transcription_config()
    suppress_repetitions = transcription_config.get("suppress_repetitions", False)
    
    try:
        # Update progress during transcription
        task.progress = 50.0
        task.current_step = "Processing audio with AI model"
        
        # Call transcription method based on backend type
        if hasattr(backend, 'transcribe_to_lrc'):
            # For backends that support direct LRC output
            lrc_output_path = audio_file_path + '.lrc'
            success = backend.transcribe_to_lrc(
                audio_file_path,
                lrc_output_path,
                language=language,
                suppress_repetitions=suppress_repetitions
            )
            
            if success and os.path.exists(lrc_output_path):
                with open(lrc_output_path, 'r', encoding='utf-8') as f:
                    lrc_content = f.read()
                
                # Clean up LRC file
                os.unlink(lrc_output_path)
                
                return {
                    "lrc_content": lrc_content,
                    "format": "lrc"
                }
            else:
                raise TranscriptionError("Transcription failed to produce output")
                
        elif hasattr(backend, 'transcribe_to_srt'):
            # For backends that support SRT output
            srt_output_path = audio_file_path + '.srt'
            success = backend.transcribe_to_srt(
                audio_file_path,
                srt_output_path,
                language=language,
                suppress_repetitions=suppress_repetitions
            )
            
            if success and os.path.exists(srt_output_path):
                with open(srt_output_path, 'r', encoding='utf-8') as f:
                    srt_content = f.read()
                
                # Clean up SRT file
                os.unlink(srt_output_path)
                
                # Convert SRT to LRC format
                lrc_content = _convert_srt_to_lrc(srt_content)
                
                return {
                    "lrc_content": lrc_content,
                    "format": "lrc"
                }
            else:
                raise TranscriptionError("Transcription failed to produce output")
                
        else:
            raise TranscriptionError("Backend does not support required transcription methods")
            
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise TranscriptionError(f"Audio transcription failed: {str(e)}")


def _convert_srt_to_lrc(srt_content: str) -> str:
    """Convert SRT format to LRC format"""
    try:
        import pysrt
        
        # Parse SRT content
        subs = pysrt.from_string(srt_content)
        
        # Convert to LRC format
        lrc_lines = []
        for sub in subs:
            start_seconds = sub.start.total_seconds()
            minutes = int(start_seconds // 60)
            seconds = start_seconds % 60
            
            # Format: [mm:ss.xx]text
            lrc_line = f"[{minutes:02d}:{seconds:05.2f}]{sub.text}"
            lrc_lines.append(lrc_line)
        
        return '\n'.join(lrc_lines)
        
    except Exception as e:
        logger.error(f"SRT to LRC conversion failed: {e}")
        # Fallback: return original content
        return srt_content


def _process_transcription_result(result: Dict[str, Any], input_data: Dict[str, Any]) -> tuple:
    """Process transcription result into LRC content and entries"""
    
    lrc_content = result.get("lrc_content", "")
    if not lrc_content:
        raise TranscriptionError("No transcription content generated")
    
    # Parse LRC content into entries
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
                    
                    # Estimate end time (will be updated with actual values if available)
                    end_time = start_time + 3.0  # Default 3 second duration
                    
                    entry = LRCEntry(
                        start=start_time,
                        end=end_time,
                        text=text
                    )
                    entries.append(entry)
        
        except Exception as e:
            logger.warning(f"Failed to parse LRC line '{line}': {e}")
            continue
    
    # Update end times based on next entry start times
    for i in range(len(entries) - 1):
        entries[i].end = entries[i + 1].start
    
    return lrc_content, entries
