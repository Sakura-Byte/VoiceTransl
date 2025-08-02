"""
Hybrid Transcription Backend for VoiceTransl
Combines tiny whisper (rough timestamps) + anime-whisper (accurate text) + qwen3-8b (alignment)
Provides the best of all worlds: accurate timestamps AND accurate text
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List
from tiny_whisper_backend import TinyWhisperBackend
from anime_whisper_backend import AnimeWhisperBackend
from qwen3_alignment_backend import Qwen3AlignmentBackend
from openai_alignment_backend import OpenAIAlignmentBackend
from gemini_alignment_backend import GeminiAlignmentBackend

class HybridTranscriptionBackend:
    """
    Hybrid transcription backend that combines multiple models for optimal results
    
    Workflow:
    1. TinyWhisper -> rough timestamps (fast, reliable timing)
    2. AnimeWhisper -> accurate text (specialized for Japanese anime/games)
    3. Qwen3-8B -> intelligent alignment (local LLM for text-timestamp matching)
    4. Generate final SRT with accurate timestamps and text
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.tiny_whisper = None
        self.anime_whisper = None
        self.alignment_backend = None
        self.alignment_type = self.config.get("alignment_type", "qwen3")  # "qwen3", "openai", or "gemini"
        self.is_initialized = False
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
    def initialize(self) -> bool:
        """Initialize all backend components"""
        try:
            self.logger.info("Initializing Hybrid Transcription Backend...")
            
            # Initialize TinyWhisper for rough timestamps
            self.logger.info("1/3 Initializing TinyWhisper backend...")
            self.tiny_whisper = TinyWhisperBackend(self.config)
            if not self.tiny_whisper.initialize():
                raise RuntimeError("Failed to initialize TinyWhisper backend")
            
            # Initialize AnimeWhisper for accurate text
            self.logger.info("2/3 Initializing AnimeWhisper backend...")
            self.anime_whisper = AnimeWhisperBackend(self.config)
            if not self.anime_whisper.initialize():
                raise RuntimeError("Failed to initialize AnimeWhisper backend")
            
            # Initialize alignment backend based on configuration
            if self.alignment_type == "openai":
                self.logger.info("3/3 Initializing OpenAI-compatible alignment backend...")
                self.alignment_backend = OpenAIAlignmentBackend(self.config)
                if not self.alignment_backend.initialize():
                    raise RuntimeError("Failed to initialize OpenAI-compatible alignment backend")
            elif self.alignment_type == "gemini":
                self.logger.info("3/3 Initializing Gemini alignment backend...")
                self.alignment_backend = GeminiAlignmentBackend(self.config)
                if not self.alignment_backend.initialize():
                    raise RuntimeError("Failed to initialize Gemini alignment backend")
            else:
                self.logger.info("3/3 Initializing Qwen3 alignment backend...")
                self.alignment_backend = Qwen3AlignmentBackend(self.config)
                if not self.alignment_backend.initialize():
                    raise RuntimeError("Failed to initialize Qwen3 alignment backend")
            
            self.is_initialized = True
            self.logger.info("✅ Hybrid Transcription Backend initialized successfully!")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize hybrid backend: {e}")
            self.cleanup()
            return False
    
    def transcribe_hybrid(self, audio_path: str, language: str = "ja", progress_callback=None, **kwargs) -> Dict[str, Any]:
        """
        Perform hybrid transcription using all three models

        Args:
            audio_path: Path to audio file
            language: Language code (default: "ja" for Japanese)
            progress_callback: Optional callback function to report progress
            **kwargs: Additional parameters

        Returns:
            Dictionary with aligned segments and metadata
        """
        if not self.is_initialized:
            if not self.initialize():
                raise RuntimeError("Failed to initialize hybrid transcription backend")

        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        try:
            self.logger.info(f"Starting hybrid transcription: {audio_path}")

            # Step 1: Get rough timestamps from TinyWhisper
            if progress_callback:
                progress_callback("[INFO] Step 1/3: TinyWhisper 生成时间戳...")
            self.logger.info("Step 1/3: Getting rough timestamps from TinyWhisper...")
            rough_result = self.tiny_whisper.transcribe_with_timestamps(audio_path, language, **kwargs)
            rough_segments = rough_result.get("segments", [])
            self.logger.info(f"✅ Got {len(rough_segments)} rough segments")

            # Step 2: Get accurate text from AnimeWhisper
            if progress_callback:
                progress_callback("[INFO] Step 2/3: AnimeWhisper 生成准确文本...")
            self.logger.info("Step 2/3: Getting accurate text from AnimeWhisper...")
            accurate_text = self.anime_whisper.transcribe(audio_path, language, **kwargs)
            self.logger.info(f"✅ Got accurate text ({len(accurate_text)} characters)")

            # Step 3: Align text with timestamps using selected alignment backend
            alignment_name = {
                "openai": "OpenAI兼容API",
                "gemini": "Gemini原生API",
                "qwen3": "Qwen3"
            }.get(self.alignment_type, "Qwen3")
            if progress_callback:
                progress_callback(f"[INFO] Step 3/3: {alignment_name} 智能对齐...")
            self.logger.info(f"Step 3/3: Aligning text with timestamps using {alignment_name}...")
            aligned_segments = self.alignment_backend.align_text_with_timestamps(rough_segments, accurate_text)
            self.logger.info(f"✅ Aligned {len(aligned_segments)} segments")

            # Prepare final result
            result = {
                "segments": aligned_segments,
                "text": accurate_text,
                "metadata": {
                    "method": "hybrid_transcription",
                    "rough_segments_count": len(rough_segments),
                    "aligned_segments_count": len(aligned_segments),
                    "models_used": {
                        "timestamps": "tiny-whisper",
                        "text": "anime-whisper",
                        "alignment": f"{self.alignment_type}-alignment"
                    }
                }
            }

            self.logger.info("🎉 Hybrid transcription completed successfully!")
            return result

        except Exception as e:
            self.logger.error(f"Hybrid transcription failed: {e}")
            raise
    
    def transcribe_to_srt(self, audio_path: str, output_path: str, language: str = "ja", progress_callback=None, **kwargs) -> bool:
        """
        Perform hybrid transcription and save as SRT file

        Args:
            audio_path: Path to audio file
            output_path: Path for output SRT file
            language: Language code
            progress_callback: Optional callback function to report progress
            **kwargs: Additional parameters

        Returns:
            True if successful, False otherwise
        """
        try:
            # Perform hybrid transcription with progress callback
            result = self.transcribe_hybrid(audio_path, language, progress_callback=progress_callback, **kwargs)
            segments = result.get("segments", [])

            if not segments:
                self.logger.error("No segments to save")
                return False

            # Generate SRT content
            srt_entries = []
            for i, segment in enumerate(segments, 1):
                start_time = self._seconds_to_srt_time(segment.get("start", 0))
                end_time = self._seconds_to_srt_time(segment.get("end", 0))
                text = segment.get("text", "").strip()

                if text:
                    srt_entries.append(f"{i}\n{start_time} --> {end_time}\n{text}\n")

            # Write SRT file
            if srt_entries:
                srt_content = "\n".join(srt_entries) + "\n"
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write(srt_content)

                self.logger.info(f"SRT file saved with {len(srt_entries)} entries: {output_path}")
                return True
            else:
                self.logger.error("No SRT entries to save")
                return False

        except Exception as e:
            self.logger.error(f"Failed to create SRT file: {e}")
            return False
    
    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT time format (HH:MM:SS,mmm)"""
        if seconds is None:
            seconds = 0.0
        
        total_ms = round(seconds * 1000)
        hours = total_ms // 3600000
        minutes = (total_ms % 3600000) // 60000
        secs = (total_ms % 60000) // 1000
        milliseconds = total_ms % 1000
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"
    
    def get_backend_info(self) -> Dict[str, Any]:
        """Get information about the hybrid backend"""
        alignment_desc = {
            "openai": "OpenAI-compatible API",
            "gemini": "Gemini API (native)",
            "qwen3": "Qwen3-8B (local)"
        }.get(self.alignment_type, "Qwen3-8B (local)")
        method_desc = f"tiny-whisper + anime-whisper + {self.alignment_type}-alignment"

        return {
            "name": "hybrid-transcription",
            "method": method_desc,
            "initialized": self.is_initialized,
            "alignment_type": self.alignment_type,
            "components": {
                "timestamps": "TinyWhisper (fast, reliable timing)",
                "text": "AnimeWhisper (accurate Japanese transcription)",
                "alignment": f"{alignment_desc} (intelligent text-timestamp alignment)"
            },
            "advantages": [
                "Accurate timestamps from tiny-whisper",
                "High-quality text from anime-whisper",
                f"Intelligent alignment from {alignment_desc}",
                "No internet dependency" if self.alignment_type == "qwen3" else "Flexible API integration",
                "Best of all worlds approach"
            ]
        }
    
    def cleanup(self):
        """Clean up all backend resources"""
        if self.tiny_whisper:
            self.tiny_whisper.cleanup()
            self.tiny_whisper = None
        
        if self.anime_whisper:
            self.anime_whisper.cleanup()
            self.anime_whisper = None
        
        if self.alignment_backend:
            self.alignment_backend.cleanup()
            self.alignment_backend = None
        
        self.is_initialized = False
        self.logger.info("Hybrid Transcription Backend cleaned up")
