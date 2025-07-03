import asyncio
import os
import tempfile
import traceback
from typing import Optional, Dict, Any
from pathlib import Path
import logging
from datetime import datetime

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from transformers import pipeline
import librosa
import subprocess
import yaml

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
    target_language: str
    provider: Optional[str] = "sakura"
    whisper_type: Optional[str] = "anime-whisper"
    whisper_model: Optional[str] = "litagin/anime-whisper"
    generate_kwargs: Optional[Dict[str, Any]] = None

class TranscriptionResponse(BaseModel):
    success: bool
    message: str
    detected_language: Optional[str] = None
    target_language: str
    provider: str
    whisper_type: str
    whisper_model: str
    lrc_content: Optional[str] = None
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
    
    def detect_language(self, audio_path: str, whisper_type: str = "anime-whisper", whisper_model: str = "litagin/anime-whisper") -> str:
        try:
            # Initialize whisper if needed
            if not self.whisper_handler.whisper_type:
                success = self.whisper_handler.initialize_model(whisper_type, whisper_model)
                if not success:
                    logger.error("Failed to initialize whisper model for language detection")
                    return "en-US"
            
            # Transcribe for language detection
            result = self.whisper_handler.transcribe(audio_path, language='auto')
            
            if result.get('success', False):
                detected_lang = result.get('language', 'en')
                # Convert to full language code
                lang_map = {
                    'zh': 'zh-CN',
                    'ja': 'ja-JP', 
                    'en': 'en-US',
                    'ko': 'ko-KR'
                }
                return lang_map.get(detected_lang, f"{detected_lang}-XX")
            else:
                return "en-US"
                
        except Exception as e:
            logger.error(f"Language detection failed: {e}")
            return "en-US"
    
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

@app.post("/transcribe-translate", response_model=TranscriptionResponse)
async def transcribe_translate(
    audio_file: UploadFile = File(...),
    target_language: str = Form(...),
    provider: str = Form("sakura"),
    whisper_type: str = Form("anime-whisper"),
    whisper_model: str = Form("litagin/anime-whisper"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    start_time = datetime.now()
    temp_audio_path = None
    
    try:
        if target_language not in SUPPORTED_LANGUAGES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported target language: {target_language}"
            )
        
        if provider not in TRANSLATION_PROVIDERS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported provider: {provider}"
            )
        
        if not audio_file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="File must be an audio file"
            )
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            temp_audio_path = temp_file.name
            content = await audio_file.read()
            temp_file.write(content)
        
        detected_language = api_manager.detect_language(temp_audio_path, whisper_type, whisper_model)
        logger.info(f"Detected language: {detected_language}")
        
        transcription_result = api_manager.transcribe_audio(temp_audio_path, whisper_type, whisper_model, detected_language)
        
        if not transcription_result.get('success', False):
            raise RuntimeError(f"Transcription failed: {transcription_result.get('error', 'Unknown error')}")
            
        original_text = transcription_result["text"]
        
        translated_text = None
        if api_manager.should_translate(detected_language, target_language):
            logger.info(f"Translating from {detected_language} to {target_language}")
            translated_text = await api_manager.translate_text(
                original_text, detected_language, target_language, provider
            )
        else:
            logger.info(f"Skipping translation - detected language ({detected_language}) matches target language ({target_language})")
        
        lrc_content = api_manager.generate_lrc(transcription_result, translated_text)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        background_tasks.add_task(cleanup_temp_file, temp_audio_path)
        
        return TranscriptionResponse(
            success=True,
            message="Processing completed successfully",
            detected_language=detected_language,
            target_language=target_language,
            provider=provider,
            whisper_type=whisper_type,
            whisper_model=whisper_model,
            lrc_content=lrc_content,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Processing failed: {e}")
        traceback.print_exc()
        
        if temp_audio_path:
            background_tasks.add_task(cleanup_temp_file, temp_audio_path)
        
        return TranscriptionResponse(
            success=False,
            message=f"Processing failed: {str(e)}",
            detected_language=None,
            target_language=target_language,
            provider=provider,
            whisper_type=whisper_type,
            whisper_model=whisper_model,
            lrc_content=None,
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