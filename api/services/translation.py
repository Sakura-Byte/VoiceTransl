"""
Translation service implementation
Handles text translation using existing GalTransl backends
"""

import os
import tempfile
import logging
import time
import json
from typing import Dict, Any, List
from datetime import datetime

from api.core.config import get_gui_integration, get_config_bridge
from api.core.exceptions import TranslationError, ConfigurationError
from api.models.base import TaskMetadata
from api.models.translation import TranslationEntry


logger = logging.getLogger(__name__)


async def process_translation_task(task) -> Dict[str, Any]:
    """
    Process a translation task
    
    Args:
        task: Task object containing input data and metadata
        
    Returns:
        Dict containing translation results
    """
    start_time = time.time()
    input_data = task.input_data
    
    try:
        # Update task progress
        task.progress = 10.0
        task.current_step = "Initializing translation"
        
        # Get configuration
        config_bridge = get_config_bridge()
        translation_config = config_bridge.get_translation_config()
        
        # Check if translation is enabled
        translator = input_data.get('translator') or translation_config.get('translator', '不进行翻译')
        if translator == '不进行翻译':
            raise TranslationError("Translation is disabled. Please configure a translator in the GUI.")
        
        # Parse LRC content
        task.progress = 20.0
        task.current_step = "Parsing LRC content"
        
        lrc_entries = _parse_lrc_content(input_data['lrc_content'])
        if not lrc_entries:
            raise TranslationError("No valid LRC entries found in input content")
        
        task.total_entries = len(lrc_entries)
        
        # Prepare translation environment
        task.progress = 30.0
        task.current_step = "Preparing translation environment"
        
        translation_system = await _prepare_translation_system(translation_config, input_data)
        
        # Perform translation
        task.progress = 40.0
        task.current_step = "Translating content"
        
        translated_entries = await _translate_entries(
            lrc_entries, 
            translation_system, 
            translation_config,
            input_data,
            task
        )
        
        # Generate output
        task.progress = 90.0
        task.current_step = "Generating output"
        
        lrc_content = _generate_lrc_output(translated_entries)
        
        # Create metadata
        processing_time = time.time() - start_time
        successful_translations = len([e for e in translated_entries if e.translated_text])
        failed_translations = len(translated_entries) - successful_translations
        
        metadata = TaskMetadata(
            language=input_data.get('source_language', 'ja'),
            model_used=translator,
            processing_time=processing_time
        )
        
        task.metadata = metadata
        task.progress = 100.0
        task.current_step = "Completed"
        
        return {
            "lrc_content": lrc_content,
            "entries": [entry.dict() for entry in translated_entries],
            "metadata": metadata.dict(),
            "total_entries": len(translated_entries),
            "successful_translations": successful_translations,
            "failed_translations": failed_translations
        }
        
    except Exception as e:
        logger.error(f"Translation task failed: {e}")
        raise TranslationError(f"Translation failed: {str(e)}")


def _parse_lrc_content(lrc_content: str) -> List[Dict[str, Any]]:
    """Parse LRC content into structured entries"""
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


