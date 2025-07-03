import asyncio
import os
import tempfile
import traceback
from typing import Optional, Dict, Any, Union
from pathlib import Path
import logging
from datetime import datetime
import re
import json

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import pipeline
import librosa
import subprocess
import yaml
import pysrt

from GalTransl.ConfigHelper import CProjectConfig
from GalTransl.Backend.SakuraTranslate import CSakuraTranslate
from GalTransl.Backend.GPT3Translate import CGPT3Translate
from GalTransl.CSentense import CSentense, CTransList
from GalTransl.Dictionary import CGptDict
from whisper_handler import get_whisper_handler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="VoiceTransl API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_LANGUAGES = {
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)", 
    "en-US": "English",
    "ja-JP": "Japanese",
    "ko-KR": "Korean",
    "es-ES": "Spanish",
    "fr-FR": "French",
    "de-DE": "German",
    "it-IT": "Italian",
    "pt-BR": "Portuguese",
    "ru-RU": "Russian",
    "ar-SA": "Arabic",
    "th-TH": "Thai",
    "vi-VN": "Vietnamese"
}

TRANSLATION_PROVIDERS = {
    "sakura": "Sakura LLM",
    "gpt3": "GPT-3.5",
    "gpt4": "GPT-4",
    "gemini": "Google Gemini",
    "ollama": "Ollama Local"
}

class TranscriptionRequest(BaseModel):
    whisper_type: Optional[str] = "anime-whisper"
    whisper_model: Optional[str] = "litagin/anime-whisper"
    generate_kwargs: Optional[Dict[str, Any]] = None

class TranscriptionResponse(BaseModel):
    success: bool
    message: str
    detected_language: Optional[str] = None
    whisper_type: str
    whisper_model: str
    transcription: Optional[str] = None
    segments: Optional[list] = None
    processing_time: float

class TranslationRequest(BaseModel):
    text: Optional[str] = None
    subtitle_content: Optional[str] = None
    input_format: Optional[str] = "text"  # text, srt, lrc
    output_format: Optional[str] = "text"  # text, srt, lrc
    source_language: Optional[str] = None
    target_language: str
    provider: Optional[str] = "sakura"

class TranslationResponse(BaseModel):
    success: bool
    message: str
    source_language: Optional[str] = None
    target_language: str
    provider: str
    input_format: str
    output_format: str
    original_content: str
    translated_content: Optional[str] = None
    processing_time: float


