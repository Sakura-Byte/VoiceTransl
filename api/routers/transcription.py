"""
Transcription API endpoints
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from typing import Optional

from api.models.transcription import (
    TranscriptionRequest, TranscriptionResponse, TranscriptionStatusResponse
)
from api.core.task_manager import TaskManager
from api.core.exceptions import InvalidInputError, TranscriptionError

router = APIRouter()


def get_task_manager(request: Request) -> TaskManager:
    """Get task manager from app state"""
    return request.app.state.task_manager


@router.post("/transcribe", response_model=TranscriptionResponse)
async def create_transcription_task(
    request: TranscriptionRequest = None,
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    output_format: str = Form("lrc"),
    task_manager: TaskManager = Depends(get_task_manager)
):
    """
    Create a new transcription task
    
    Accepts either:
    - JSON request body with URL
    - Multipart form with file upload
    - Multipart form with URL
    """
    
    # Handle different input methods
    if request and request.url:
        # JSON request with URL
        input_data = {
            "url": str(request.url),
            "language": "ja",  # Always Japanese
            "output_format": request.output_format
        }
    elif file:
        # File upload
        if file.size > 1024 * 1024 * 1024:  # 1GiB limit
            raise InvalidInputError("File size exceeds 1GiB limit")
        
        # Read file content
        file_content = await file.read()
        
        input_data = {
            "file_content": file_content,
            "filename": file.filename,
            "content_type": file.content_type,
            "language": "ja",  # Always Japanese
            "output_format": output_format
        }
    elif url:
        # URL in form data
        input_data = {
            "url": url,
            "language": "ja",  # Always Japanese
            "output_format": output_format
        }
    else:
        raise InvalidInputError("No input provided. Please provide either a file or URL.")
    
    # Create transcription task
    from api.services.transcription import process_transcription_task
    
    task_id = task_manager.create_task(
        task_type="transcription",
        input_data=input_data,
        processor=process_transcription_task
    )
    
    return TranscriptionResponse(
        task_id=task_id,
        status="pending",
        message="Transcription task created successfully"
    )


@router.get("/transcribe/{task_id}/status", response_model=TranscriptionStatusResponse)
async def get_transcription_status(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Get transcription task status"""
    try:
        status_info = task_manager.get_task_status(task_id)
        return TranscriptionStatusResponse(**status_info)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/transcribe/{task_id}/result")
async def get_transcription_result(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Get transcription task result"""
    try:
        result = task_manager.get_task_result(task_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/transcribe/{task_id}")
async def cancel_transcription_task(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Cancel a transcription task"""
    try:
        cancelled = task_manager.cancel_task(task_id)
        if cancelled:
            return {"message": f"Task {task_id} cancelled successfully"}
        else:
            return {"message": f"Task {task_id} could not be cancelled (already completed or failed)"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
