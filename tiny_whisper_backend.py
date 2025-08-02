"""
Tiny Whisper Backend for VoiceTransl
Provides rough timestamps using the tiny whisper model from OpenAI
Used in hybrid approach for timestamp alignment
"""

import torch
import logging
import os
import json
from typing import Optional, Dict, Any, List
from transformers import pipeline

class TinyWhisperBackend:
    """
    Tiny Whisper transcription backend for generating rough timestamps
    Used in hybrid approach with anime-whisper for accurate text
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.device = None
        self.torch_dtype = None
        self.pipe = None
        self.model_name = "openai/whisper-tiny"  # Fast, lightweight model
        self.is_initialized = False
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
    def _get_optimal_device(self) -> str:
        """Determine best available device with fallback chain"""
        if torch.cuda.is_available():
            device_count = torch.cuda.device_count()
            self.logger.info(f"CUDA available with {device_count} device(s)")
            return "cuda"
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            self.logger.info("MPS (Apple Silicon) available")
            return "mps"
        else:
            self.logger.info("Using CPU device")
            return "cpu"
    
    def _get_optimal_dtype(self) -> torch.dtype:
        """Select appropriate dtype based on device"""
        if self.device == "cuda":
            return torch.float16  # GPU optimization
        else:
            return torch.float32  # CPU compatibility
    
    def initialize(self) -> bool:
        """Initialize the tiny whisper pipeline with error handling"""
        try:
            self.device = self._get_optimal_device()
            self.torch_dtype = self._get_optimal_dtype()
            
            self.logger.info(f"Initializing tiny-whisper on {self.device} with {self.torch_dtype}")
            
            # Use smaller batch size for tiny model
            batch_size = 32 if self.device == "cuda" else 8
            
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=self.model_name,
                device=self.device,
                torch_dtype=self.torch_dtype,
                batch_size=batch_size,
            )
            
            self.is_initialized = True
            self.logger.info("Tiny-Whisper initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize on {self.device}: {e}")
            # Fallback to CPU if GPU fails
            if self.device != "cpu":
                self.logger.info("Attempting CPU fallback...")
                self.device = "cpu"
                self.torch_dtype = torch.float32
                return self.initialize()
            
            self.logger.error("Failed to initialize tiny-whisper on any device")
            return False
    
    def transcribe_with_timestamps(self, audio_path: str, language: str = "ja", **kwargs) -> Dict[str, Any]:
        """
        Transcribe audio file using tiny whisper with timestamps
        
        Args:
            audio_path: Path to audio file
            language: Language code (default: "ja" for Japanese)
            **kwargs: Additional generation parameters
            
        Returns:
            Dictionary with segments containing timestamps and rough text
        """
        if not self.is_initialized:
            if not self.initialize():
                raise RuntimeError("Failed to initialize tiny-whisper model")
        
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        try:
            # Configure for timestamp generation with proper long-form support
            self.logger.info(f"Transcribing with timestamps: {audio_path}")
            result = self.pipe(
                audio_path,
                return_timestamps=True,  # Essential for getting timestamps
                generate_kwargs={
                    "language": "Japanese" if language == "ja" else language,
                }
            )
            
            # Process result to ensure consistent format
            if isinstance(result, dict) and "chunks" in result:
                segments = []
                for chunk in result["chunks"]:
                    timestamp = chunk.get("timestamp")
                    text = chunk.get("text", "").strip()
                    
                    if timestamp and len(timestamp) == 2 and text:
                        segments.append({
                            "start": timestamp[0],
                            "end": timestamp[1],
                            "text": text
                        })
                
                formatted_result = {
                    "segments": segments,
                    "text": result.get("text", "")
                }
                
                self.logger.info(f"Generated {len(segments)} segments with timestamps")
                return formatted_result
            else:
                # Fallback for unexpected format
                self.logger.warning("Unexpected result format, creating single segment")
                text = result.get("text", str(result)) if isinstance(result, dict) else str(result)
                return {
                    "segments": [{
                        "start": 0.0,
                        "end": 30.0,  # Default duration
                        "text": text.strip()
                    }],
                    "text": text.strip()
                }
                
        except Exception as e:
            self.logger.error(f"Transcription failed: {e}")
            raise
    
    def save_timestamps_json(self, result: Dict[str, Any], output_path: str) -> bool:
        """
        Save transcription result with timestamps to JSON file
        
        Args:
            result: Result from transcribe_with_timestamps
            output_path: Path for output JSON file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Timestamps JSON saved: {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to save JSON: {e}")
            return False
    
    def get_backend_info(self) -> Dict[str, Any]:
        """Get information about the backend"""
        return {
            "name": "tiny-whisper",
            "model": self.model_name,
            "device": self.device,
            "dtype": str(self.torch_dtype) if self.torch_dtype else None,
            "initialized": self.is_initialized,
            "purpose": "Rough timestamps for hybrid alignment",
            "features": [
                "Fast transcription",
                "Reliable timestamps",
                "Lightweight model",
                "Multi-language support"
            ]
        }
    
    def cleanup(self):
        """Clean up resources"""
        if self.pipe:
            del self.pipe
            self.pipe = None
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        self.is_initialized = False
        self.logger.info("Tiny-Whisper backend cleaned up")
