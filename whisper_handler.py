"""
Unified Whisper Handler
统一的Whisper处理器，支持多种Whisper实现
"""

import os
import subprocess
import tempfile
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path
import torch
from transformers import pipeline
from faster_whisper import WhisperModel
import librosa

logger = logging.getLogger(__name__)

class WhisperHandler:
    """统一的Whisper处理器，支持whisper.cpp、faster-whisper和anime-whisper"""
    
    WHISPER_TYPES = {
        'whisper-cpp': 'Whisper.cpp (本地二进制)',
        'faster-whisper': 'Faster Whisper (Python)',
        'anime-whisper': 'Anime Whisper (transformers)'
    }
    
    SUPPORTED_LANGUAGES = {
        'auto': '自动检测',
        'zh': '中文',
        'en': '英文', 
        'ja': '日文',
        'ko': '韩文',
        'ru': '俄文',
        'fr': '法文',
        'de': '德文',
        'es': '西班牙文',
        'it': '意大利文',
        'pt': '葡萄牙文',
        'ar': '阿拉伯文',
        'th': '泰文',
        'vi': '越南文'
    }
    
    def __init__(self):
        self.whisper_type = None
        self.model = None
        self.model_path = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.anime_whisper_pipeline = None
        self.faster_whisper_model = None
        
    def get_available_models(self) -> Dict[str, List[str]]:
        """获取所有可用的Whisper模型"""
        models = {
            'whisper-cpp': [],
            'faster-whisper': [],
            'anime-whisper': ['litagin/anime-whisper']
        }
        
        # Whisper.cpp models (ggml format)
        whisper_dir = Path('whisper')
        if whisper_dir.exists():
            models['whisper-cpp'] = [
                f.name for f in whisper_dir.iterdir() 
                if f.name.startswith('ggml') and f.name.endswith('.bin')
            ]
        
        # Faster-whisper models
        faster_whisper_dir = Path('whisper-faster')
        if faster_whisper_dir.exists():
            models['faster-whisper'] = [
                f.name for f in faster_whisper_dir.iterdir()
                if f.name.startswith('faster-whisper') or f.name.endswith('.bin')
            ]
        
        # Add common faster-whisper model sizes
        common_models = ['tiny', 'base', 'small', 'medium', 'large-v1', 'large-v2', 'large-v3']
        for model in common_models:
            if model not in models['faster-whisper']:
                models['faster-whisper'].append(model)
        
        return models
    
    def initialize_model(self, whisper_type: str, model_path: str, **kwargs) -> bool:
        """初始化指定类型的Whisper模型"""
        try:
            self.whisper_type = whisper_type
            self.model_path = model_path
            
            if whisper_type == 'anime-whisper':
                return self._init_anime_whisper(**kwargs)
            elif whisper_type == 'faster-whisper':
                return self._init_faster_whisper(model_path, **kwargs)
            elif whisper_type == 'whisper-cpp':
                return self._init_whisper_cpp(model_path, **kwargs)
            else:
                logger.error(f"Unsupported whisper type: {whisper_type}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to initialize {whisper_type}: {e}")
            return False
    
    def _init_anime_whisper(self, **kwargs) -> bool:
        """初始化Anime Whisper模型"""
        try:
            logger.info("Initializing anime-whisper model...")
            torch_dtype = torch.float16 if self.device == "cuda" else torch.float32
            
            self.anime_whisper_pipeline = pipeline(
                "automatic-speech-recognition",
                model="litagin/anime-whisper",
                device=self.device,
                torch_dtype=torch_dtype,
                chunk_length_s=kwargs.get('chunk_length_s', 30.0),
                batch_size=kwargs.get('batch_size', 64 if self.device == "cuda" else 8),
            )
            logger.info(f"Anime-whisper initialized on {self.device}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize anime-whisper: {e}")
            return False
    
    def _init_faster_whisper(self, model_path: str, **kwargs) -> bool:
        """初始化Faster Whisper模型"""
        try:
            logger.info(f"Initializing faster-whisper model: {model_path}")
            
            # If model_path is a local file, use it directly
            if os.path.exists(model_path):
                model_size_or_path = model_path
            else:
                # Use model name directly (will download if needed)
                model_size_or_path = model_path
            
            compute_type = kwargs.get('compute_type', 'float16' if self.device == 'cuda' else 'int8')
            
            self.faster_whisper_model = WhisperModel(
                model_size_or_path, 
                device=self.device,
                compute_type=compute_type
            )
            logger.info(f"Faster-whisper initialized: {model_path} on {self.device}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize faster-whisper: {e}")
            return False
    
    def _init_whisper_cpp(self, model_path: str, **kwargs) -> bool:
        """初始化Whisper.cpp模型"""
        try:
            full_model_path = os.path.join('whisper', model_path)
            if not os.path.exists(full_model_path):
                logger.error(f"Whisper.cpp model not found: {full_model_path}")
                return False
            
            # Check if whisper-cli executable exists
            whisper_cli = os.path.join('whisper', 'whisper-cli.exe')
            if not os.path.exists(whisper_cli):
                logger.error(f"Whisper.cpp executable not found: {whisper_cli}")
                return False
            
            logger.info(f"Whisper.cpp model configured: {model_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to configure whisper.cpp: {e}")
            return False
    
    def transcribe(self, audio_file: str, language: str = 'auto', **kwargs) -> Dict[str, Any]:
        """统一的转录接口"""
        try:
            if self.whisper_type == 'anime-whisper':
                return self._transcribe_anime_whisper(audio_file, language, **kwargs)
            elif self.whisper_type == 'faster-whisper':
                return self._transcribe_faster_whisper(audio_file, language, **kwargs)
            elif self.whisper_type == 'whisper-cpp':
                return self._transcribe_whisper_cpp(audio_file, language, **kwargs)
            else:
                raise ValueError(f"No whisper model initialized")
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'text': '',
                'segments': []
            }
    
    def _transcribe_anime_whisper(self, audio_file: str, language: str = 'auto', **kwargs) -> Dict[str, Any]:
        """使用Anime Whisper进行转录"""
        try:
            generate_kwargs = {
                'return_timestamps': True,
                'no_repeat_ngram_size': kwargs.get('no_repeat_ngram_size', 5),
                'repetition_penalty': kwargs.get('repetition_penalty', 1.1),
            }
            
            if language != 'auto' and language in self.SUPPORTED_LANGUAGES:
                lang_map = {
                    'zh': 'Chinese',
                    'ja': 'Japanese',
                    'en': 'English',
                    'ko': 'Korean'
                }
                if language in lang_map:
                    generate_kwargs['language'] = lang_map[language]
            
            result = self.anime_whisper_pipeline(audio_file, generate_kwargs=generate_kwargs)
            
            # Convert to standard format
            segments = []
            if 'chunks' in result:
                for chunk in result['chunks']:
                    segments.append({
                        'start': chunk['timestamp'][0] if chunk['timestamp'][0] is not None else 0,
                        'end': chunk['timestamp'][1] if chunk['timestamp'][1] is not None else 0,
                        'text': chunk['text'].strip()
                    })
            
            return {
                'success': True,
                'text': result.get('text', ''),
                'segments': segments,
                'language': self._detect_language_from_text(result.get('text', ''))
            }
        except Exception as e:
            logger.error(f"Anime whisper transcription failed: {e}")
            raise
    
    def _transcribe_faster_whisper(self, audio_file: str, language: str = 'auto', **kwargs) -> Dict[str, Any]:
        """使用Faster Whisper进行转录"""
        try:
            # Convert language code
            lang = None if language == 'auto' else language
            
            segments, info = self.faster_whisper_model.transcribe(
                audio_file,
                language=lang,
                beam_size=kwargs.get('beam_size', 5),
                word_timestamps=kwargs.get('word_timestamps', True)
            )
            
            # Convert segments to list and standard format
            segment_list = []
            full_text = []
            
            for segment in segments:
                segment_list.append({
                    'start': segment.start,
                    'end': segment.end,
                    'text': segment.text.strip()
                })
                full_text.append(segment.text.strip())
            
            return {
                'success': True,
                'text': ' '.join(full_text),
                'segments': segment_list,
                'language': info.language if hasattr(info, 'language') else 'unknown'
            }
        except Exception as e:
            logger.error(f"Faster whisper transcription failed: {e}")
            raise
    
    def _transcribe_whisper_cpp(self, audio_file: str, language: str = 'auto', **kwargs) -> Dict[str, Any]:
        """使用Whisper.cpp进行转录"""
        try:
            # Convert audio to WAV format if needed
            wav_file = self._ensure_wav_format(audio_file)
            
            # Prepare output files
            output_dir = os.path.dirname(wav_file)
            base_name = os.path.splitext(os.path.basename(wav_file))[0]
            srt_file = os.path.join(output_dir, f"{base_name}.srt")
            json_file = os.path.join(output_dir, f"{base_name}.json")
            
            # Build whisper.cpp command
            cmd = [
                os.path.join('whisper', 'whisper-cli.exe'),
                '-m', os.path.join('whisper', self.model_path),
                '-l', language if language != 'auto' else 'auto',
                '-osrt',
                '-oj',  # Also output JSON for timestamps
                wav_file,
                '-of', os.path.join(output_dir, base_name)
            ]
            
            # Add custom parameters if provided
            if 'extra_params' in kwargs:
                cmd.extend(kwargs['extra_params'])
            
            # Execute whisper.cpp
            logger.info(f"Running whisper.cpp: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.getcwd())
            
            if result.returncode != 0:
                logger.error(f"Whisper.cpp failed: {result.stderr}")
                raise RuntimeError(f"Whisper.cpp execution failed: {result.stderr}")
            
            # Parse results
            segments = []
            full_text = ""
            
            # Try to read JSON output first (more detailed)
            if os.path.exists(json_file):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        json_data = json.load(f)
                        if 'transcription' in json_data:
                            for item in json_data['transcription']:
                                if 'timestamps' in item:
                                    segments.append({
                                        'start': item['timestamps']['from'] / 1000,  # Convert to seconds
                                        'end': item['timestamps']['to'] / 1000,
                                        'text': item['text'].strip()
                                    })
                                    full_text += item['text'].strip() + " "
                except Exception as e:
                    logger.warning(f"Failed to parse JSON output: {e}")
            
            # Fallback to SRT parsing
            if not segments and os.path.exists(srt_file):
                segments, full_text = self._parse_srt_file(srt_file)
            
            # Clean up temporary files
            if wav_file != audio_file and os.path.exists(wav_file):
                os.unlink(wav_file)
            
            return {
                'success': True,
                'text': full_text.strip(),
                'segments': segments,
                'language': language if language != 'auto' else 'unknown'
            }
        except Exception as e:
            logger.error(f"Whisper.cpp transcription failed: {e}")
            raise
    
    def _ensure_wav_format(self, audio_file: str) -> str:
        """确保音频文件为WAV格式"""
        if audio_file.lower().endswith('.wav'):
            return audio_file
        
        # Convert to WAV using ffmpeg
        wav_file = tempfile.mktemp(suffix='.wav')
        cmd = [
            'ffmpeg', '-y', '-i', audio_file,
            '-acodec', 'pcm_s16le', '-ac', '1', '-ar', '16000',
            wav_file
        ]
        
        result = subprocess.run(cmd, capture_output=True)
        if result.returncode != 0:
            raise RuntimeError(f"Failed to convert audio to WAV: {result.stderr}")
        
        return wav_file
    
    def _parse_srt_file(self, srt_file: str) -> Tuple[List[Dict], str]:
        """解析SRT文件"""
        segments = []
        full_text = []
        
        try:
            with open(srt_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Simple SRT parsing
            import re
            pattern = r'(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n(.*?)(?=\n\d+\n|\n*$)'
            matches = re.findall(pattern, content, re.DOTALL)
            
            for match in matches:
                start_time = self._parse_srt_time(match[1])
                end_time = self._parse_srt_time(match[2])
                text = match[3].strip()
                
                segments.append({
                    'start': start_time,
                    'end': end_time,
                    'text': text
                })
                full_text.append(text)
        
        except Exception as e:
            logger.error(f"Failed to parse SRT file: {e}")
        
        return segments, ' '.join(full_text)
    
    def _parse_srt_time(self, time_str: str) -> float:
        """解析SRT时间格式为秒数"""
        try:
            # Format: HH:MM:SS,mmm
            parts = time_str.split(':')
            hours = int(parts[0])
            minutes = int(parts[1])
            seconds_parts = parts[2].split(',')
            seconds = int(seconds_parts[0])
            milliseconds = int(seconds_parts[1])
            
            total_seconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
            return total_seconds
        except:
            return 0.0
    
    def _detect_language_from_text(self, text: str) -> str:
        """基于文本内容检测语言"""
        if not text:
            return 'unknown'
        
        # Simple character-based language detection
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        hiragana_chars = sum(1 for c in text if '\u3040' <= c <= '\u309f')
        katakana_chars = sum(1 for c in text if '\u30a0' <= c <= '\u30ff')
        korean_chars = sum(1 for c in text if '\uac00' <= c <= '\ud7af')
        
        total_chars = len(text)
        if total_chars == 0:
            return 'en'
        
        if (chinese_chars / total_chars) > 0.3:
            return 'zh'
        elif (hiragana_chars + katakana_chars) / total_chars > 0.2:
            return 'ja'
        elif (korean_chars / total_chars) > 0.2:
            return 'ko'
        else:
            return 'en'
    
    def generate_lrc(self, transcription_result: Dict[str, Any]) -> str:
        """生成LRC格式字幕"""
        try:
            if not transcription_result.get('success', False):
                return ""
            
            lrc_lines = []
            segments = transcription_result.get('segments', [])
            
            if not segments:
                # No segments, use full text
                text = transcription_result.get('text', '')
                if text:
                    lrc_lines.append(f"[00:00.00]{text}")
            else:
                for segment in segments:
                    start_time = segment.get('start', 0)
                    text = segment.get('text', '').strip()
                    
                    if text:
                        minutes = int(start_time // 60)
                        seconds = int(start_time % 60)
                        centiseconds = int((start_time % 1) * 100)
                        
                        lrc_lines.append(f"[{minutes:02d}:{seconds:02d}.{centiseconds:02d}]{text}")
            
            return '\n'.join(lrc_lines)
        except Exception as e:
            logger.error(f"Failed to generate LRC: {e}")
            return ""
    
    def cleanup(self):
        """清理资源"""
        if self.anime_whisper_pipeline:
            del self.anime_whisper_pipeline
            self.anime_whisper_pipeline = None
        
        if self.faster_whisper_model:
            del self.faster_whisper_model
            self.faster_whisper_model = None
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

# Global whisper handler instance
whisper_handler = WhisperHandler()

def get_whisper_handler() -> WhisperHandler:
    """获取全局WhisperHandler实例"""
    return whisper_handler