class APIManager:
    def __init__(self):
        self.whisper_handler = get_whisper_handler()
        self.config = None
        self.translator = None
        self.init_config()
    
    def init_config(self):
        try:
            config_path = Path("project/config.yaml")
            if config_path.exists():
                self.config = CProjectConfig(config_path)
                logger.info("Configuration loaded successfully")
            else:
                logger.warning("Config file not found, using defaults")
                self.config = None
        except Exception as e:
            logger.error(f"Failed to load configuration: {e}")
            self.config = None
    
    
    def transcribe_audio(self, audio_path: str, whisper_type: str = "anime-whisper", whisper_model: str = "litagin/anime-whisper", language: str = None, **kwargs) -> Dict[str, Any]:
        try:
            # Initialize whisper if needed or if different type/model
            if (not self.whisper_handler.whisper_type or 
                self.whisper_handler.whisper_type != whisper_type or 
                self.whisper_handler.model_path != whisper_model):
                
                success = self.whisper_handler.initialize_model(whisper_type, whisper_model, **kwargs)
                if not success:
                    raise RuntimeError(f"Failed to initialize {whisper_type} model: {whisper_model}")
            
            # Convert language format
            lang = 'auto'
            if language:
                lang_map = {
                    "zh-CN": "zh",
                    "ja-JP": "ja", 
                    "en-US": "en",
                    "ko-KR": "ko"
                }
                lang = lang_map.get(language, language.split('-')[0] if '-' in language else language)
            
            result = self.whisper_handler.transcribe(audio_path, language=lang, **kwargs)
            return result
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    def should_translate(self, detected_lang: str, target_lang: str) -> bool:
        if detected_lang == target_lang:
            return False
        
        lang_groups = {
            "zh": ["zh-CN", "zh-TW"],
            "en": ["en-US", "en-GB"],
        }
        
        for group in lang_groups.values():
            if detected_lang in group and target_lang in group:
                return False
        
        return True
    
    async def translate_text(self, text: str, source_lang: str, target_lang: str, provider: str) -> str:
        try:
            if not self.config:
                raise ValueError("Configuration not loaded")
            
            trans_list = CTransList()
            trans_item = CSentense()
            trans_item.post_jp = text
            trans_item.speaker = ""
            trans_list.append(trans_item)
            
            if provider == "sakura":
                translator = CSakuraTranslate(self.config, "sakura-009", None)
                _, result_list = await translator.translate(trans_list)
                return result_list[0].post_zh if result_list else text
            elif provider in ["gpt3", "gpt4"]:
                translator = CGPT3Translate(self.config, provider.upper(), None)
                _, result_list = await translator.translate(trans_list)
                return result_list[0].post_zh if result_list else text
            else:
                logger.warning(f"Unsupported provider: {provider}, returning original text")
                return text
                
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return text
    
    def parse_srt_content(self, srt_content: str) -> list:
        """Parse SRT content and return list of subtitle segments"""
        try:
            srt_pattern = r'(\d+)\n([\d:,]+ --> [\d:,]+)\n(.+?)(?=\n\d+\n|\n*$)'
            matches = re.findall(srt_pattern, srt_content, re.DOTALL)
            
            segments = []
            for match in matches:
                index, timing, text = match
                start_time, end_time = timing.split(' --> ')
                segments.append({
                    'index': int(index),
                    'start_time': start_time,
                    'end_time': end_time,
                    'text': text.strip()
                })
            return segments
        except Exception as e:
            logger.error(f"SRT parsing failed: {e}")
            raise
    
    def parse_lrc_content(self, lrc_content: str) -> list:
        """Parse LRC content and return list of subtitle segments"""
        try:
            lrc_pattern = r'\[(\d{2}:\d{2}\.\d{2,3})\](.+?)(?=\[|\Z)'
            matches = re.findall(lrc_pattern, lrc_content, re.DOTALL)
            
            segments = []
            for i, match in enumerate(matches):
                timestamp, text = match
                segments.append({
                    'index': i + 1,
                    'timestamp': timestamp,
                    'text': text.strip()
                })
            return segments
        except Exception as e:
            logger.error(f"LRC parsing failed: {e}")
            raise
    
    def format_srt_output(self, segments: list) -> str:
        """Format segments as SRT content"""
        try:
            srt_lines = []
            for segment in segments:
                if 'start_time' in segment and 'end_time' in segment:
                    # SRT format
                    srt_lines.append(str(segment['index']))
                    srt_lines.append(f"{segment['start_time']} --> {segment['end_time']}")
                    srt_lines.append(segment['text'])
                    srt_lines.append('')
                else:
                    # Convert from LRC format (approximate end time)
                    srt_lines.append(str(segment['index']))
                    start_time = self.lrc_to_srt_time(segment['timestamp'])
                    # Approximate 3-second duration for each segment
                    end_time = self.add_seconds_to_srt_time(start_time, 3.0)
                    srt_lines.append(f"{start_time} --> {end_time}")
                    srt_lines.append(segment['text'])
                    srt_lines.append('')
            return '\n'.join(srt_lines)
        except Exception as e:
            logger.error(f"SRT formatting failed: {e}")
            raise
    
    def format_lrc_output(self, segments: list) -> str:
        """Format segments as LRC content"""
        try:
            lrc_lines = []
            for segment in segments:
                if 'timestamp' in segment:
                    # LRC format
                    lrc_lines.append(f"[{segment['timestamp']}]{segment['text']}")
                else:
                    # Convert from SRT format
                    timestamp = self.srt_to_lrc_time(segment['start_time'])
                    lrc_lines.append(f"[{timestamp}]{segment['text']}")
            return '\n'.join(lrc_lines)
        except Exception as e:
            logger.error(f"LRC formatting failed: {e}")
            raise
    
    def lrc_to_srt_time(self, lrc_time: str) -> str:
        """Convert LRC timestamp (MM:SS.mmm) to SRT format (HH:MM:SS,mmm)"""
        try:
            if '.' in lrc_time:
                minutes, seconds_ms = lrc_time.split(':')
                seconds, ms = seconds_ms.split('.')
            else:
                minutes, seconds = lrc_time.split(':')
                ms = '000'
            
            # Pad milliseconds to 3 digits
            ms = ms.ljust(3, '0')[:3]
            
            return f"00:{minutes.zfill(2)}:{seconds.zfill(2)},{ms}"
        except Exception as e:
            logger.error(f"LRC to SRT time conversion failed: {e}")
            return "00:00:00,000"
    
    def srt_to_lrc_time(self, srt_time: str) -> str:
        """Convert SRT timestamp (HH:MM:SS,mmm) to LRC format (MM:SS.mmm)"""
        try:
            time_part = srt_time.replace(',', '.')
            hours, minutes, seconds_ms = time_part.split(':')
            
            # Convert hours to minutes
            total_minutes = int(hours) * 60 + int(minutes)
            
            return f"{total_minutes:02d}:{seconds_ms}"
        except Exception as e:
            logger.error(f"SRT to LRC time conversion failed: {e}")
            return "00:00.000"
    
    def add_seconds_to_srt_time(self, srt_time: str, duration: float) -> str:
        """Add duration in seconds to SRT timestamp"""
        try:
            time_part, ms_part = srt_time.split(',')
            hours, minutes, seconds = map(int, time_part.split(':'))
            ms = int(ms_part)
            
            total_seconds = hours * 3600 + minutes * 60 + seconds + ms / 1000.0 + duration
            
            new_hours = int(total_seconds // 3600)
            new_minutes = int((total_seconds % 3600) // 60)
            new_seconds = int(total_seconds % 60)
            new_ms = int((total_seconds % 1) * 1000)
            
            return f"{new_hours:02d}:{new_minutes:02d}:{new_seconds:02d},{new_ms:03d}"
        except Exception as e:
            logger.error(f"SRT time addition failed: {e}")
            return srt_time

    def generate_lrc(self, transcription_result: Dict[str, Any], translated_text: str = None) -> str:
        try:
            # Use the unified whisper handler's LRC generation
            if translated_text:
                # Create a modified result with translated text
                modified_result = transcription_result.copy()
                modified_result['text'] = translated_text
                # If there are segments, replace text but keep timing
                if 'segments' in modified_result and modified_result['segments']:
                    # For now, put all translated text in first segment
                    # More sophisticated splitting could be added later
                    modified_result['segments'][0]['text'] = translated_text
                    # Clear other segments to avoid duplication
                    modified_result['segments'] = modified_result['segments'][:1]
                return self.whisper_handler.generate_lrc(modified_result)
            else:
                return self.whisper_handler.generate_lrc(transcription_result)
            
        except Exception as e:
            logger.error(f"LRC generation failed: {e}")
            raise

api_manager = APIManager()

@app.get("/")
async def root():
    return {"message": "VoiceTransl API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/languages")
async def get_supported_languages():
    return {"languages": SUPPORTED_LANGUAGES}

@app.get("/providers")
async def get_translation_providers():
    return {"providers": TRANSLATION_PROVIDERS}

@app.get("/whisper-models")
async def get_whisper_models():
    try:
        handler = get_whisper_handler()
        available_models = handler.get_available_models()
        return {
            "whisper_types": handler.WHISPER_TYPES,
            "available_models": available_models
        }
    except Exception as e:
        logger.error(f"Failed to get whisper models: {e}")
        return {"error": str(e)}

@app.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    audio_file: UploadFile = File(...),
    whisper_type: str = Form("anime-whisper"),
    whisper_model: str = Form("litagin/anime-whisper"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    start_time = datetime.now()
    temp_audio_path = None
    
    try:
        if not audio_file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="File must be an audio file"
            )
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_audio_path = temp_file.name
            content = await audio_file.read()
            temp_file.write(content)
        
        transcription_result = api_manager.transcribe_audio(temp_audio_path, whisper_type, whisper_model, language=None)
        
        if not transcription_result.get('success', False):
            raise RuntimeError(f"Transcription failed: {transcription_result.get('error', 'Unknown error')}")
        
        detected_language = transcription_result.get('language', 'en')
        lang_map = {
            'zh': 'zh-CN',
            'ja': 'ja-JP', 
            'en': 'en-US',
            'ko': 'ko-KR'
        }
        detected_language = lang_map.get(detected_language, f"{detected_language}-XX")
        logger.info(f"Detected language: {detected_language}")
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        background_tasks.add_task(cleanup_temp_file, temp_audio_path)
        
        return TranscriptionResponse(
            success=True,
            message="Transcription completed successfully",
            detected_language=detected_language,
            whisper_type=whisper_type,
            whisper_model=whisper_model,
            transcription=transcription_result["text"],
            segments=transcription_result.get("segments", []),
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        traceback.print_exc()
        
        if temp_audio_path:
            background_tasks.add_task(cleanup_temp_file, temp_audio_path)
        
        return TranscriptionResponse(
            success=False,
            message=f"Transcription failed: {str(e)}",
            detected_language=None,
            whisper_type=whisper_type,
            whisper_model=whisper_model,
            transcription=None,
            segments=None,
            processing_time=(datetime.now() - start_time).total_seconds()
        )

@app.post("/translate", response_model=TranslationResponse)
async def translate(request: TranslationRequest):
    start_time = datetime.now()
    
    try:
        if request.target_language not in SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported target language: {request.target_language}"
            )
        
        if request.provider not in TRANSLATION_PROVIDERS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported provider: {request.provider}"
            )
        
        # Validate input format and content
        if request.input_format not in ["text", "srt", "lrc"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported input format: {request.input_format}"
            )
            
        if request.output_format not in ["text", "srt", "lrc"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported output format: {request.output_format}"
            )
        
        # Get input content
        if request.input_format == "text":
            if not request.text:
                raise HTTPException(status_code=400, detail="Text content is required for text input format")
            original_content = request.text
            input_segments = [{"index": 1, "text": request.text}]
        else:
            if not request.subtitle_content:
                raise HTTPException(status_code=400, detail="Subtitle content is required for SRT/LRC input format")
            original_content = request.subtitle_content
            
            if request.input_format == "srt":
                input_segments = api_manager.parse_srt_content(request.subtitle_content)
            else:  # lrc
                input_segments = api_manager.parse_lrc_content(request.subtitle_content)
        
        source_language = request.source_language or "auto"
        
        # Translate each segment
        translated_segments = []
        for segment in input_segments:
            text_to_translate = segment['text']
            
            # Check if translation is needed
            if (request.source_language and 
                not api_manager.should_translate(request.source_language, request.target_language)):
                translated_text = text_to_translate
                logger.info(f"Skipping translation - source language ({request.source_language}) matches target language ({request.target_language})")
            else:
                logger.info(f"Translating segment from {source_language} to {request.target_language}")
                translated_text = await api_manager.translate_text(
                    text_to_translate, source_language, request.target_language, request.provider
                )
            
            # Create translated segment preserving timing information
            translated_segment = segment.copy()
            translated_segment['text'] = translated_text
            translated_segments.append(translated_segment)
        
        # Format output based on requested format
        if request.output_format == "text":
            translated_content = '\n'.join([seg['text'] for seg in translated_segments])
        elif request.output_format == "srt":
            translated_content = api_manager.format_srt_output(translated_segments)
        else:  # lrc
            translated_content = api_manager.format_lrc_output(translated_segments)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return TranslationResponse(
            success=True,
            message="Translation completed successfully",
            source_language=request.source_language,
            target_language=request.target_language,
            provider=request.provider,
            input_format=request.input_format,
            output_format=request.output_format,
            original_content=original_content,
            translated_content=translated_content,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        traceback.print_exc()
        
        return TranslationResponse(
            success=False,
            message=f"Translation failed: {str(e)}",
            source_language=request.source_language,
            target_language=request.target_language,
            provider=request.provider,
            input_format=request.input_format or "text",
            output_format=request.output_format or "text",
            original_content=request.text or request.subtitle_content or "",
            translated_content=None,
            processing_time=(datetime.now() - start_time).total_seconds()
        )


def cleanup_temp_file(file_path: str):
    try:
        if os.path.exists(file_path):
            os.unlink(file_path)
            logger.info(f"Cleaned up temp file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to cleanup temp file {file_path}: {e}")

if __name__ == "__main__":
    import argparse
    import uvicorn
    
    parser = argparse.ArgumentParser(description="VoiceTransl Web API")
    parser.add_argument("--host", default="0.0.0.0", help="Host address")
    parser.add_argument("--port", type=int, default=8000, help="Port number")
    args = parser.parse_args()
    
    uvicorn.run(app, host=args.host, port=args.port)