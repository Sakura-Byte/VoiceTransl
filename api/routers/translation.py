"""
Translation API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional

from api.models.translation import (
    TranslationRequest, TranslationResponse, TranslationStatusResponse,
    SupportedTranslatorsResponse, TranslationConfigResponse
)
from api.core.task_manager import TaskManager
from api.core.config import get_config_bridge
from api.core.exceptions import InvalidInputError, TranslationError

router = APIRouter()


def get_task_manager(request: Request) -> TaskManager:
    """Get task manager from app state"""
    return request.app.state.task_manager


@router.post("/translate", response_model=TranslationResponse)
async def create_translation_task(
    request: TranslationRequest,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Create a new translation task"""
    
    # Validate LRC content
    if not request.lrc_content.strip():
        raise InvalidInputError("LRC content cannot be empty")
    
    # Prepare input data
    input_data = {
        "lrc_content": request.lrc_content,
        "source_language": "ja",  # Always Japanese
        "target_language": request.target_language,
        "translator": request.translator,
        "translation_config": request.translation_config
    }
    
    # Create translation task
    from api.services.translation import process_translation_task
    
    task_id = task_manager.create_task(
        task_type="translation",
        input_data=input_data,
        processor=process_translation_task
    )
    
    return TranslationResponse(
        task_id=task_id,
        status="pending",
        message="Translation task created successfully"
    )


@router.get("/translate/{task_id}/status", response_model=TranslationStatusResponse)
async def get_translation_status(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Get translation task status"""
    try:
        status_info = task_manager.get_task_status(task_id)
        return TranslationStatusResponse(**status_info)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/translate/{task_id}/result")
async def get_translation_result(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Get translation task result"""
    try:
        result = task_manager.get_task_result(task_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/translate/{task_id}")
async def cancel_translation_task(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Cancel a translation task"""
    try:
        cancelled = task_manager.cancel_task(task_id)
        if cancelled:
            return {"message": f"Task {task_id} cancelled successfully"}
        else:
            return {"message": f"Task {task_id} could not be cancelled (already completed or failed)"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/translators", response_model=SupportedTranslatorsResponse)
async def get_supported_translators():
    """Get list of supported translators"""
    config_bridge = get_config_bridge()
    translation_config = config_bridge.get_translation_config()
    
    # Import translator mappings from main app
    try:
        from app import TRANSLATOR_SUPPORTED, ONLINE_TRANSLATOR_MAPPING
        
        translators = {}
        for translator in TRANSLATOR_SUPPORTED:
            if translator in ONLINE_TRANSLATOR_MAPPING:
                translators[translator] = f"Online API: {translator}"
            else:
                translators[translator] = translator
        
        return SupportedTranslatorsResponse(
            translators=translators,
            current_translator=translation_config.get('translator', '不进行翻译')
        )
    except ImportError:
        # Fallback if app module not available
        return SupportedTranslatorsResponse(
            translators={
                "不进行翻译": "No translation",
                "gpt-custom": "Custom GPT",
                "sakura-009": "Sakura 0.09",
                "sakura-010": "Sakura 0.10"
            },
            current_translator="不进行翻译"
        )


@router.get("/translation/config", response_model=TranslationConfigResponse)
async def get_translation_config():
    """Get current translation configuration"""
    config_bridge = get_config_bridge()
    translation_config = config_bridge.get_translation_config()
    
    return TranslationConfigResponse(
        translator=translation_config.get('translator', '不进行翻译'),
        target_language='zh-cn',  # Default target
        api_settings={
            'gpt_address': translation_config.get('gpt_address', ''),
            'gpt_model': translation_config.get('gpt_model', '')
        } if translation_config.get('gpt_token') else None,
        model_settings={
            'sakura_file': translation_config.get('sakura_file', ''),
            'sakura_mode': translation_config.get('sakura_mode', 0)
        } if 'sakura' in translation_config.get('translator', '') else None
    )
