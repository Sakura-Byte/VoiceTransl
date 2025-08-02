"""
Anime-Whisper Backend for VoiceTransl
Provides offline transcription using the anime-whisper model from Hugging Face
"""

import torch
import logging
import os
import json
from typing import Optional, Dict, Any
from transformers import pipeline
import pysrt
from datetime import timedelta

class AnimeWhisperBackend:
    """
    Anime-Whisper transcription backend with GPU acceleration and CPU fallback
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.device = None
        self.torch_dtype = None
        self.pipe = None
        self.model_name = "litagin/anime-whisper"
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
        """Initialize the anime-whisper pipeline with error handling"""
        try:
            self.device = self._get_optimal_device()
            self.torch_dtype = self._get_optimal_dtype()
            
            self.logger.info(f"Initializing anime-whisper on {self.device} with {self.torch_dtype}")
            
            # Adjust batch size based on device
            batch_size = 64 if self.device == "cuda" else 16
            
            # Use chunk_length_s to avoid long-form generation issues for text-only transcription
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=self.model_name,
                device=self.device,
                torch_dtype=self.torch_dtype,
                batch_size=batch_size,
                chunk_length_s=30,  # Process in 30-second chunks to avoid long-form issues
            )
            
            self.is_initialized = True
            self.logger.info("Anime-Whisper initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize on {self.device}: {e}")
            # Fallback to CPU if GPU fails
            if self.device != "cpu":
                self.logger.info("Attempting CPU fallback...")
                self.device = "cpu"
                self.torch_dtype = torch.float32
                return self.initialize()
            
            self.logger.error("Failed to initialize anime-whisper on any device")
            return False
    
    def transcribe(self, audio_path: str, language: str = "ja", **kwargs) -> str:
        """
        Transcribe audio file using anime-whisper
        
        Args:
            audio_path: Path to audio file
            language: Language code (default: "ja" for Japanese)
            **kwargs: Additional generation parameters
            
        Returns:
            Transcribed text
        """
        if not self.is_initialized:
            if not self.initialize():
                raise RuntimeError("Failed to initialize anime-whisper model")
        
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        try:
            # Merge default generate_kwargs with user overrides
            generate_kwargs = {
                "language": "Japanese",  # Anime-whisper is specialized for Japanese
                "no_repeat_ngram_size": kwargs.get("no_repeat_ngram_size", 0),
                "repetition_penalty": kwargs.get("repetition_penalty", 1.0),
            }
            
            # Handle repetitive hallucinations if requested
            if kwargs.get("suppress_repetitions", False):
                generate_kwargs["no_repeat_ngram_size"] = 5
                generate_kwargs["repetition_penalty"] = 1.1
            
            self.logger.info(f"Transcribing: {audio_path}")
            # For long audio files, we need to explicitly disable timestamps to avoid errors
            result = self.pipe(
                audio_path,
                return_timestamps=False,  # Explicitly disable timestamps for text-only transcription
                generate_kwargs=generate_kwargs
            )
            
            transcription = result["text"] if isinstance(result, dict) else str(result)
            self.logger.info("Transcription completed successfully")
            
            return transcription
            
        except Exception as e:
            self.logger.error(f"Transcription failed: {e}")
            raise
    
    def _seconds_to_srt_time(self, seconds: Optional[float]) -> str:
        """Convert seconds to SRT time format (HH:MM:SS,mmm) with robust handling"""
        if seconds is None:
            self.logger.warning("Timestamp is None, defaulting to 0.0")
            seconds = 0.0
        
        # Ensure seconds is a float
        try:
            seconds = float(seconds)
        except (ValueError, TypeError):
            self.logger.error(f"Invalid timestamp value: {seconds}, defaulting to 0.0")
            seconds = 0.0

        # Create a timedelta object and format it
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours, remainder = divmod(total_seconds, 3600)
        minutes, secs = divmod(remainder, 60)
        milliseconds = td.microseconds // 1000
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"

    def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds"""
        try:
            import torchaudio
            info = torchaudio.info(audio_path)
            return info.num_frames / info.sample_rate
        except Exception as e:
            self.logger.warning(f"Could not get audio duration: {e}")
            return 0.0

    def _estimate_realistic_duration(self, text: str, language: str = "ja") -> float:
        """
        Estimate realistic duration for text based on character count and speaking rate.

        Args:
            text: The text to estimate duration for
            language: Language code (ja for Japanese)

        Returns:
            Estimated duration in seconds
        """
        if not text.strip():
            return 0.0

        # Character count (excluding whitespace)
        char_count = len(text.replace(" ", "").replace("\n", ""))

        if language == "ja":
            # Japanese speaking rates (characters per second)
            # Normal conversation: 4-6 chars/sec, we'll use 4.5 as conservative estimate
            chars_per_second = 4.5
        else:
            # For other languages, use a more conservative estimate
            chars_per_second = 3.0

        estimated_duration = char_count / chars_per_second

        # Minimum duration of 0.5 seconds for any non-empty text
        return max(0.5, estimated_duration)

    def _is_timestamp_realistic(self, text: str, start_time: float, end_time: float, language: str = "ja") -> bool:
        """
        Check if timestamp duration is realistic for the given text.

        Args:
            text: The text content
            start_time: Start timestamp in seconds
            end_time: End timestamp in seconds
            language: Language code

        Returns:
            True if timestamp seems realistic, False otherwise
        """
        if start_time is None or end_time is None:
            return False

        actual_duration = end_time - start_time
        estimated_duration = self._estimate_realistic_duration(text, language)

        # Consider realistic if actual duration is at least 30% of estimated duration
        # This allows for faster speech but catches obviously wrong timestamps
        min_realistic_duration = estimated_duration * 0.3

        return actual_duration >= min_realistic_duration

    def transcribe_to_srt(self, audio_path: str, output_path: str, language: str = "ja", **kwargs) -> bool:
        """
        Transcribe audio and save as SRT file with improved timestamp handling.
        This version fixes issues with missing end timestamps and provides better fallback logic.
        """
        try:
            if not self.is_initialized:
                if not self.initialize():
                    raise RuntimeError("Failed to initialize anime-whisper model")

            if not os.path.exists(audio_path):
                raise FileNotFoundError(f"Audio file not found: {audio_path}")

            audio_duration = self._get_audio_duration(audio_path)

            generate_kwargs = {
                "language": "Japanese",
                "no_repeat_ngram_size": kwargs.get("no_repeat_ngram_size", 0),
                "repetition_penalty": kwargs.get("repetition_penalty", 1.0),
            }
            if kwargs.get("suppress_repetitions", False):
                generate_kwargs["no_repeat_ngram_size"] = 5
                generate_kwargs["repetition_penalty"] = 1.1

            self.logger.info(f"Transcribing with improved timestamp logic: {audio_path}")
            result = self.pipe(
                audio_path,
                return_timestamps=True,
                generate_kwargs=generate_kwargs
            )

            srt_entries = []
            if isinstance(result, dict) and "chunks" in result and result["chunks"]:
                chunks = result["chunks"]
                current_time = 0.0  # Track current position for realistic timestamp estimation

                for i, chunk in enumerate(chunks):
                    text = chunk.get("text", "").strip()
                    if not text:
                        continue

                    timestamp = chunk.get("timestamp")
                    original_start = timestamp[0] if timestamp and timestamp[0] is not None else None
                    original_end = timestamp[1] if timestamp and timestamp[1] is not None else None

                    # Check if original timestamps are realistic
                    use_estimated_timestamps = False
                    if original_start is not None and original_end is not None:
                        if not self._is_timestamp_realistic(text, original_start, original_end, language):
                            self.logger.warning(f"Segment {i+1}: Unrealistic timestamps detected "
                                              f"({original_end - original_start:.2f}s for {len(text)} chars). "
                                              f"Using estimated timestamps.")
                            use_estimated_timestamps = True
                    else:
                        self.logger.warning(f"Segment {i+1}: Missing timestamps. Using estimated timestamps.")
                        use_estimated_timestamps = True

                    if use_estimated_timestamps:
                        # Estimate realistic timestamps based on text length
                        estimated_duration = self._estimate_realistic_duration(text, language)
                        start_time_s = current_time
                        end_time_s = current_time + estimated_duration
                        current_time = end_time_s + 0.1  # Small gap between segments

                        self.logger.info(f"Segment {i+1}: Estimated duration {estimated_duration:.2f}s "
                                       f"for {len(text)} characters")
                    else:
                        # Use original timestamps if they seem realistic
                        start_time_s = original_start
                        end_time_s = original_end
                        # Safely update current_time, handling potential None values
                        if end_time_s is not None:
                            current_time = max(current_time, end_time_s + 0.1)

                    start_time = self._seconds_to_srt_time(start_time_s)
                    end_time = self._seconds_to_srt_time(end_time_s)

                    srt_entries.append(f"{len(srt_entries) + 1}\n{start_time} --> {end_time}\n{text}\n")

            else:
                # Fallback for single transcription result
                text = result.get("text", "").strip()
                if text:
                    end_time = self._seconds_to_srt_time(audio_duration if audio_duration > 0 else 60.0)
                    srt_entries.append(f"1\n00:00:00,000 --> {end_time}\n{text}\n")

            if srt_entries:
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write("\n".join(srt_entries))
                self.logger.info(f"SRT file saved with {len(srt_entries)} entries: {output_path}")
                return True
            else:
                self.logger.error("No transcription content to save.")
                return False

        except Exception as e:
            self.logger.error(f"Failed to create SRT file: {e}", exc_info=True)
            return False
    
    def get_backend_info(self) -> Dict[str, Any]:
        """Get information about the backend"""
        return {
            "name": "anime-whisper",
            "model": self.model_name,
            "device": self.device,
            "dtype": str(self.torch_dtype) if self.torch_dtype else None,
            "initialized": self.is_initialized,
            "specialization": "Japanese anime/game voice acting",
            "features": [
                "Handles non-verbal sounds (laughs, gasps, etc.)",
                "Natural punctuation for subtitles",
                "Low hallucination rate",
                "NSFW content capable",
                "Optimized for anime voice acting"
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
        self.logger.info("Anime-Whisper backend cleaned up")
