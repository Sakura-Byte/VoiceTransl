"""
Input processing service for handling URLs and binary data
"""

import os
import tempfile
import logging
import mimetypes
import hashlib
from typing import Dict, Any, Optional, Tuple, BinaryIO
from urllib.parse import urlparse
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from api.core.config import get_settings
from api.core.exceptions import FileProcessingError, InvalidInputError


logger = logging.getLogger(__name__)


class InputProcessor:
    """Handles processing of various input types for transcription and translation"""
    
    def __init__(self):
        self.settings = get_settings()
        self.temp_dir = self.settings.temp_dir
        self.max_file_size = self.settings.max_file_size
        
        # Ensure temp directory exists
        os.makedirs(self.temp_dir, exist_ok=True)
        
        # Configure requests session with retry strategy
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
    
    async def process_url_input(self, url: str, max_size: Optional[int] = None) -> Dict[str, Any]:
        """
        Process URL input and download file
        
        Args:
            url: URL to download
            max_size: Maximum file size in bytes (defaults to settings max_file_size)
            
        Returns:
            Dict containing file info and temporary file path
        """
        if max_size is None:
            max_size = self.max_file_size
        
        try:
            # Validate URL
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                raise InvalidInputError(f"Invalid URL format: {url}")
            
            if parsed_url.scheme not in ['http', 'https']:
                raise InvalidInputError(f"Unsupported URL scheme: {parsed_url.scheme}")
            
            logger.info(f"Downloading file from URL: {url}")
            
            # Make HEAD request first to check content type and size
            head_response = self.session.head(url, timeout=10, allow_redirects=True)
            
            content_type = head_response.headers.get('content-type', '').lower()
            content_length = head_response.headers.get('content-length')
            
            # Validate content type
            if not self._is_valid_media_type(content_type):
                logger.warning(f"Potentially unsupported content type: {content_type}")
            
            # Check file size
            if content_length:
                file_size = int(content_length)
                if file_size > max_size:
                    raise FileProcessingError(
                        f"File too large: {file_size} bytes (max: {max_size} bytes)"
                    )
            
            # Download file
            response = self.session.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            # Determine file extension
            file_extension = self._get_file_extension(url, content_type)
            
            # Create temporary file
            temp_file_path = self._create_temp_file(file_extension)
            
            # Download with size checking
            downloaded_size = 0
            with open(temp_file_path, 'wb') as temp_file:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        downloaded_size += len(chunk)
                        if downloaded_size > max_size:
                            # Clean up and raise error
                            os.unlink(temp_file_path)
                            raise FileProcessingError(
                                f"File too large: {downloaded_size} bytes (max: {max_size} bytes)"
                            )
                        temp_file.write(chunk)
            
            # Validate downloaded file
            file_info = self._analyze_file(temp_file_path)
            
            return {
                'temp_file_path': temp_file_path,
                'original_url': url,
                'file_size': downloaded_size,
                'content_type': content_type,
                'file_extension': file_extension,
                'file_info': file_info
            }
            
        except requests.RequestException as e:
            raise FileProcessingError(f"Failed to download file from URL: {str(e)}")
        except Exception as e:
            raise FileProcessingError(f"Error processing URL input: {str(e)}")
    
    async def process_binary_input(
        self, 
        file_content: bytes, 
        filename: Optional[str] = None,
        content_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process binary file input
        
        Args:
            file_content: Binary file content
            filename: Original filename (optional)
            content_type: MIME content type (optional)
            
        Returns:
            Dict containing file info and temporary file path
        """
        try:
            # Validate file size
            file_size = len(file_content)
            if file_size > self.max_file_size:
                raise FileProcessingError(
                    f"File too large: {file_size} bytes (max: {self.max_file_size} bytes)"
                )
            
            if file_size == 0:
                raise InvalidInputError("Empty file provided")
            
            # Determine file extension
            file_extension = self._get_file_extension(filename, content_type)
            
            # Create temporary file
            temp_file_path = self._create_temp_file(file_extension)
            
            # Write content to temporary file
            with open(temp_file_path, 'wb') as temp_file:
                temp_file.write(file_content)
            
            # Analyze file
            file_info = self._analyze_file(temp_file_path)
            
            return {
                'temp_file_path': temp_file_path,
                'original_filename': filename,
                'file_size': file_size,
                'content_type': content_type,
                'file_extension': file_extension,
                'file_info': file_info
            }
            
        except Exception as e:
            raise FileProcessingError(f"Error processing binary input: {str(e)}")
    
    def _is_valid_media_type(self, content_type: str) -> bool:
        """Check if content type is a valid media type"""
        if not content_type:
            return True  # Allow unknown types
        
        valid_types = [
            'audio/', 'video/', 'application/octet-stream',
            'application/ogg', 'application/x-wav'
        ]
        
        return any(content_type.startswith(vtype) for vtype in valid_types)
    
    def _get_file_extension(self, filename: Optional[str], content_type: Optional[str]) -> str:
        """Determine appropriate file extension"""
        
        # Try to get extension from filename
        if filename:
            _, ext = os.path.splitext(filename)
            if ext:
                return ext.lower()
        
        # Try to get extension from content type
        if content_type:
            ext = mimetypes.guess_extension(content_type.split(';')[0])
            if ext:
                return ext.lower()
        
        # Default extension
        return '.audio'
    
    def _create_temp_file(self, extension: str) -> str:
        """Create a temporary file with given extension"""
        
        # Generate unique filename
        temp_fd, temp_path = tempfile.mkstemp(
            suffix=extension,
            dir=self.temp_dir,
            prefix='voicetransl_'
        )
        
        # Close the file descriptor (we'll open it later)
        os.close(temp_fd)
        
        return temp_path
    
    def _analyze_file(self, file_path: str) -> Dict[str, Any]:
        """Analyze file and extract metadata"""
        
        try:
            file_info = {
                'file_size': os.path.getsize(file_path),
                'file_type': 'unknown'
            }
            
            # Try to determine file type using file command (if available)
            try:
                import magic
                file_info['mime_type'] = magic.from_file(file_path, mime=True)
                file_info['file_type'] = magic.from_file(file_path)
            except ImportError:
                # Fallback to basic analysis
                with open(file_path, 'rb') as f:
                    header = f.read(16)
                    file_info['file_type'] = self._detect_file_type_from_header(header)
            
            # Try to get audio/video metadata
            try:
                import mutagen
                audio_file = mutagen.File(file_path)
                if audio_file:
                    file_info['duration'] = getattr(audio_file.info, 'length', None)
                    file_info['bitrate'] = getattr(audio_file.info, 'bitrate', None)
                    file_info['sample_rate'] = getattr(audio_file.info, 'sample_rate', None)
                    file_info['channels'] = getattr(audio_file.info, 'channels', None)
            except (ImportError, Exception):
                # Metadata extraction failed, continue without it
                pass
            
            return file_info
            
        except Exception as e:
            logger.warning(f"Failed to analyze file {file_path}: {e}")
            return {'file_size': os.path.getsize(file_path), 'file_type': 'unknown'}
    
    def _detect_file_type_from_header(self, header: bytes) -> str:
        """Detect file type from file header"""
        
        if header.startswith(b'ID3') or header[6:10] == b'ftyp':
            return 'audio'
        elif header.startswith(b'RIFF') and b'WAVE' in header:
            return 'audio/wav'
        elif header.startswith(b'OggS'):
            return 'audio/ogg'
        elif header.startswith(b'\xff\xfb') or header.startswith(b'\xff\xf3') or header.startswith(b'\xff\xf2'):
            return 'audio/mp3'
        elif header.startswith(b'fLaC'):
            return 'audio/flac'
        elif header[4:8] == b'ftyp':
            return 'video/mp4'
        else:
            return 'unknown'
    
    def cleanup_temp_file(self, file_path: str) -> bool:
        """Clean up temporary file"""
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
                logger.debug(f"Cleaned up temporary file: {file_path}")
                return True
        except Exception as e:
            logger.error(f"Failed to clean up temporary file {file_path}: {e}")
        return False
    
    def get_file_hash(self, file_path: str) -> str:
        """Generate SHA-256 hash of file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Failed to generate hash for {file_path}: {e}")
            return ""


# Global input processor instance
_input_processor = None


def get_input_processor() -> InputProcessor:
    """Get global input processor instance"""
    global _input_processor
    if _input_processor is None:
        _input_processor = InputProcessor()
    return _input_processor
