"""
Task Management System for VoiceTransl API
Handles async task processing, status tracking, and result storage
"""

import asyncio
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum

from api.models.base import TaskStatus, TaskType, TaskMetadata
from api.core.exceptions import TaskNotFoundError


@dataclass
class Task:
    """Task data structure"""
    task_id: str
    task_type: TaskType
    status: TaskStatus = TaskStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Task data
    input_data: Dict[str, Any] = field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Optional[TaskMetadata] = None
    
    # Progress tracking
    progress: float = 0.0
    current_step: Optional[str] = None
    estimated_time_remaining: Optional[float] = None
    
    # Internal
    _future: Optional[asyncio.Future] = None
    _processor: Optional[Callable] = None


class TaskManager:
    """Manages async task processing and tracking"""
    
    def __init__(self, max_concurrent_tasks: int = 5, cleanup_interval: int = 300):
        self.max_concurrent_tasks = max_concurrent_tasks
        self.cleanup_interval = cleanup_interval
        
        self._tasks: Dict[str, Task] = {}
        self._active_tasks: Dict[str, asyncio.Task] = {}
        self._semaphore = asyncio.Semaphore(max_concurrent_tasks)
        self._cleanup_task: Optional[asyncio.Task] = None
        self._shutdown = False
        
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize the task manager"""
        self.logger.info("Initializing task manager...")
        
        # Start cleanup task
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        
        self.logger.info(f"Task manager initialized with {self.max_concurrent_tasks} max concurrent tasks")
    
    async def cleanup(self):
        """Cleanup and shutdown the task manager"""
        self.logger.info("Shutting down task manager...")
        self._shutdown = True
        
        # Cancel cleanup task
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass
        
        # Cancel all active tasks
        for task_id, task in self._active_tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
        
        self._active_tasks.clear()
        self.logger.info("Task manager shutdown complete")
    
    def create_task(
        self, 
        task_type: TaskType, 
        input_data: Dict[str, Any],
        processor: Callable[[Task], Awaitable[Dict[str, Any]]],
        task_id: Optional[str] = None
    ) -> str:
        """Create a new task"""
        if task_id is None:
            task_id = str(uuid.uuid4())
        
        task = Task(
            task_id=task_id,
            task_type=task_type,
            input_data=input_data,
            _processor=processor
        )
        
        self._tasks[task_id] = task
        
        # Start processing the task
        asyncio.create_task(self._process_task(task))
        
        self.logger.info(f"Created task {task_id} of type {task_type}")
        return task_id
    
    async def _process_task(self, task: Task):
        """Process a single task"""
        async with self._semaphore:
            try:
                # Update task status
                task.status = TaskStatus.PROCESSING
                task.started_at = datetime.utcnow()
                task.updated_at = datetime.utcnow()
                
                self.logger.info(f"Starting processing task {task.task_id}")
                
                # Create asyncio task for processing
                processing_task = asyncio.create_task(task._processor(task))
                self._active_tasks[task.task_id] = processing_task
                
                # Process the task
                result = await processing_task
                
                # Update task with result
                task.result = result
                task.status = TaskStatus.COMPLETED
                task.completed_at = datetime.utcnow()
                task.updated_at = datetime.utcnow()
                task.progress = 100.0
                
                self.logger.info(f"Task {task.task_id} completed successfully")
                
            except asyncio.CancelledError:
                task.status = TaskStatus.CANCELLED
                task.updated_at = datetime.utcnow()
                self.logger.info(f"Task {task.task_id} was cancelled")
                
            except Exception as e:
                task.status = TaskStatus.FAILED
                task.error = str(e)
                task.updated_at = datetime.utcnow()
                self.logger.error(f"Task {task.task_id} failed: {e}")
                
            finally:
                # Remove from active tasks
                self._active_tasks.pop(task.task_id, None)
    
    def get_task(self, task_id: str) -> Task:
        """Get task by ID"""
        if task_id not in self._tasks:
            raise TaskNotFoundError(task_id)
        return self._tasks[task_id]
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get task status information"""
        task = self.get_task(task_id)
        
        return {
            "task_id": task.task_id,
            "status": task.status.value,
            "task_type": task.task_type.value,
            "progress": task.progress,
            "current_step": task.current_step,
            "estimated_time_remaining": task.estimated_time_remaining,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "error": task.error,
            "metadata": task.metadata.dict() if task.metadata else None
        }
    
    def get_task_result(self, task_id: str) -> Dict[str, Any]:
        """Get task result"""
        task = self.get_task(task_id)
        
        if task.status == TaskStatus.COMPLETED:
            return {
                "task_id": task.task_id,
                "status": task.status.value,
                "result": task.result,
                "metadata": task.metadata.dict() if task.metadata else None
            }
        elif task.status == TaskStatus.FAILED:
            return {
                "task_id": task.task_id,
                "status": task.status.value,
                "error": task.error
            }
        else:
            return {
                "task_id": task.task_id,
                "status": task.status.value,
                "message": "Task not yet completed"
            }
    
    def list_tasks(
        self, 
        task_type: Optional[TaskType] = None,
        status: Optional[TaskStatus] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List tasks with optional filtering"""
        tasks = list(self._tasks.values())
        
        # Apply filters
        if task_type:
            tasks = [t for t in tasks if t.task_type == task_type]
        if status:
            tasks = [t for t in tasks if t.status == status]
        
        # Sort by creation time (newest first)
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        
        # Apply pagination
        tasks = tasks[offset:offset + limit]
        
        return [self.get_task_status(task.task_id) for task in tasks]
    
    def cancel_task(self, task_id: str) -> bool:
        """Cancel a task"""
        if task_id not in self._tasks:
            raise TaskNotFoundError(task_id)
        
        task = self._tasks[task_id]
        
        if task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            return False
        
        # Cancel the asyncio task if it's active
        if task_id in self._active_tasks:
            self._active_tasks[task_id].cancel()
        
        task.status = TaskStatus.CANCELLED
        task.updated_at = datetime.utcnow()
        
        self.logger.info(f"Task {task_id} cancelled")
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """Get task manager statistics"""
        total_tasks = len(self._tasks)
        active_tasks = len(self._active_tasks)
        
        status_counts = {}
        for status in TaskStatus:
            status_counts[status.value] = len([
                t for t in self._tasks.values() if t.status == status
            ])
        
        return {
            "total_tasks": total_tasks,
            "active_tasks": active_tasks,
            "max_concurrent_tasks": self.max_concurrent_tasks,
            "status_counts": status_counts,
            "uptime": time.time() - (self._tasks[min(self._tasks.keys())].created_at.timestamp() if self._tasks else time.time())
        }
    
    async def _cleanup_loop(self):
        """Periodic cleanup of old completed tasks"""
        while not self._shutdown:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_old_tasks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in cleanup loop: {e}")
    
    async def _cleanup_old_tasks(self):
        """Remove old completed tasks to prevent memory leaks"""
        cutoff_time = datetime.utcnow() - timedelta(hours=24)  # Keep tasks for 24 hours
        
        tasks_to_remove = []
        for task_id, task in self._tasks.items():
            if (task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] 
                and task.updated_at < cutoff_time):
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del self._tasks[task_id]
        
        if tasks_to_remove:
            self.logger.info(f"Cleaned up {len(tasks_to_remove)} old tasks")
