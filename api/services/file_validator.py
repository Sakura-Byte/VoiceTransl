"""
File type detection and validation service
"""

import os
import logging
import mimetypes
from typing import Dict, Any, List, Optional, Tuple, Set
from enum import Enum

from api.core.exceptions import InvalidInputError, FileProcessingError


logger = logging.getLogger(__name__)


class MediaType(Enum):
    """Supported media types"""
    AUDIO = "audio"
    VIDEO = "video"
    UNKNOWN = "unknown"


class FileValidator:
    """Validates and analyzes media files for transcription processing"""
    
    # Supported audio formats
    SUPPORTED_AUDIO_EXTENSIONS = {
        '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.opus'
    }
    
    # Supported video formats
    SUPPORTED_VIDEO_EXTENSIONS = {
        '.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'
    }
    
    # Audio MIME types
    AUDIO_MIME_TYPES = {
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/aac', 'audio/mp4', 'audio/m4a', 'audio/ogg', 'audio/vorbis',
        'audio/flac', 'audio/x-flac', 'audio/wma', 'audio/x-ms-wma',
        'audio/opus', 'audio/webm'
    }
    
    # Video MIME types
    VIDEO_MIME_TYPES = {
        'video/mp4', 'video/avi', 'video/x-msvideo', 'video/quicktime',
        'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/mkv',
        'video/x-matroska'
    }
    
    # File signatures (magic numbers) for format detection
    FILE_SIGNATURES = {
        # Audio formats
        b'ID3': 'audio/mp3',
        b'\xff\xfb': 'audio/mp3',
        b'\xff\xf3': 'audio/mp3',
        b'\xff\xf2': 'audio/mp3',
        b'RIFF': 'audio/wav',  # Will check for WAVE later
        b'OggS': 'audio/ogg',
        b'fLaC': 'audio/flac',
        
        # Video formats
        b'\x00\x00\x00\x18ftypmp4': 'video/mp4',
        b'\x00\x00\x00\x20ftypmp4': 'video/mp4',
        b'RIFF': 'video/avi',  # Will check for AVI later
        b'\x1a\x45\xdf\xa3': 'video/mkv',
    }
    
    def __init__(self):
        self.supported_extensions = self.SUPPORTED_AUDIO_EXTENSIONS | self.SUPPORTED_VIDEO_EXTENSIONS
        self.supported_mime_types = self.AUDIO_MIME_TYPES | self.VIDEO_MIME_TYPES
    
    def validate_file(self, file_path: str, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Validate and analyze a media file
        
        Args:
            file_path: Path to the file to validate
            filename: Original filename (optional)
            
        Returns:
            Dict containing validation results and file information
        """
        try:
            if not os.path.exists(file_path):
                raise FileProcessingError(f"File not found: {file_path}")
            
            if not os.path.isfile(file_path):
                raise FileProcessingError(f"Path is not a file: {file_path}")
            
            file_size = os.path.getsize(file_path)
            if file_size == 0:
                raise InvalidInputError("File is empty")
            
            # Detect file type using multiple methods
            detection_results = self._detect_file_type(file_path, filename)
            
            # Validate format support
            is_supported = self._is_format_supported(detection_results)
            
            # Get detailed file information
            file_info = self._get_file_info(file_path, detection_results)
            
            return {
                'is_valid': is_supported,
                'media_type': detection_results['media_type'],
                'detected_format': detection_results['format'],
                'mime_type': detection_results['mime_type'],
                'file_extension': detection_results['extension'],
                'file_size': file_size,
                'file_info': file_info,
                'validation_warnings': detection_results.get('warnings', [])
            }
            
        except Exception as e:
            logger.error(f"File validation failed for {file_path}: {e}")
            raise FileProcessingError(f"File validation failed: {str(e)}")
    
    def validate_by_content_type(self, content_type: str, filename: Optional[str] = None) -> Dict[str, Any]:
        """
        Validate file based on content type and filename
        
        Args:
            content_type: MIME content type
            filename: Original filename (optional)
            
        Returns:
            Dict containing validation results
        """
        try:
            # Clean content type
            clean_content_type = content_type.split(';')[0].strip().lower()
            
            # Determine media type
            if clean_content_type in self.AUDIO_MIME_TYPES:
                media_type = MediaType.AUDIO
            elif clean_content_type in self.VIDEO_MIME_TYPES:
                media_type = MediaType.VIDEO
            else:
                media_type = MediaType.UNKNOWN
            
            # Get extension from filename
            extension = ''
            if filename:
                _, extension = os.path.splitext(filename)
                extension = extension.lower()
            
            # Check if format is supported
            is_supported = (
                clean_content_type in self.supported_mime_types or
                extension in self.supported_extensions
            )
            
            warnings = []
            if not is_supported:
                warnings.append(f"Potentially unsupported format: {clean_content_type}")
            
            return {
                'is_valid': is_supported,
                'media_type': media_type.value,
                'mime_type': clean_content_type,
                'file_extension': extension,
                'validation_warnings': warnings
            }
            
        except Exception as e:
            logger.error(f"Content type validation failed: {e}")
            raise InvalidInputError(f"Invalid content type: {content_type}")
    
    def _detect_file_type(self, file_path: str, filename: Optional[str] = None) -> Dict[str, Any]:
        """Detect file type using multiple methods"""
        
        results = {
            'format': 'unknown',
            'media_type': MediaType.UNKNOWN.value,
            'mime_type': 'application/octet-stream',
            'extension': '',
            'confidence': 0.0,
            'warnings': []
        }
        
        # Method 1: File signature detection
        signature_result = self._detect_by_signature(file_path)
        if signature_result:
            results.update(signature_result)
            results['confidence'] = 0.9
        
        # Method 2: File extension
        extension_result = self._detect_by_extension(file_path, filename)
        if extension_result:
            if results['confidence'] < 0.5:
                results.update(extension_result)
                results['confidence'] = 0.7
            elif extension_result['extension'] != results.get('extension'):
                results['warnings'].append(
                    f"Extension mismatch: signature suggests {results.get('format')}, "
                    f"but extension is {extension_result['extension']}"
                )
        
        # Method 3: MIME type detection
        mime_result = self._detect_by_mime_type(file_path)
        if mime_result and results['confidence'] < 0.3:
            results.update(mime_result)
            results['confidence'] = 0.5
        
        # Method 4: Advanced detection using external libraries
        try:
            advanced_result = self._detect_advanced(file_path)
            if advanced_result and results['confidence'] < 0.8:
                results.update(advanced_result)
                results['confidence'] = 0.95
        except ImportError:
            pass  # Advanced detection not available
        
        return results
    
    def _detect_by_signature(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Detect file type by reading file signature"""
        
        try:
            with open(file_path, 'rb') as f:
                header = f.read(32)  # Read first 32 bytes
            
            # Check for specific signatures
            for signature, mime_type in self.FILE_SIGNATURES.items():
                if header.startswith(signature):
                    # Special handling for RIFF files
                    if signature == b'RIFF':
                        if b'WAVE' in header[:16]:
                            mime_type = 'audio/wav'
                        elif b'AVI ' in header[:16]:
                            mime_type = 'video/avi'
                    
                    media_type = MediaType.AUDIO if mime_type.startswith('audio/') else MediaType.VIDEO
                    extension = mimetypes.guess_extension(mime_type) or ''
                    
                    return {
                        'format': mime_type.split('/')[-1],
                        'media_type': media_type.value,
                        'mime_type': mime_type,
                        'extension': extension
                    }
            
            return None
            
        except Exception as e:
            logger.warning(f"Signature detection failed for {file_path}: {e}")
            return None
    
    def _detect_by_extension(self, file_path: str, filename: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Detect file type by file extension"""
        
        # Use provided filename or extract from path
        name = filename or os.path.basename(file_path)
        _, extension = os.path.splitext(name)
        extension = extension.lower()
        
        if not extension:
            return None
        
        # Determine media type and MIME type
        if extension in self.SUPPORTED_AUDIO_EXTENSIONS:
            media_type = MediaType.AUDIO
            mime_type = mimetypes.guess_type(f"file{extension}")[0] or f"audio/{extension[1:]}"
        elif extension in self.SUPPORTED_VIDEO_EXTENSIONS:
            media_type = MediaType.VIDEO
            mime_type = mimetypes.guess_type(f"file{extension}")[0] or f"video/{extension[1:]}"
        else:
            return None
        
        return {
            'format': extension[1:],  # Remove the dot
            'media_type': media_type.value,
            'mime_type': mime_type,
            'extension': extension
        }
    
    def _detect_by_mime_type(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Detect file type using mimetypes module"""
        
        try:
            mime_type, _ = mimetypes.guess_type(file_path)
            if not mime_type:
                return None
            
            if mime_type in self.AUDIO_MIME_TYPES:
                media_type = MediaType.AUDIO
            elif mime_type in self.VIDEO_MIME_TYPES:
                media_type = MediaType.VIDEO
            else:
                return None
            
            format_name = mime_type.split('/')[-1]
            extension = mimetypes.guess_extension(mime_type) or ''
            
            return {
                'format': format_name,
                'media_type': media_type.value,
                'mime_type': mime_type,
                'extension': extension
            }
            
        except Exception as e:
            logger.warning(f"MIME type detection failed for {file_path}: {e}")
            return None
    
    def _detect_advanced(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Advanced file type detection using external libraries"""
        
        try:
            # Try using python-magic for more accurate detection
            import magic
            
            mime_type = magic.from_file(file_path, mime=True)
            file_type = magic.from_file(file_path)
            
            if mime_type in self.supported_mime_types:
                if mime_type in self.AUDIO_MIME_TYPES:
                    media_type = MediaType.AUDIO
                elif mime_type in self.VIDEO_MIME_TYPES:
                    media_type = MediaType.VIDEO
                else:
                    media_type = MediaType.UNKNOWN
                
                format_name = mime_type.split('/')[-1]
                extension = mimetypes.guess_extension(mime_type) or ''
                
                return {
                    'format': format_name,
                    'media_type': media_type.value,
                    'mime_type': mime_type,
                    'extension': extension,
                    'detailed_type': file_type
                }
            
            return None
            
        except ImportError:
            # python-magic not available
            return None
        except Exception as e:
            logger.warning(f"Advanced detection failed for {file_path}: {e}")
            return None
    
    def _is_format_supported(self, detection_results: Dict[str, Any]) -> bool:
        """Check if the detected format is supported"""
        
        mime_type = detection_results.get('mime_type', '')
        extension = detection_results.get('extension', '')
        
        return (
            mime_type in self.supported_mime_types or
            extension in self.supported_extensions
        )
    
    def _get_file_info(self, file_path: str, detection_results: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed file information"""
        
        info = {
            'file_size': os.path.getsize(file_path),
            'media_type': detection_results.get('media_type', 'unknown')
        }
        
        # Try to get media metadata
        try:
            import mutagen
            
            audio_file = mutagen.File(file_path)
            if audio_file:
                info.update({
                    'duration': getattr(audio_file.info, 'length', None),
                    'bitrate': getattr(audio_file.info, 'bitrate', None),
                    'sample_rate': getattr(audio_file.info, 'sample_rate', None),
                    'channels': getattr(audio_file.info, 'channels', None)
                })
                
                # Add format-specific information
                if hasattr(audio_file.info, 'codec'):
                    info['codec'] = audio_file.info.codec
                
        except (ImportError, Exception) as e:
            logger.debug(f"Could not extract media metadata from {file_path}: {e}")
        
        return info
    
    def get_supported_formats(self) -> Dict[str, List[str]]:
        """Get list of supported formats"""
        
        return {
            'audio_extensions': sorted(list(self.SUPPORTED_AUDIO_EXTENSIONS)),
            'video_extensions': sorted(list(self.SUPPORTED_VIDEO_EXTENSIONS)),
            'audio_mime_types': sorted(list(self.AUDIO_MIME_TYPES)),
            'video_mime_types': sorted(list(self.VIDEO_MIME_TYPES))
        }


# Global file validator instance
_file_validator = None


def get_file_validator() -> FileValidator:
    """Get global file validator instance"""
    global _file_validator
    if _file_validator is None:
        _file_validator = FileValidator()
    return _file_validator