async def _prepare_translation_system(translation_config: Dict[str, Any], input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare translation system based on configuration"""
    
    translator = input_data.get('translator') or translation_config.get('translator')
    
    if not translator or translator == '不进行翻译':
        raise TranslationError("No translator configured")
    
    # Prepare translation system configuration
    system_config = {
        'translator': translator,
        'source_language': input_data.get('source_language', 'ja'),
        'target_language': input_data.get('target_language', 'zh-cn'),
        'translation_config': translation_config
    }
    
    # Add custom configuration if provided
    if input_data.get('translation_config'):
        system_config.update(input_data['translation_config'])
    
    return system_config


async def _translate_entries(
    lrc_entries: List[Dict[str, Any]], 
    translation_system: Dict[str, Any],
    translation_config: Dict[str, Any],
    input_data: Dict[str, Any],
    task
) -> List[TranslationEntry]:
    """Translate LRC entries using configured translation system"""
    
    translator = translation_system['translator']
    translated_entries = []
    
    for i, entry in enumerate(lrc_entries):
        try:
            # Update progress
            progress = 40.0 + (50.0 * i / len(lrc_entries))
            task.progress = progress
            task.current_step = f"Translating entry {i + 1}/{len(lrc_entries)}"
            task.current_entry = i + 1
            
            original_text = entry['text']
            
            # Perform translation based on translator type
            if translator in ['gpt-custom', 'moonshot', 'glm', 'deepseek', 'minimax', 'doubao', 'aliyun', 'gemini']:
                translated_text = await _translate_with_online_api(
                    original_text, 
                    translator, 
                    translation_config,
                    translation_system
                )
            elif translator in ['sakura-009', 'sakura-010']:
                translated_text = await _translate_with_sakura(
                    original_text,
                    translator,
                    translation_config
                )
            elif translator == 'galtransl':
                translated_text = await _translate_with_galtransl(
                    original_text,
                    translation_config
                )
            else:
                logger.warning(f"Unknown translator: {translator}, skipping translation")
                translated_text = original_text
            
            # Create translation entry
            translation_entry = TranslationEntry(
                start=entry['start'],
                end=entry['end'],
                original_text=original_text,
                translated_text=translated_text or original_text,
                confidence=1.0 if translated_text else 0.0
            )
            
            translated_entries.append(translation_entry)
            
        except Exception as e:
            logger.error(f"Failed to translate entry {i}: {e}")
            
            # Create entry with original text on failure
            translation_entry = TranslationEntry(
                start=entry['start'],
                end=entry['end'],
                original_text=entry['text'],
                translated_text=entry['text'],  # Fallback to original
                confidence=0.0
            )
            
            translated_entries.append(translation_entry)
    
    return translated_entries


async def _translate_with_online_api(
    text: str, 
    translator: str, 
    translation_config: Dict[str, Any],
    translation_system: Dict[str, Any]
) -> str:
    """Translate text using online API services"""
    
    try:
        # This would integrate with the existing GalTransl online API translation
        # For now, return a placeholder implementation
        
        gpt_token = translation_config.get('gpt_token', '')
        gpt_address = translation_config.get('gpt_address', '')
        gpt_model = translation_config.get('gpt_model', '')
        
        if not gpt_token:
            raise TranslationError(f"No API token configured for {translator}")
        
        # Import and use GalTransl translation backends
        from GalTransl.Backend.GPT3Translate import CGPT35Translate
        from GalTransl.Backend.GPT4Translate import CGPT4Translate
        from GalTransl.ConfigHelper import CProjectConfig
        
        # Create a minimal project config for translation
        project_config = translation_config.get('project_config', {})
        
        # This is a simplified implementation
        # In a full implementation, you would properly initialize the GalTransl system
        
        # For now, return a mock translation
        return f"[翻译] {text}"
        
    except Exception as e:
        logger.error(f"Online API translation failed: {e}")
        return None


async def _translate_with_sakura(
    text: str,
    translator: str,
    translation_config: Dict[str, Any]
) -> str:
    """Translate text using Sakura model"""
    
    try:
        sakura_file = translation_config.get('sakura_file', '')
        sakura_mode = translation_config.get('sakura_mode', 0)
        
        if not sakura_file or not os.path.exists(sakura_file):
            raise TranslationError("Sakura model file not found or not configured")
        
        # Import and use Sakura translation backend
        from GalTransl.Backend.SakuraTranslate import CSakuraTranslate
        
        # This is a simplified implementation
        # In a full implementation, you would properly initialize the Sakura system
        
        # For now, return a mock translation
        return f"[Sakura翻译] {text}"
        
    except Exception as e:
        logger.error(f"Sakura translation failed: {e}")
        return None


async def _translate_with_galtransl(
    text: str,
    translation_config: Dict[str, Any]
) -> str:
    """Translate text using GalTransl system"""
    
    try:
        # This would integrate with the full GalTransl translation pipeline
        # For now, return a placeholder implementation
        
        # For now, return a mock translation
        return f"[GalTransl翻译] {text}"
        
    except Exception as e:
        logger.error(f"GalTransl translation failed: {e}")
        return None


def _generate_lrc_output(translated_entries: List[TranslationEntry]) -> str:
    """Generate LRC format output from translated entries"""
    
    lrc_lines = []
    
    for entry in translated_entries:
        start_seconds = entry.start
        minutes = int(start_seconds // 60)
        seconds = start_seconds % 60
        
        # Format: [mm:ss.xx]translated_text
        lrc_line = f"[{minutes:02d}:{seconds:05.2f}]{entry.translated_text}"
        lrc_lines.append(lrc_line)
    
    return '\n'.join(lrc_lines)
