"""
Task management API endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from typing import Optional, List

from api.models.base import TaskStatus, TaskType
from api.core.task_manager import TaskManager

router = APIRouter()


def get_task_manager(request: Request) -> TaskManager:
    """Get task manager from app state"""
    return request.app.state.task_manager


@router.get("/status/{task_id}")
async def get_task_status(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Get status of any task by ID"""
    try:
        status_info = task_manager.get_task_status(task_id)
        return status_info
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/result/{task_id}")
async def get_task_result(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Get result of any task by ID"""
    try:
        result = task_manager.get_task_result(task_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tasks")
async def list_tasks(
    task_type: Optional[str] = Query(None, description="Filter by task type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of tasks to return"),
    offset: int = Query(0, ge=0, description="Number of tasks to skip"),
    task_manager: TaskManager = Depends(get_task_manager)
):
    """List tasks with optional filtering"""
    
    # Convert string parameters to enums if provided
    task_type_enum = None
    if task_type:
        try:
            task_type_enum = TaskType(task_type.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid task type: {task_type}")
    
    status_enum = None
    if status:
        try:
            status_enum = TaskStatus(status.lower())
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    tasks = task_manager.list_tasks(
        task_type=task_type_enum,
        status=status_enum,
        limit=limit,
        offset=offset
    )
    
    return {
        "tasks": tasks,
        "total": len(tasks),
        "limit": limit,
        "offset": offset
    }


@router.delete("/tasks/{task_id}")
async def cancel_task(
    task_id: str,
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Cancel a task"""
    try:
        cancelled = task_manager.cancel_task(task_id)
        if cancelled:
            return {"message": f"Task {task_id} cancelled successfully"}
        else:
            return {"message": f"Task {task_id} could not be cancelled (already completed or failed)"}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/stats")
async def get_task_stats(
    task_manager: TaskManager = Depends(get_task_manager)
):
    """Get task manager statistics"""
    stats = task_manager.get_stats()
    return stats
