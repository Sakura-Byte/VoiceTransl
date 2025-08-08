# VoiceTransl Task Management System: Comprehensive Analysis & Fresh Design

Based on my thorough analysis of the VoiceTransl codebase, I've identified significant gaps between the current task management implementation and production-ready requirements. Here's my comprehensive assessment and recommended fresh architecture.

## 1. Current System Assessment

### Core Task Manager Analysis (`api/core/task_manager.py`)

**Strengths:**
- Simple async/await architecture with semaphore-based concurrency control
- Basic task lifecycle management (pending → processing → completed/failed/cancelled)
- Memory cleanup via periodic task purging (24-hour retention)
- Progress tracking with current step indicators
- Proper exception handling and logging

**Critical Limitations:**
- **No persistence**: Tasks are lost on server restart - unacceptable for production
- **Memory-only storage**: Limited scalability and no audit trail
- **Basic concurrency**: Simple semaphore doesn't support priority queues or sophisticated scheduling
- **No task retry mechanisms**: Failed tasks cannot be automatically retried
- **No task dependencies**: Cannot chain or compose tasks
- **Limited metadata**: Minimal context preservation for debugging
- **No horizontal scaling**: Cannot distribute across multiple workers

### API Integration Analysis (`api/routers/tasks.py`)

**Current Endpoints:**
```python
GET /api/tasks/status/{task_id}    # Task status retrieval
GET /api/tasks/result/{task_id}    # Task result retrieval  
GET /api/tasks/tasks               # Task listing with filters
DELETE /api/tasks/{task_id}        # Task cancellation
GET /api/tasks/stats               # Basic statistics
```

**Missing Production Features:**
- No batch operations (bulk cancel, retry, etc.)
- No task priority management
- No task dependency tracking
- No detailed audit logs
- No task scheduling capabilities
- No task template/workflow management

### Service Integration Analysis

**Transcription Service** (`api/services/transcription.py`):
- Tightly coupled to task manager through direct task object manipulation
- Progress updates via direct task modification
- No checkpoint/resume capability for long-running tasks
- File cleanup handled locally without coordination

**Translation Service** (`api/services/translation.py`):
- Similar tight coupling pattern
- Mock implementations for most translation backends
- No translation caching or optimization
- Entry-by-entry processing without batch optimization

## 2. Frontend Task Management Assessment

### React Query Integration (`voicetransl-ui/src/hooks/api.ts`)

**Current Capabilities:**
- Polling-based active task monitoring (2-second intervals)
- Task history retrieval with pagination
- Task statistics display
- Task cancellation functionality

**Missing Features:**
- Real-time WebSocket integration for instant updates
- Task retry from UI
- Bulk task operations
- Task priority adjustment
- Advanced filtering and search
- Task export/import functionality

### UI Components (`voicetransl-ui/src/components/features/TaskProgress.tsx`)

**Strengths:**
- Rich progress visualization
- Status-based styling and icons
- Expandable task details
- Responsive design

**Limitations:**
- Limited task actions (only cancel)
- No task grouping or categorization
- No task dependency visualization
- No bulk operations UI

### WebSocket Integration (`voicetransl-ui/src/services/websocket.ts`)

**Current Implementation:**
- Auto-reconnection with exponential backoff
- Ping/pong heartbeat mechanism
- Message type routing
- Task progress subscriptions

**Missing:**
- Server-side WebSocket broadcasting from task system
- Task event streaming
- Real-time task queue status
- Connection pooling for high-traffic scenarios

## 3. Gap Analysis: Current vs. Production Requirements

### Critical Missing Features

1. **Persistence & Durability**
   - No database backend for task storage
   - No state recovery after crashes
   - No transaction support for complex workflows

2. **Scalability & Performance**
   - No horizontal scaling support
   - No task queue optimization
   - No resource pooling or load balancing
   - No task batching or optimization

3. **Reliability & Fault Tolerance**
   - No retry mechanisms
   - No circuit breakers for external services
   - No dead letter queue handling
   - No graceful degradation

4. **Monitoring & Observability**
   - No structured logging
   - No metrics collection
   - No health checks for task system
   - No performance monitoring

5. **Security & Access Control**
   - No task-level permissions
   - No audit logging
   - No resource limits per user/tenant
   - No input validation beyond basic checks

## 4. Simple Service-Oriented Task Architecture

### Core Task Models

```python
# Simple data classes for task representation
@dataclass
class Task:
    """Simple task data class with essential fields"""
    
    id: str
    task_type: str
    status: str
    priority: int
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]] = None
    error_info: Optional[Dict[str, Any]] = None
    progress: float = 0.0
    current_step: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def update_progress(self, progress: float, current_step: str = "") -> None:
        """Update task progress and current step"""
        self.progress = progress
        self.current_step = current_step
        self.updated_at = datetime.utcnow()
        
    def start(self) -> None:
        """Mark task as started"""
        self.status = "running"
        self.started_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
    def complete(self, result: Dict[str, Any]) -> None:
        """Mark task as completed with result"""
        self.status = "completed"
        self.output_data = result
        self.completed_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        
    def fail(self, error: Exception) -> None:
        """Mark task as failed with error info"""
        self.status = "failed"
        self.error_info = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "timestamp": datetime.utcnow().isoformat()
        }
        self.updated_at = datetime.utcnow()
        
    def cancel(self) -> None:
        """Mark task as cancelled"""
        self.status = "cancelled"
        self.updated_at = datetime.utcnow()

@dataclass
class TaskType:
    """Task type definition with priority"""
    name: str
    category: str
    priority_weight: int = 1
    
    @classmethod
    def transcription(cls) -> 'TaskType':
        return cls("transcription", "processing", 2)
    
    @classmethod 
    def translation(cls) -> 'TaskType':
        return cls("translation", "processing", 2)
        
    @classmethod
    def workflow(cls) -> 'TaskType':
        return cls("workflow", "composite", 3)

# Task scheduling helper
class TaskScheduler:
    """Simple task scheduling with priority support"""
    
    def calculate_priority(self, task: Task) -> int:
        """Calculate task execution priority"""
        base_priority = task.priority
        
        # Boost priority for older tasks to prevent starvation
        age_hours = (datetime.utcnow() - task.created_at).total_seconds() / 3600
        age_boost = min(int(age_hours), 5)  # Max 5 priority boost
        
        return base_priority + age_boost
        
    def should_run_task(self, task: Task, current_load: int, max_concurrent: int) -> bool:
        """Determine if task should run based on current system load"""
        if current_load >= max_concurrent:
            return False
            
        # Always run high priority tasks if slots available
        if task.priority >= 3:
            return True
            
        # Run normal priority tasks if load is reasonable
        return current_load < max_concurrent * 0.8
```

### Simple Notification System

```python
# Simple task events for notifications
@dataclass
class TaskEvent:
    """Simple task event for notifications"""
    task_id: str
    event_type: str
    data: Dict[str, Any]
    timestamp: datetime = field(default_factory=datetime.utcnow)

# Direct notification broadcaster
class TaskNotificationService:
    """Handles task notifications without complex event bus"""
    
    def __init__(self, websocket_manager, metrics_collector, logger):
        self.websocket_manager = websocket_manager
        self.metrics_collector = metrics_collector
        self.logger = logger
        
    async def notify_task_started(self, task: Task) -> None:
        """Notify all interested parties that task started"""
        # Send WebSocket notification
        await self.websocket_manager.broadcast({
            "type": "task_started",
            "task_id": task.id,
            "task_type": task.task_type,
            "timestamp": task.started_at.isoformat()
        })
        
        # Update metrics
        self.metrics_collector.record_task_started(task.task_type)
        
        # Log event
        self.logger.info(f"Task {task.id} started", extra={
            "task_id": task.id,
            "task_type": task.task_type,
            "user_id": task.user_id
        })
        
    async def notify_progress_updated(self, task: Task) -> None:
        """Notify progress update"""
        # Send WebSocket notification
        await self.websocket_manager.broadcast({
            "type": "task_progress",
            "task_id": task.id,
            "progress": task.progress,
            "current_step": task.current_step,
            "timestamp": task.updated_at.isoformat()
        })
        
    async def notify_task_completed(self, task: Task) -> None:
        """Notify task completion"""
        # Send WebSocket notification
        await self.websocket_manager.broadcast({
            "type": "task_completed",
            "task_id": task.id,
            "status": task.status,
            "timestamp": task.completed_at.isoformat() if task.completed_at else None
        })
        
        # Update metrics
        duration = None
        if task.started_at and task.completed_at:
            duration = (task.completed_at - task.started_at).total_seconds()
            self.metrics_collector.record_task_completed(task.task_type, duration)
        
        # Log completion
        self.logger.info(f"Task {task.id} completed", extra={
            "task_id": task.id,
            "task_type": task.task_type,
            "status": task.status,
            "duration": duration
        })
```

### File-Based Task Storage

```python
class TaskStorage:
    """Simple file-based task storage with JSON persistence"""
    
    def __init__(self, storage_dir: str = "project/tasks"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.tasks_file = self.storage_dir / "tasks.json"
        self.backup_dir = self.storage_dir / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
    def save_task(self, task: Task) -> None:
        """Save single task to storage"""
        tasks = self.load_all_tasks()
        tasks[task.id] = self._task_to_dict(task)
        self._save_to_file(tasks)
        
    def load_task(self, task_id: str) -> Optional[Task]:
        """Load single task by ID"""
        tasks = self.load_all_tasks()
        task_data = tasks.get(task_id)
        return self._dict_to_task(task_data) if task_data else None
        
    def load_all_tasks(self) -> Dict[str, Dict[str, Any]]:
        """Load all tasks from storage"""
        try:
            if self.tasks_file.exists():
                with open(self.tasks_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load tasks: {e}")
            # Try to restore from backup
            return self._restore_from_backup()
        return {}
        
    def delete_task(self, task_id: str) -> bool:
        """Delete task from storage"""
        tasks = self.load_all_tasks()
        if task_id in tasks:
            del tasks[task_id]
            self._save_to_file(tasks)
            return True
        return False
        
    def find_tasks(self, status: Optional[str] = None, 
                   task_type: Optional[str] = None,
                   user_id: Optional[str] = None,
                   limit: Optional[int] = None) -> List[Task]:
        """Find tasks by criteria"""
        all_tasks = self.load_all_tasks()
        results = []
        
        for task_data in all_tasks.values():
            # Apply filters
            if status and task_data.get('status') != status:
                continue
            if task_type and task_data.get('task_type') != task_type:
                continue
            if user_id and task_data.get('user_id') != user_id:
                continue
                
            results.append(self._dict_to_task(task_data))
            
            if limit and len(results) >= limit:
                break
                
        return results
        
    def _save_to_file(self, tasks: Dict[str, Dict[str, Any]]) -> None:
        """Save tasks to file with backup"""
        # Create backup before saving
        if self.tasks_file.exists():
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_file = self.backup_dir / f"tasks_backup_{timestamp}.json"
            shutil.copy2(self.tasks_file, backup_file)
            
            # Keep only last 10 backups
            self._cleanup_old_backups()
            
        # Save new data
        temp_file = self.tasks_file.with_suffix('.tmp')
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, indent=2, default=self._json_serializer)
            
        # Atomic rename
        temp_file.replace(self.tasks_file)
        
    def _task_to_dict(self, task: Task) -> Dict[str, Any]:
        """Convert task to JSON-serializable dict"""
        return {
            "id": task.id,
            "task_type": task.task_type,
            "status": task.status,
            "priority": task.priority,
            "input_data": task.input_data,
            "output_data": task.output_data,
            "error_info": task.error_info,
            "progress": task.progress,
            "current_step": task.current_step,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "user_id": task.user_id,
            "metadata": task.metadata
        }
        
    def _dict_to_task(self, data: Dict[str, Any]) -> Task:
        """Convert dict to Task object"""
        return Task(
            id=data["id"],
            task_type=data["task_type"],
            status=data["status"],
            priority=data["priority"],
            input_data=data["input_data"],
            output_data=data.get("output_data"),
            error_info=data.get("error_info"),
            progress=data.get("progress", 0.0),
            current_step=data.get("current_step", ""),
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
            completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
            user_id=data.get("user_id"),
            metadata=data.get("metadata", {})
        )
        
    def _json_serializer(self, obj):
        """Custom JSON serializer for datetime objects"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
        
    def _restore_from_backup(self) -> Dict[str, Dict[str, Any]]:
        """Restore tasks from most recent backup"""
        backup_files = list(self.backup_dir.glob("tasks_backup_*.json"))
        if not backup_files:
            return {}
            
        # Get most recent backup
        latest_backup = max(backup_files, key=lambda f: f.stat().st_mtime)
        
        try:
            with open(latest_backup, 'r', encoding='utf-8') as f:
                logger.info(f"Restored tasks from backup: {latest_backup}")
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to restore from backup {latest_backup}: {e}")
            return {}
            
    def _cleanup_old_backups(self) -> None:
        """Keep only the 10 most recent backups"""
        backup_files = sorted(
            self.backup_dir.glob("tasks_backup_*.json"),
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )
        
        # Remove old backups beyond the limit
        for old_backup in backup_files[10:]:
            try:
                old_backup.unlink()
            except OSError:
                pass  # Ignore errors when cleaning up
```

## 5. Simple In-Memory Task Processing

### In-Memory Task Queue

```python
# Simple in-memory task queue with priority support
class InMemoryTaskQueue:
    """In-memory task queue with priority support and file backup"""
    
    def __init__(self, storage: TaskStorage):
        self.storage = storage
        self.pending_queue: List[Task] = []
        self.running_tasks: Dict[str, Task] = {}
        self.queue_lock = asyncio.Lock()
        
        # Load existing pending tasks from storage
        self._restore_pending_tasks()
        
    def _restore_pending_tasks(self) -> None:
        """Restore pending tasks from storage on startup"""
        pending_tasks = self.storage.find_tasks(status="pending")
        for task in pending_tasks:
            self.pending_queue.append(task)
            
        # Sort by priority and creation time
        self.pending_queue.sort(key=lambda t: (-t.priority, t.created_at))
        
    async def enqueue(self, task: Task) -> None:
        """Add task to queue"""
        async with self.queue_lock:
            self.pending_queue.append(task)
            
            # Sort by priority (higher first) then by creation time
            self.pending_queue.sort(key=lambda t: (-t.priority, t.created_at))
            
            # Save to storage
            self.storage.save_task(task)
            
    async def dequeue(self) -> Optional[Task]:
        """Get next task from queue"""
        async with self.queue_lock:
            if not self.pending_queue:
                return None
                
            # Get highest priority task
            task = self.pending_queue.pop(0)
            
            # Move to running tasks
            self.running_tasks[task.id] = task
            task.start()
            
            # Update storage
            self.storage.save_task(task)
            
            return task
            
    async def complete_task(self, task_id: str, result: Dict[str, Any]) -> None:
        """Mark task as completed"""
        async with self.queue_lock:
            if task_id in self.running_tasks:
                task = self.running_tasks.pop(task_id)
                task.complete(result)
                self.storage.save_task(task)
                
    async def fail_task(self, task_id: str, error: Exception) -> None:
        """Mark task as failed"""
        async with self.queue_lock:
            if task_id in self.running_tasks:
                task = self.running_tasks.pop(task_id)
                task.fail(error)
                self.storage.save_task(task)
                
    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a task (remove from queue or mark running task as cancelled)"""
        async with self.queue_lock:
            # Check if task is in pending queue
            for i, task in enumerate(self.pending_queue):
                if task.id == task_id:
                    task.cancel()
                    self.pending_queue.pop(i)
                    self.storage.save_task(task)
                    return True
                    
            # Check if task is currently running
            if task_id in self.running_tasks:
                task = self.running_tasks[task_id]
                task.cancel()
                self.storage.save_task(task)
                return True
                
            return False
            
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        return {
            "pending_count": len(self.pending_queue),
            "running_count": len(self.running_tasks),
            "pending_by_type": self._count_by_type(self.pending_queue),
            "running_by_type": self._count_by_type(list(self.running_tasks.values()))
        }
        
    def _count_by_type(self, tasks: List[Task]) -> Dict[str, int]:
        """Count tasks by type"""
        counts = {}
        for task in tasks:
            counts[task.task_type] = counts.get(task.task_type, 0) + 1
        return counts

# Simple worker pool
class TaskWorkerPool:
    """Simple worker pool for task execution"""
    
    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self.active_workers = 0
        self.is_running = False
        self.semaphore = asyncio.Semaphore(max_workers)
        
    async def start(self) -> None:
        """Start the worker pool"""
        self.is_running = True
        
    async def stop(self) -> None:
        """Stop the worker pool"""
        self.is_running = False
        
        # Wait for all workers to complete
        while self.active_workers > 0:
            await asyncio.sleep(0.1)
            
    async def submit_task(self, task: Task, processor_func) -> None:
        """Submit task for processing"""
        if not self.is_running:
            raise RuntimeError("Worker pool is not running")
            
        # Use semaphore to limit concurrent tasks
        await self.semaphore.acquire()
        
        # Start worker coroutine
        asyncio.create_task(self._worker_coroutine(task, processor_func))
        
    async def _worker_coroutine(self, task: Task, processor_func) -> None:
        """Worker coroutine that processes a single task"""
        self.active_workers += 1
        
        try:
            await processor_func(task)
        finally:
            self.active_workers -= 1
            self.semaphore.release()
```

### Simple Task Processing Pipeline

```python
# Simple task processor with basic hooks
class TaskProcessor:
    """Simple task processor with validation, metrics, and error handling"""
    
    def __init__(self, validator, metrics_collector, logger):
        self.validator = validator
        self.metrics = metrics_collector
        self.logger = logger
        self.processors = {}
        
    def register_processor(self, task_type: str, processor_func) -> None:
        """Register a processor function for a task type"""
        self.processors[task_type] = processor_func
        
    async def process_task(self, task: Task) -> Dict[str, Any]:
        """Process a task through the pipeline"""
        start_time = time.time()
        
        try:
            # Step 1: Validate input
            await self._validate_task(task)
            
            # Step 2: Find processor
            processor_func = self.processors.get(task.task_type)
            if not processor_func:
                raise ValueError(f"No processor registered for task type: {task.task_type}")
                
            # Step 3: Execute task
            result = await processor_func(task)
            
            # Step 4: Record success metrics
            duration = time.time() - start_time
            self.metrics.record_task_success(task.task_type, duration)
            
            return result
            
        except Exception as e:
            # Record failure metrics
            duration = time.time() - start_time
            self.metrics.record_task_failure(task.task_type, duration, str(e))
            
            # Log error
            self.logger.error(f"Task {task.id} failed: {e}", extra={
                "task_id": task.id,
                "task_type": task.task_type,
                "error": str(e),
                "duration": duration
            })
            
            raise
            
    async def _validate_task(self, task: Task) -> None:
        """Validate task input data"""
        if not task.input_data:
            raise ValueError("Task input data is required")
            
        # Type-specific validation
        if task.task_type == "transcription":
            await self._validate_transcription_task(task)
        elif task.task_type == "translation":
            await self._validate_translation_task(task)
            
    async def _validate_transcription_task(self, task: Task) -> None:
        """Validate transcription task input"""
        input_data = task.input_data
        
        # Check required fields
        if "audio_file" not in input_data and "video_file" not in input_data:
            raise ValueError("Audio or video file is required for transcription")
            
        # Validate file exists and is readable
        file_path = input_data.get("audio_file") or input_data.get("video_file")
        if file_path and not Path(file_path).exists():
            raise ValueError(f"Input file not found: {file_path}")
            
    async def _validate_translation_task(self, task: Task) -> None:
        """Validate translation task input"""
        input_data = task.input_data
        
        # Check required fields
        if "source_file" not in input_data:
            raise ValueError("Source file is required for translation")
            
        if "target_language" not in input_data:
            raise ValueError("Target language is required for translation")
            
        # Validate source file exists
        source_file = input_data["source_file"]
        if not Path(source_file).exists():
            raise ValueError(f"Source file not found: {source_file}")

# Simple checkpoint system for long-running tasks
class TaskCheckpointManager:
    """Simple file-based checkpointing for task recovery"""
    
    def __init__(self, checkpoint_dir: str = "project/checkpoints"):
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(exist_ok=True)
        
    async def save_checkpoint(self, task: Task, checkpoint_data: Dict[str, Any]) -> None:
        """Save task checkpoint to file"""
        checkpoint_file = self.checkpoint_dir / f"{task.id}.checkpoint.json"
        
        checkpoint = {
            "task_id": task.id,
            "task_type": task.task_type,
            "progress": task.progress,
            "current_step": task.current_step,
            "checkpoint_data": checkpoint_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        with open(checkpoint_file, 'w', encoding='utf-8') as f:
            json.dump(checkpoint, f, indent=2)
            
    async def load_checkpoint(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Load task checkpoint from file"""
        checkpoint_file = self.checkpoint_dir / f"{task_id}.checkpoint.json"
        
        if not checkpoint_file.exists():
            return None
            
        try:
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            logger.error(f"Failed to load checkpoint for task {task_id}: {e}")
            return None
            
    async def delete_checkpoint(self, task_id: str) -> None:
        """Delete task checkpoint file"""
        checkpoint_file = self.checkpoint_dir / f"{task_id}.checkpoint.json"
        
        try:
            if checkpoint_file.exists():
                checkpoint_file.unlink()
        except OSError as e:
            logger.warning(f"Failed to delete checkpoint for task {task_id}: {e}")
```

## 6. File-Based Task Persistence System

### JSON File Structure

```json
{
  "tasks": {
    "task-12345-uuid": {
      "id": "task-12345-uuid",
      "task_type": "transcription",
      "status": "completed",
      "priority": 2,
      "input_data": {
        "audio_file": "/path/to/audio.wav",
        "language": "auto",
        "model": "whisper-large"
      },
      "output_data": {
        "transcript_file": "/path/to/transcript.srt",
        "duration": 3600.5,
        "segments_count": 150
      },
      "error_info": null,
      "progress": 100.0,
      "current_step": "Completed",
      "created_at": "2025-08-08T10:00:00",
      "updated_at": "2025-08-08T10:30:00",
      "started_at": "2025-08-08T10:01:00",
      "completed_at": "2025-08-08T10:30:00",
      "user_id": "user123",
      "metadata": {
        "worker_id": "worker-1",
        "model_version": "v1.2.3",
        "processing_node": "node-01"
      }
    }
  },
  "metadata": {
    "version": "1.0",
    "last_updated": "2025-08-08T10:30:00",
    "total_tasks": 1,
    "schema_version": "1.0"
  }
}
```

### Enhanced Storage Implementation

```python
class TaskStorageManager:
    """Enhanced file-based task storage with improved reliability"""
    
    def __init__(self, storage_dir: str = "project/tasks"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        
        # Main files
        self.tasks_file = self.storage_dir / "tasks.json"
        self.metadata_file = self.storage_dir / "metadata.json"
        self.lock_file = self.storage_dir / "tasks.lock"
        
        # Backup system
        self.backup_dir = self.storage_dir / "backups"
        self.backup_dir.mkdir(exist_ok=True)
        
        # Archive for completed tasks
        self.archive_dir = self.storage_dir / "archive"
        self.archive_dir.mkdir(exist_ok=True)
        
        # File lock for concurrent access
        self.file_lock = asyncio.Lock()
        
    async def save_task(self, task: Task) -> None:
        """Save task with file locking and backup"""
        async with self.file_lock:
            tasks_data = await self._load_tasks_data()
            tasks_data["tasks"][task.id] = self._task_to_dict(task)
            
            # Update metadata
            tasks_data["metadata"]["last_updated"] = datetime.utcnow().isoformat()
            tasks_data["metadata"]["total_tasks"] = len(tasks_data["tasks"])
            
            await self._save_tasks_data(tasks_data)
            
    async def load_task(self, task_id: str) -> Optional[Task]:
        """Load single task by ID"""
        tasks_data = await self._load_tasks_data()
        task_data = tasks_data["tasks"].get(task_id)
        return self._dict_to_task(task_data) if task_data else None
        
    async def load_all_tasks(self) -> List[Task]:
        """Load all tasks from storage"""
        tasks_data = await self._load_tasks_data()
        tasks = []
        for task_data in tasks_data["tasks"].values():
            task = self._dict_to_task(task_data)
            if task:
                tasks.append(task)
        return tasks
        
    async def delete_task(self, task_id: str) -> bool:
        """Delete task from storage"""
        async with self.file_lock:
            tasks_data = await self._load_tasks_data()
            if task_id in tasks_data["tasks"]:
                del tasks_data["tasks"][task_id]
                tasks_data["metadata"]["total_tasks"] = len(tasks_data["tasks"])
                tasks_data["metadata"]["last_updated"] = datetime.utcnow().isoformat()
                await self._save_tasks_data(tasks_data)
                return True
        return False
        
    async def archive_old_tasks(self, older_than_days: int = 30) -> int:
        """Archive completed tasks older than specified days"""
        cutoff_date = datetime.utcnow() - timedelta(days=older_than_days)
        archived_count = 0
        
        async with self.file_lock:
            tasks_data = await self._load_tasks_data()
            tasks_to_archive = []
            
            for task_id, task_data in tasks_data["tasks"].items():
                if (task_data["status"] in ["completed", "failed", "cancelled"] and
                    datetime.fromisoformat(task_data["updated_at"]) < cutoff_date):
                    tasks_to_archive.append((task_id, task_data))
                    
            if tasks_to_archive:
                # Create archive file
                archive_date = datetime.utcnow().strftime("%Y%m%d")
                archive_file = self.archive_dir / f"tasks_archive_{archive_date}.json"
                
                # Load existing archive or create new
                archive_data = {"tasks": {}, "archived_at": datetime.utcnow().isoformat()}
                if archive_file.exists():
                    with open(archive_file, 'r', encoding='utf-8') as f:
                        archive_data = json.load(f)
                        
                # Add tasks to archive
                for task_id, task_data in tasks_to_archive:
                    archive_data["tasks"][task_id] = task_data
                    del tasks_data["tasks"][task_id]
                    archived_count += 1
                    
                # Save archive
                with open(archive_file, 'w', encoding='utf-8') as f:
                    json.dump(archive_data, f, indent=2)
                    
                # Update main tasks file
                tasks_data["metadata"]["total_tasks"] = len(tasks_data["tasks"])
                tasks_data["metadata"]["last_updated"] = datetime.utcnow().isoformat()
                await self._save_tasks_data(tasks_data)
                
        return archived_count
        
    async def _load_tasks_data(self) -> Dict[str, Any]:
        """Load tasks data with error recovery"""
        default_data = {
            "tasks": {},
            "metadata": {
                "version": "1.0",
                "last_updated": datetime.utcnow().isoformat(),
                "total_tasks": 0,
                "schema_version": "1.0"
            }
        }
        
        if not self.tasks_file.exists():
            return default_data
            
        try:
            with open(self.tasks_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Validate structure
            if not isinstance(data.get("tasks"), dict):
                raise ValueError("Invalid tasks data structure")
                
            return data
            
        except (json.JSONDecodeError, IOError, ValueError) as e:
            logger.error(f"Failed to load tasks data: {e}")
            
            # Try to restore from backup
            backup_data = await self._restore_from_backup()
            if backup_data:
                return backup_data
                
            logger.warning("Using default empty tasks data")
            return default_data
            
    async def _save_tasks_data(self, data: Dict[str, Any]) -> None:
        """Save tasks data with atomic write and backup"""
        # Create backup first
        if self.tasks_file.exists():
            timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
            backup_file = self.backup_dir / f"tasks_backup_{timestamp}.json"
            shutil.copy2(self.tasks_file, backup_file)
            
            # Cleanup old backups (keep last 20)
            await self._cleanup_old_backups()
            
        # Atomic write using temporary file
        temp_file = self.tasks_file.with_suffix('.tmp')
        
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, default=self._json_serializer)
                f.flush()
                os.fsync(f.fileno())  # Force write to disk
                
            # Atomic rename
            temp_file.replace(self.tasks_file)
            
        except Exception as e:
            # Clean up temp file on error
            if temp_file.exists():
                temp_file.unlink()
            raise e
            
    async def _restore_from_backup(self) -> Optional[Dict[str, Any]]:
        """Restore from most recent backup"""
        backup_files = list(self.backup_dir.glob("tasks_backup_*.json"))
        if not backup_files:
            return None
            
        # Get most recent backup
        latest_backup = max(backup_files, key=lambda f: f.stat().st_mtime)
        
        try:
            with open(latest_backup, 'r', encoding='utf-8') as f:
                data = json.load(f)
            logger.info(f"Restored tasks from backup: {latest_backup.name}")
            return data
        except Exception as e:
            logger.error(f"Failed to restore from backup: {e}")
            return None
            
    async def _cleanup_old_backups(self) -> None:
        """Keep only the 20 most recent backups"""
        backup_files = sorted(
            self.backup_dir.glob("tasks_backup_*.json"),
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )
        
        for old_backup in backup_files[20:]:
            try:
                old_backup.unlink()
            except OSError:
                pass
                
    def _task_to_dict(self, task: Task) -> Dict[str, Any]:
        """Convert task to dictionary"""
        return {
            "id": task.id,
            "task_type": task.task_type,
            "status": task.status,
            "priority": task.priority,
            "input_data": task.input_data,
            "output_data": task.output_data,
            "error_info": task.error_info,
            "progress": task.progress,
            "current_step": task.current_step,
            "created_at": task.created_at.isoformat(),
            "updated_at": task.updated_at.isoformat(),
            "started_at": task.started_at.isoformat() if task.started_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
            "user_id": task.user_id,
            "metadata": task.metadata
        }
        
    def _dict_to_task(self, data: Dict[str, Any]) -> Optional[Task]:
        """Convert dictionary to Task object"""
        try:
            return Task(
                id=data["id"],
                task_type=data["task_type"],
                status=data["status"],
                priority=data["priority"],
                input_data=data["input_data"],
                output_data=data.get("output_data"),
                error_info=data.get("error_info"),
                progress=data.get("progress", 0.0),
                current_step=data.get("current_step", ""),
                created_at=datetime.fromisoformat(data["created_at"]),
                updated_at=datetime.fromisoformat(data["updated_at"]),
                started_at=datetime.fromisoformat(data["started_at"]) if data.get("started_at") else None,
                completed_at=datetime.fromisoformat(data["completed_at"]) if data.get("completed_at") else None,
                user_id=data.get("user_id"),
                metadata=data.get("metadata", {})
            )
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to deserialize task: {e}")
            return None
            
    def _json_serializer(self, obj):
        """Custom JSON serializer"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj)} is not JSON serializable")
```

## 7. Simple Task Service Implementation

### Core Task Service

```python
class TaskService:
    """Main task management service with simple architecture"""
    
    def __init__(self, storage_manager: TaskStorageManager, 
                 notification_service: TaskNotificationService,
                 processor: TaskProcessor):
        self.storage = storage_manager
        self.notifications = notification_service
        self.processor = processor
        self.task_queue = InMemoryTaskQueue(storage_manager)
        self.scheduler = TaskScheduler()
        self.checkpoint_manager = TaskCheckpointManager()
        
        # Retry configuration
        self.max_retries = 3
        self.retry_delays = [1, 5, 15]  # seconds
        
    async def create_task(self, task_data: Dict[str, Any], user_id: str = None) -> Task:
        """Create a new task"""
        # Generate unique task ID
        task_id = f"task-{uuid.uuid4()}"
        
        # Create task object
        task = Task(
            id=task_id,
            task_type=task_data["task_type"],
            priority=task_data.get("priority", 1),
            input_data=task_data["input_data"],
            user_id=user_id,
            metadata={
                "created_by_service": "TaskService",
                "retry_count": 0
            }
        )
        
        # Validate task
        await self.processor._validate_task(task)
        
        # Save to storage
        await self.storage.save_task(task)
        
        # Add to queue
        await self.task_queue.enqueue(task)
        
        # Send notification
        await self.notifications.notify_task_created(task)
        
        return task
        
    async def get_task(self, task_id: str) -> Optional[Task]:
        """Get task by ID"""
        return await self.storage.load_task(task_id)
        
    async def list_tasks(self, status: Optional[str] = None,
                        task_type: Optional[str] = None,
                        user_id: Optional[str] = None,
                        limit: Optional[int] = None) -> List[Task]:
        """List tasks with optional filters"""
        return await self.storage.find_tasks(status, task_type, user_id, limit)
        
    async def cancel_task(self, task_id: str, user_id: str = None) -> bool:
        """Cancel a task"""
        task = await self.storage.load_task(task_id)
        if not task:
            return False
            
        # Check permissions
        if user_id and task.user_id != user_id:
            raise PermissionError("User can only cancel their own tasks")
            
        # Cancel in queue
        success = await self.task_queue.cancel_task(task_id)
        
        if success:
            await self.notifications.notify_task_cancelled(task)
            
        return success
        
    async def retry_task(self, task_id: str, user_id: str = None) -> bool:
        """Retry a failed task"""
        task = await self.storage.load_task(task_id)
        if not task or task.status != "failed":
            return False
            
        # Check permissions
        if user_id and task.user_id != user_id:
            raise PermissionError("User can only retry their own tasks")
            
        # Check retry limit
        retry_count = task.metadata.get("retry_count", 0)
        if retry_count >= self.max_retries:
            logger.warning(f"Task {task_id} exceeded max retries ({self.max_retries})")
            return False
            
        # Reset task state
        task.status = "pending"
        task.error_info = None
        task.progress = 0.0
        task.current_step = ""
        task.started_at = None
        task.completed_at = None
        task.metadata["retry_count"] = retry_count + 1
        task.updated_at = datetime.utcnow()
        
        # Save and re-queue
        await self.storage.save_task(task)
        await self.task_queue.enqueue(task)
        
        await self.notifications.notify_task_retried(task)
        
        return True
        
    async def process_next_task(self) -> Optional[Task]:
        """Process the next available task"""
        task = await self.task_queue.dequeue()
        if not task:
            return None
            
        try:
            await self.notifications.notify_task_started(task)
            
            # Process with automatic progress updates
            result = await self._process_task_with_progress(task)
            
            # Complete task
            await self.task_queue.complete_task(task.id, result)
            await self.notifications.notify_task_completed(task)
            
            return task
            
        except Exception as e:
            # Fail task
            await self.task_queue.fail_task(task.id, e)
            await self.notifications.notify_task_failed(task, e)
            
            # Schedule retry if appropriate
            await self._schedule_retry_if_applicable(task, e)
            
            raise e
            
    async def _process_task_with_progress(self, task: Task) -> Dict[str, Any]:
        """Process task with automatic progress updates"""
        # Create progress callback
        async def progress_callback(progress: float, step: str = ""):
            task.update_progress(progress, step)
            await self.storage.save_task(task)
            await self.notifications.notify_progress_updated(task)
            
        # Set progress callback in processor
        original_callback = getattr(self.processor, 'progress_callback', None)
        self.processor.progress_callback = progress_callback
        
        try:
            # Create checkpoint before processing
            checkpoint_data = {
                "task_id": task.id,
                "input_data": task.input_data,
                "started_at": task.started_at.isoformat() if task.started_at else None
            }
            await self.checkpoint_manager.save_checkpoint(task, checkpoint_data)
            
            # Process the task
            result = await self.processor.process_task(task)
            
            # Clean up checkpoint on success
            await self.checkpoint_manager.delete_checkpoint(task.id)
            
            return result
            
        finally:
            # Restore original callback
            self.processor.progress_callback = original_callback
            
    async def _schedule_retry_if_applicable(self, task: Task, error: Exception) -> None:
        """Schedule task retry if appropriate"""
        retry_count = task.metadata.get("retry_count", 0)
        
        if retry_count < self.max_retries:
            # Determine if error is retryable
            if self._is_retryable_error(error):
                delay = self.retry_delays[min(retry_count, len(self.retry_delays) - 1)]
                
                # Schedule retry after delay
                asyncio.create_task(self._delayed_retry(task.id, delay))
                
                logger.info(f"Scheduled retry for task {task.id} in {delay} seconds (attempt {retry_count + 1})")
                
    def _is_retryable_error(self, error: Exception) -> bool:
        """Determine if an error is retryable"""
        # Network errors, temporary file issues, etc.
        retryable_errors = [
            ConnectionError,
            TimeoutError,
            IOError,
            OSError
        ]
        
        return any(isinstance(error, err_type) for err_type in retryable_errors)
        
    async def _delayed_retry(self, task_id: str, delay: int) -> None:
        """Retry task after delay"""
        await asyncio.sleep(delay)
        
        try:
            await self.retry_task(task_id)
        except Exception as e:
            logger.error(f"Failed to retry task {task_id}: {e}")
            
    async def get_task_statistics(self, user_id: str = None) -> Dict[str, Any]:
        """Get task statistics"""
        all_tasks = await self.storage.load_all_tasks()
        
        # Filter by user if specified
        if user_id:
            all_tasks = [t for t in all_tasks if t.user_id == user_id]
            
        stats = {
            "total_tasks": len(all_tasks),
            "by_status": {},
            "by_type": {},
            "average_duration": 0.0,
            "success_rate": 0.0
        }
        
        # Calculate statistics
        total_duration = 0
        completed_count = 0
        success_count = 0
        
        for task in all_tasks:
            # Count by status
            stats["by_status"][task.status] = stats["by_status"].get(task.status, 0) + 1
            
            # Count by type
            stats["by_type"][task.task_type] = stats["by_type"].get(task.task_type, 0) + 1
            
            # Calculate duration for completed/failed tasks
            if task.started_at and (task.completed_at or task.status in ["failed", "cancelled"]):
                end_time = task.completed_at or task.updated_at
                duration = (end_time - task.started_at).total_seconds()
                total_duration += duration
                completed_count += 1
                
                if task.status == "completed":
                    success_count += 1
                    
        # Calculate averages
        if completed_count > 0:
            stats["average_duration"] = total_duration / completed_count
            stats["success_rate"] = success_count / completed_count
            
        return stats
        
    async def cleanup_old_tasks(self, older_than_days: int = 30) -> int:
        """Clean up old completed tasks"""
        return await self.storage.archive_old_tasks(older_than_days)
        
    async def recover_interrupted_tasks(self) -> List[Task]:
        """Recover tasks that were interrupted by system restart"""
        # Find tasks that were running when system went down
        running_tasks = await self.storage.find_tasks(status="running")
        recovered_tasks = []
        
        for task in running_tasks:
            logger.info(f"Recovering interrupted task: {task.id}")
            
            # Check if checkpoint exists
            checkpoint = await self.checkpoint_manager.load_checkpoint(task.id)
            
            if checkpoint:
                # Task can potentially be resumed
                logger.info(f"Found checkpoint for task {task.id}")
                
                # For now, reset to pending (could be enhanced to resume from checkpoint)
                task.status = "pending"
                task.current_step = "Recovered from checkpoint"
                task.metadata["recovered"] = True
                task.updated_at = datetime.utcnow()
                
                await self.storage.save_task(task)
                await self.task_queue.enqueue(task)
                recovered_tasks.append(task)
            else:
                # No checkpoint, mark as failed
                task.fail(Exception("Task interrupted by system restart"))
                await self.storage.save_task(task)
                
        logger.info(f"Recovered {len(recovered_tasks)} interrupted tasks")
        return recovered_tasks
```

### Simple Monitoring and Logging

```python
# Simple structured logging
class TaskLogger:
    """Simple structured logger for task operations"""
    
    def __init__(self, logger_name: str = "task_system"):
        self.logger = logging.getLogger(logger_name)
        
        # Configure structured logging
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(task_id)s - %(task_type)s',
            defaults={'task_id': 'N/A', 'task_type': 'N/A'}
        )
        
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
        
    def log_task_started(self, task: Task) -> None:
        self.logger.info(
            f"Task started: {task.id}",
            extra={
                "task_id": task.id,
                "task_type": task.task_type,
                "priority": task.priority,
                "user_id": task.user_id,
                "event_type": "task_started"
            }
        )
        
    def log_task_progress(self, task: Task) -> None:
        self.logger.info(
            f"Task progress: {task.id} - {task.progress:.1f}%",
            extra={
                "task_id": task.id,
                "task_type": task.task_type,
                "progress_percent": task.progress,
                "current_step": task.current_step,
                "event_type": "task_progress"
            }
        )
        
    def log_task_completed(self, task: Task, duration: float) -> None:
        self.logger.info(
            f"Task completed: {task.id} in {duration:.2f}s",
            extra={
                "task_id": task.id,
                "task_type": task.task_type,
                "duration_seconds": duration,
                "status": task.status,
                "event_type": "task_completed"
            }
        )
        
    def log_task_failed(self, task: Task, error: Exception, duration: float = None) -> None:
        self.logger.error(
            f"Task failed: {task.id} - {str(error)}",
            extra={
                "task_id": task.id,
                "task_type": task.task_type,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "duration_seconds": duration,
                "event_type": "task_failed"
            },
            exc_info=True
        )
```

### Simple Metrics Collection

```python
# Simple metrics without external dependencies
class TaskMetricsCollector:
    """Simple metrics collector for task system"""
    
    def __init__(self, metrics_file: str = "project/tasks/metrics.json"):
        self.metrics_file = Path(metrics_file)
        self.metrics_file.parent.mkdir(parents=True, exist_ok=True)
        self.metrics_lock = asyncio.Lock()
        
        # Initialize metrics structure
        self.metrics = {
            "tasks": {
                "total_created": 0,
                "total_completed": 0,
                "total_failed": 0,
                "by_type": {},
                "by_status": {}
            },
            "performance": {
                "average_duration": {},
                "success_rate": {},
                "throughput": {
                    "hourly": {},
                    "daily": {}
                }
            },
            "system": {
                "uptime_seconds": 0,
                "last_updated": datetime.utcnow().isoformat(),
                "active_workers": 0,
                "queue_depth": 0
            }
        }
        
        # Load existing metrics
        self._load_metrics()
        
        # Start periodic save
        asyncio.create_task(self._periodic_save())
        
    def record_task_created(self, task_type: str) -> None:
        """Record task creation"""
        self.metrics["tasks"]["total_created"] += 1
        self._increment_counter(f"tasks.by_type.{task_type}.created")
        self._update_throughput("created")
        
    def record_task_started(self, task_type: str) -> None:
        """Record task start"""
        self._increment_counter(f"tasks.by_type.{task_type}.started")
        self._increment_counter("tasks.by_status.running")
        
    def record_task_completed(self, task_type: str, duration: float) -> None:
        """Record task completion"""
        self.metrics["tasks"]["total_completed"] += 1
        self._increment_counter(f"tasks.by_type.{task_type}.completed")
        self._increment_counter("tasks.by_status.completed")
        self._decrement_counter("tasks.by_status.running")
        
        # Update duration statistics
        self._update_duration_stats(task_type, duration)
        self._update_throughput("completed")
        
    def record_task_failed(self, task_type: str, duration: float = None, error: str = None) -> None:
        """Record task failure"""
        self.metrics["tasks"]["total_failed"] += 1
        self._increment_counter(f"tasks.by_type.{task_type}.failed")
        self._increment_counter("tasks.by_status.failed")
        self._decrement_counter("tasks.by_status.running")
        
        if duration:
            self._update_duration_stats(task_type, duration)
            
    def update_system_metrics(self, active_workers: int, queue_depth: int) -> None:
        """Update system metrics"""
        self.metrics["system"]["active_workers"] = active_workers
        self.metrics["system"]["queue_depth"] = queue_depth
        self.metrics["system"]["last_updated"] = datetime.utcnow().isoformat()
        
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get current metrics summary"""
        return {
            "tasks_created": self.metrics["tasks"]["total_created"],
            "tasks_completed": self.metrics["tasks"]["total_completed"],
            "tasks_failed": self.metrics["tasks"]["total_failed"],
            "success_rate": self._calculate_success_rate(),
            "average_duration": self._calculate_average_duration(),
            "active_workers": self.metrics["system"]["active_workers"],
            "queue_depth": self.metrics["system"]["queue_depth"],
            "uptime_hours": self.metrics["system"]["uptime_seconds"] / 3600
        }
        
    def _increment_counter(self, path: str) -> None:
        """Increment counter at dotted path"""
        keys = path.split('.')
        current = self.metrics
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
            
        last_key = keys[-1]
        current[last_key] = current.get(last_key, 0) + 1
        
    def _decrement_counter(self, path: str) -> None:
        """Decrement counter at dotted path"""
        keys = path.split('.')
        current = self.metrics
        
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]
            
        last_key = keys[-1]
        current[last_key] = max(0, current.get(last_key, 0) - 1)
        
    def _update_duration_stats(self, task_type: str, duration: float) -> None:
        """Update duration statistics"""
        perf = self.metrics["performance"]
        
        if "average_duration" not in perf:
            perf["average_duration"] = {}
            
        if task_type not in perf["average_duration"]:
            perf["average_duration"][task_type] = {"total": 0.0, "count": 0}
            
        stats = perf["average_duration"][task_type]
        stats["total"] += duration
        stats["count"] += 1
        
    def _update_throughput(self, event_type: str) -> None:
        """Update throughput metrics"""
        now = datetime.utcnow()
        hour_key = now.strftime("%Y-%m-%d_%H")
        day_key = now.strftime("%Y-%m-%d")
        
        perf = self.metrics["performance"]["throughput"]
        
        # Update hourly
        if "hourly" not in perf:
            perf["hourly"] = {}
        if hour_key not in perf["hourly"]:
            perf["hourly"][hour_key] = {}
        perf["hourly"][hour_key][event_type] = perf["hourly"][hour_key].get(event_type, 0) + 1
        
        # Update daily
        if "daily" not in perf:
            perf["daily"] = {}
        if day_key not in perf["daily"]:
            perf["daily"][day_key] = {}
        perf["daily"][day_key][event_type] = perf["daily"][day_key].get(event_type, 0) + 1
        
    def _calculate_success_rate(self) -> float:
        """Calculate overall success rate"""
        completed = self.metrics["tasks"]["total_completed"]
        failed = self.metrics["tasks"]["total_failed"]
        total = completed + failed
        
        return (completed / total * 100) if total > 0 else 0.0
        
    def _calculate_average_duration(self) -> float:
        """Calculate average task duration across all types"""
        perf = self.metrics["performance"].get("average_duration", {})
        
        total_duration = 0.0
        total_count = 0
        
        for stats in perf.values():
            if isinstance(stats, dict) and "total" in stats and "count" in stats:
                total_duration += stats["total"]
                total_count += stats["count"]
                
        return (total_duration / total_count) if total_count > 0 else 0.0
        
    def _load_metrics(self) -> None:
        """Load metrics from file"""
        if self.metrics_file.exists():
            try:
                with open(self.metrics_file, 'r') as f:
                    saved_metrics = json.load(f)
                    
                # Merge with default structure
                self._deep_merge(self.metrics, saved_metrics)
                
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Failed to load metrics: {e}")
                
    def _deep_merge(self, target: dict, source: dict) -> None:
        """Deep merge source into target"""
        for key, value in source.items():
            if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                self._deep_merge(target[key], value)
            else:
                target[key] = value
                
    async def _periodic_save(self) -> None:
        """Periodically save metrics to file"""
        while True:
            try:
                await asyncio.sleep(300)  # Save every 5 minutes
                await self._save_metrics()
            except Exception as e:
                logger.error(f"Failed to save metrics: {e}")
                
    async def _save_metrics(self) -> None:
        """Save metrics to file"""
        async with self.metrics_lock:
            try:
                # Update uptime
                self.metrics["system"]["uptime_seconds"] += 300  # 5 minutes
                
                # Save to file
                temp_file = self.metrics_file.with_suffix('.tmp')
                with open(temp_file, 'w') as f:
                    json.dump(self.metrics, f, indent=2)
                    
                temp_file.replace(self.metrics_file)
                
            except Exception as e:
                logger.error(f"Failed to save metrics: {e}")
```

### Simple Health Monitoring

```python
class TaskSystemHealthChecker:
    """Simple health monitoring for task system components"""
    
    def __init__(self, storage: TaskStorageManager, 
                 task_queue: InMemoryTaskQueue,
                 worker_pool: TaskWorkerPool):
        self.storage = storage
        self.task_queue = task_queue
        self.worker_pool = worker_pool
        
    async def check_health(self) -> Dict[str, Any]:
        """Check overall system health"""
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {}
        }
        
        # Check storage system
        storage_health = await self._check_storage()
        health_status["checks"]["storage"] = storage_health
        
        # Check task queue
        queue_health = await self._check_task_queue()
        health_status["checks"]["queue"] = queue_health
        
        # Check worker pool
        worker_health = await self._check_worker_pool()
        health_status["checks"]["workers"] = worker_health
        
        # Check disk space
        disk_health = await self._check_disk_space()
        health_status["checks"]["disk"] = disk_health
        
        # Determine overall status
        failed_checks = [name for name, check in health_status["checks"].items() 
                        if not check["healthy"]]
                        
        if failed_checks:
            health_status["status"] = "unhealthy"
            health_status["failed_checks"] = failed_checks
            
        return health_status
        
    async def _check_storage(self) -> Dict[str, Any]:
        """Check storage system health"""
        try:
            # Test file system access
            test_file = self.storage.storage_dir / "health_check.tmp"
            
            # Write test
            with open(test_file, 'w') as f:
                f.write("health_check")
                
            # Read test
            with open(test_file, 'r') as f:
                content = f.read()
                
            # Cleanup
            test_file.unlink()
            
            if content != "health_check":
                raise IOError("File content mismatch")
                
            # Check backup directory
            backup_files = list(self.storage.backup_dir.glob("*.json"))
            
            return {
                "healthy": True,
                "message": "Storage system operational",
                "backup_files_count": len(backup_files),
                "storage_dir": str(self.storage.storage_dir)
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Storage system error: {str(e)}",
                "error_type": type(e).__name__
            }
            
    async def _check_task_queue(self) -> Dict[str, Any]:
        """Check task queue health"""
        try:
            stats = self.task_queue.get_queue_stats()
            
            # Check for queue buildup
            pending_count = stats["pending_count"]
            max_pending = 1000  # Threshold for concern
            
            healthy = pending_count < max_pending
            message = "Queue operational" if healthy else f"High pending task count: {pending_count}"
            
            return {
                "healthy": healthy,
                "message": message,
                "pending_tasks": pending_count,
                "running_tasks": stats["running_count"],
                "queue_stats": stats
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Queue system error: {str(e)}",
                "error_type": type(e).__name__
            }
            
    async def _check_worker_pool(self) -> Dict[str, Any]:
        """Check worker pool health"""
        try:
            active_workers = self.worker_pool.active_workers
            max_workers = self.worker_pool.max_workers
            
            # Check if workers are available
            healthy = self.worker_pool.is_running and active_workers <= max_workers
            
            utilization = (active_workers / max_workers * 100) if max_workers > 0 else 0
            
            return {
                "healthy": healthy,
                "message": f"Worker pool operational ({active_workers}/{max_workers} workers active)",
                "active_workers": active_workers,
                "max_workers": max_workers,
                "utilization_percent": round(utilization, 1),
                "is_running": self.worker_pool.is_running
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Worker pool error: {str(e)}",
                "error_type": type(e).__name__
            }
            
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            storage_path = self.storage.storage_dir
            stat = storage_path.stat() if storage_path.exists() else None
            
            if not stat:
                return {
                    "healthy": False,
                    "message": "Storage directory does not exist"
                }
                
            # Get disk usage (platform-specific)
            import shutil
            total, used, free = shutil.disk_usage(storage_path)
            
            # Convert to GB
            total_gb = total / (1024**3)
            used_gb = used / (1024**3)
            free_gb = free / (1024**3)
            
            # Check if we have enough free space (at least 1GB)
            min_free_gb = 1.0
            healthy = free_gb >= min_free_gb
            
            return {
                "healthy": healthy,
                "message": f"Disk space: {free_gb:.2f}GB free of {total_gb:.2f}GB total",
                "total_gb": round(total_gb, 2),
                "used_gb": round(used_gb, 2),
                "free_gb": round(free_gb, 2),
                "usage_percent": round((used_gb / total_gb * 100), 1)
            }
            
        except Exception as e:
            return {
                "healthy": False,
                "message": f"Disk space check error: {str(e)}",
                "error_type": type(e).__name__
            }
```

## 8. Simple Security and Access Control

### Basic Permission System

```python
class TaskPermissionService:
    """Simple role-based access control for tasks"""
    
    def __init__(self):
        # Simple user roles (could be loaded from config file)
        self.user_roles = {}
        self.role_permissions = {
            "admin": ["task:*:*"],  # Admin can do anything
            "user": ["task:own:*"],  # Users can manage their own tasks
            "readonly": ["task:*:read"]  # Read-only access
        }
        
    def assign_user_role(self, user_id: str, role: str) -> None:
        """Assign role to user"""
        if role not in self.role_permissions:
            raise ValueError(f"Unknown role: {role}")
        self.user_roles[user_id] = role
        
    def get_user_role(self, user_id: str) -> str:
        """Get user role"""
        return self.user_roles.get(user_id, "user")  # Default to 'user' role
        
    def can_create_task(self, user_id: str, task_type: str) -> bool:
        """Check if user can create task of given type"""
        role = self.get_user_role(user_id)
        permissions = self.role_permissions.get(role, [])
        
        return self._check_permission(permissions, f"task:{task_type}:create")
        
    def can_view_task(self, user_id: str, task: Task) -> bool:
        """Check if user can view task"""
        role = self.get_user_role(user_id)
        
        # Admin can view all tasks
        if role == "admin":
            return True
            
        # Users can view their own tasks
        if task.user_id == user_id:
            return True
            
        # Check read-only permission
        permissions = self.role_permissions.get(role, [])
        return self._check_permission(permissions, f"task:*:read")
        
    def can_cancel_task(self, user_id: str, task: Task) -> bool:
        """Check if user can cancel task"""
        # Can't cancel completed tasks
        if task.status in ["completed", "failed", "cancelled"]:
            return False
            
        role = self.get_user_role(user_id)
        
        # Admin can cancel any task
        if role == "admin":
            return True
            
        # Users can cancel their own tasks
        return task.user_id == user_id
        
    def can_retry_task(self, user_id: str, task: Task) -> bool:
        """Check if user can retry task"""
        # Can only retry failed tasks
        if task.status != "failed":
            return False
            
        role = self.get_user_role(user_id)
        
        # Admin can retry any task
        if role == "admin":
            return True
            
        # Users can retry their own tasks
        return task.user_id == user_id
        
    def _check_permission(self, permissions: List[str], required_permission: str) -> bool:
        """Check if required permission is granted"""
        for permission in permissions:
            if self._permission_matches(permission, required_permission):
                return True
        return False
        
    def _permission_matches(self, granted: str, required: str) -> bool:
        """Check if granted permission matches required permission"""
        granted_parts = granted.split(":")
        required_parts = required.split(":")
        
        if len(granted_parts) != len(required_parts):
            return False
            
        for granted_part, required_part in zip(granted_parts, required_parts):
            if granted_part != "*" and granted_part != required_part:
                return False
                
        return True

# Simple resource limits
class TaskResourceLimiter:
    """Simple resource limits per user"""
    
    def __init__(self):
        # Default limits
        self.default_limits = {
            "max_concurrent_tasks": 5,
            "max_daily_tasks": 100,
            "max_file_size_mb": 500,
            "max_task_duration_minutes": 120
        }
        
        # Per-user custom limits
        self.user_limits = {}
        
    def set_user_limits(self, user_id: str, limits: Dict[str, int]) -> None:
        """Set custom limits for user"""
        self.user_limits[user_id] = limits
        
    def get_user_limits(self, user_id: str) -> Dict[str, int]:
        """Get effective limits for user"""
        user_specific = self.user_limits.get(user_id, {})
        limits = self.default_limits.copy()
        limits.update(user_specific)
        return limits
        
    async def check_limits(self, user_id: str, task_type: str, 
                          input_data: Dict[str, Any],
                          storage: TaskStorageManager) -> Dict[str, Any]:
        """Check if user can create task within limits"""
        limits = self.get_user_limits(user_id)
        result = {"allowed": True, "violations": []}
        
        # Check concurrent tasks
        running_tasks = await storage.find_tasks(status="running", user_id=user_id)
        if len(running_tasks) >= limits["max_concurrent_tasks"]:
            result["allowed"] = False
            result["violations"].append(
                f"Too many concurrent tasks: {len(running_tasks)}/{limits['max_concurrent_tasks']}"
            )
            
        # Check daily task limit
        today = datetime.utcnow().date()
        today_tasks = await storage.find_tasks(user_id=user_id)
        today_count = len([t for t in today_tasks if t.created_at.date() == today])
        
        if today_count >= limits["max_daily_tasks"]:
            result["allowed"] = False
            result["violations"].append(
                f"Daily task limit exceeded: {today_count}/{limits['max_daily_tasks']}"
            )
            
        # Check file size for relevant tasks
        if "file_size" in input_data:
            file_size_mb = input_data["file_size"] / (1024 * 1024)
            if file_size_mb > limits["max_file_size_mb"]:
                result["allowed"] = False
                result["violations"].append(
                    f"File size too large: {file_size_mb:.1f}MB/{limits['max_file_size_mb']}MB"
                )
                
        return result
```

### Simple Input Validation

```python
class TaskInputValidator:
    """Simple input validation for task creation"""
    
    def __init__(self):
        self.MAX_FILE_SIZE = 1024 * 1024 * 1024  # 1GB
        self.MAX_STRING_LENGTH = 10000
        self.ALLOWED_FILE_EXTENSIONS = {
            "transcription": [".wav", ".mp3", ".m4a", ".flac", ".mp4", ".mkv", ".avi"],
            "translation": [".txt", ".json", ".srt", ".lrc", ".ass"]
        }
        
    async def validate(self, task_type: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate task input data"""
        result = {"valid": True, "errors": [], "warnings": []}
        
        # Basic structure validation
        if not isinstance(input_data, dict):
            result["valid"] = False
            result["errors"].append("Input data must be a dictionary")
            return result
            
        # Type-specific validation
        if task_type == "transcription":
            await self._validate_transcription_input(input_data, result)
        elif task_type == "translation":
            await self._validate_translation_input(input_data, result)
        else:
            result["warnings"].append(f"No specific validation for task type: {task_type}")
            
        # General security checks
        await self._validate_security(input_data, result)
        
        return result
        
    async def _validate_transcription_input(self, input_data: Dict[str, Any], 
                                           result: Dict[str, Any]) -> None:
        """Validate transcription task input"""
        # Required fields
        required_fields = ["audio_file"]
        for field in required_fields:
            if field not in input_data:
                result["valid"] = False
                result["errors"].append(f"Missing required field: {field}")
                
        # File validation
        if "audio_file" in input_data:
            file_path = input_data["audio_file"]
            
            # Check file exists
            if not Path(file_path).exists():
                result["valid"] = False
                result["errors"].append(f"Audio file not found: {file_path}")
            else:
                # Check file extension
                file_ext = Path(file_path).suffix.lower()
                allowed_exts = self.ALLOWED_FILE_EXTENSIONS["transcription"]
                if file_ext not in allowed_exts:
                    result["warnings"].append(
                        f"Unusual file extension: {file_ext}. Expected: {', '.join(allowed_exts)}"
                    )
                    
                # Check file size
                file_size = Path(file_path).stat().st_size
                if file_size > self.MAX_FILE_SIZE:
                    result["valid"] = False
                    result["errors"].append(
                        f"File too large: {file_size / (1024**2):.1f}MB (max: {self.MAX_FILE_SIZE / (1024**2):.1f}MB)"
                    )
                    
        # Optional field validation
        if "language" in input_data:
            language = input_data["language"]
            if not isinstance(language, str) or len(language) > 10:
                result["valid"] = False
                result["errors"].append("Language must be a string of max 10 characters")
                
        if "model" in input_data:
            model = input_data["model"]
            allowed_models = ["whisper-tiny", "whisper-base", "whisper-small", 
                            "whisper-medium", "whisper-large", "anime-whisper"]
            if model not in allowed_models:
                result["warnings"].append(f"Unknown model: {model}")
                
    async def _validate_translation_input(self, input_data: Dict[str, Any], 
                                          result: Dict[str, Any]) -> None:
        """Validate translation task input"""
        # Required fields
        required_fields = ["source_file", "target_language"]
        for field in required_fields:
            if field not in input_data:
                result["valid"] = False
                result["errors"].append(f"Missing required field: {field}")
                
        # File validation
        if "source_file" in input_data:
            file_path = input_data["source_file"]
            
            if not Path(file_path).exists():
                result["valid"] = False
                result["errors"].append(f"Source file not found: {file_path}")
            else:
                # Check file extension
                file_ext = Path(file_path).suffix.lower()
                allowed_exts = self.ALLOWED_FILE_EXTENSIONS["translation"]
                if file_ext not in allowed_exts:
                    result["valid"] = False
                    result["errors"].append(
                        f"Unsupported file type: {file_ext}. Allowed: {', '.join(allowed_exts)}"
                    )
                    
        # Language validation
        if "target_language" in input_data:
            target_lang = input_data["target_language"]
            common_languages = [
                "en", "zh", "ja", "ko", "es", "fr", "de", "it", "pt", "ru", "ar"
            ]
            if target_lang not in common_languages:
                result["warnings"].append(f"Uncommon target language: {target_lang}")
                
        # Model/backend validation
        if "translator" in input_data:
            translator = input_data["translator"]
            allowed_translators = ["gpt", "sakura", "deepseek", "gemini", "offline"]
            if translator not in allowed_translators:
                result["warnings"].append(f"Unknown translator: {translator}")
                
    async def _validate_security(self, input_data: Dict[str, Any], 
                                result: Dict[str, Any]) -> None:
        """Basic security validation"""
        # Check for path traversal attempts
        for key, value in input_data.items():
            if isinstance(value, str):
                # Check string length
                if len(value) > self.MAX_STRING_LENGTH:
                    result["valid"] = False
                    result["errors"].append(f"Field {key} too long: {len(value)} chars (max: {self.MAX_STRING_LENGTH})")
                    
                # Check for path traversal
                if ".." in value or value.startswith("/") or ":\\" in value:
                    suspicious_path = True
                    # Allow legitimate file paths
                    if key.endswith("_file") and Path(value).exists():
                        suspicious_path = False
                        
                    if suspicious_path:
                        result["warnings"].append(f"Potentially suspicious path in {key}: {value}")
                        
                # Check for script injection attempts
                dangerous_patterns = ["<script", "javascript:", "eval(", "exec(", "import ", "__"]
                for pattern in dangerous_patterns:
                    if pattern.lower() in value.lower():
                        result["valid"] = False
                        result["errors"].append(f"Potentially dangerous content in {key}: contains '{pattern}'")
                        break
                        
            elif isinstance(value, (int, float)):
                # Validate numeric ranges
                if key == "priority" and (value < 1 or value > 10):
                    result["warnings"].append(f"Priority should be between 1-10, got: {value}")
                elif key == "timeout" and (value < 0 or value > 7200):  # Max 2 hours
                    result["warnings"].append(f"Timeout should be between 0-7200 seconds, got: {value}")
```

## 9. Migration Strategy

### Phase 1: Foundation (Weeks 1-2)
```python
# Step 1: File storage setup
async def setup_file_storage():
    """Initialize new file-based storage system"""
    # Create storage directories
    storage_manager = TaskStorageManager("project/tasks")
    
    # Initialize empty storage if needed
    if not storage_manager.tasks_file.exists():
        await storage_manager._save_tasks_data({
            "tasks": {},
            "metadata": {
                "version": "1.0",
                "last_updated": datetime.utcnow().isoformat(),
                "total_tasks": 0,
                "schema_version": "1.0"
            }
        })

# Step 2: Simple notification setup  
async def setup_notifications():
    """Initialize notification system"""
    websocket_manager = WebSocketManager()
    metrics_collector = MetricsCollector()
    logger = get_logger("task_notifications")
    
    notification_service = TaskNotificationService(
        websocket_manager, metrics_collector, logger
    )
    
    return notification_service
```

### Phase 2: Parallel Implementation (Weeks 3-4)
```python
# Dual-write pattern for gradual migration
class DualWriteTaskManager:
    """Writes to both old and new systems during migration"""
    
    def __init__(self, old_manager: TaskManager, new_service: TaskService):
        self.old_manager = old_manager
        self.new_service = new_service
        
    async def create_task(self, task_data: Dict[str, Any]) -> Task:
        # Create in new system
        new_task = await self.new_service.create_task(task_data)
        
        # Also create in old system for compatibility
        old_task = self._convert_to_old_format(new_task)
        self.old_manager._tasks[new_task.id] = old_task
        
        return new_task
        
    def _convert_to_old_format(self, task: Task) -> dict:
        """Convert new task format to old format"""
        return {
            "id": task.id,
            "type": task.task_type,
            "status": task.status,
            "progress": task.progress,
            "data": task.input_data,
            "result": task.output_data,
            "error": task.error_info,
            "created_at": task.created_at,
            "updated_at": task.updated_at
        }
```

### Phase 3: Feature Migration (Weeks 5-6)
```python
# Gradual feature cutover with feature flags
class FeatureToggleTaskManager:
    """Routes requests between old and new systems based on feature flags"""
    
    def __init__(self, old_manager: TaskManager, new_service: TaskService):
        self.old_manager = old_manager
        self.new_service = new_service
        self.feature_enabled = os.getenv("USE_NEW_TASK_SYSTEM", "false").lower() == "true"
        
    async def create_task(self, task_data: Dict[str, Any], user_id: str = None) -> Task:
        if self.feature_enabled or (user_id and self._is_beta_user(user_id)):
            return await self.new_service.create_task(task_data)
        else:
            # Convert old task to new format for consistent API
            old_task = await self.old_manager.create_task(task_data)
            return self._convert_from_old_format(old_task)
            
    def _is_beta_user(self, user_id: str) -> bool:
        """Check if user is in beta testing group"""
        beta_users = os.getenv("BETA_USERS", "").split(",")
        return user_id in beta_users
```

### Phase 4: Full Cutover (Week 7)
```python
async def complete_migration():
    """Final cutover to new system"""
    old_manager = get_old_task_manager()
    new_service = get_new_task_service()
    
    # Migrate remaining active tasks
    active_tasks = old_manager.list_active_tasks()
    
    for old_task in active_tasks:
        # Convert to new format
        task_data = {
            "task_type": old_task["type"],
            "input_data": old_task["data"],
            "priority": old_task.get("priority", 1),
            "user_id": old_task.get("user_id")
        }
        
        # Create in new system
        new_task = await new_service.create_task(task_data)
        
        # Copy state
        new_task.status = old_task["status"]
        new_task.progress = old_task["progress"]
        new_task.started_at = old_task.get("started_at")
        new_task.output_data = old_task.get("result")
        new_task.error_info = old_task.get("error")
        
        # Save migrated task
        await new_service.save_task(new_task)
        
    # Update configuration to use new system
    update_config("USE_NEW_TASK_SYSTEM", "true")
    
    # Archive old task data
    old_manager.archive_all_tasks()
    
    logger.info(f"Migration completed: {len(active_tasks)} tasks migrated")
```

## 10. Performance Architecture

### Simple Multi-Process Scaling

```python
class MultiProcessTaskSystem:
    """Simple multi-process task processing system"""
    
    def __init__(self, config: ProcessConfig):
        self.process_id = config.process_id or f"process-{os.getpid()}"
        self.storage_manager = TaskStorageManager(config.storage_dir)
        self.worker_pool = TaskWorkerPool(config.max_workers)
        self.process_info_file = Path(config.storage_dir) / "processes" / f"{self.process_id}.json"
        self.process_info_file.parent.mkdir(exist_ok=True)
        
    async def start(self) -> None:
        """Start the task processing system"""
        # Register this process
        await self._register_process()
        
        # Start worker pool
        await self.worker_pool.start()
        
        # Start periodic process heartbeat
        asyncio.create_task(self._heartbeat_loop())
        
        # Start task polling
        asyncio.create_task(self._task_polling_loop())
        
    async def _register_process(self) -> None:
        """Register this process for coordination"""
        process_info = {
            'id': self.process_id,
            'pid': os.getpid(),
            'host': socket.gethostname(),
            'max_workers': self.worker_pool.max_workers,
            'started_at': datetime.utcnow().isoformat(),
            'last_heartbeat': datetime.utcnow().isoformat(),
            'status': 'running'
        }
        
        with open(self.process_info_file, 'w') as f:
            json.dump(process_info, f, indent=2)
            
    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeat"""
        while True:
            try:
                if self.process_info_file.exists():
                    with open(self.process_info_file, 'r') as f:
                        process_info = json.load(f)
                    
                    process_info['last_heartbeat'] = datetime.utcnow().isoformat()
                    process_info['active_workers'] = self.worker_pool.active_workers
                    
                    with open(self.process_info_file, 'w') as f:
                        json.dump(process_info, f, indent=2)
                        
            except Exception as e:
                logger.warning(f"Failed to update heartbeat: {e}")
                
            await asyncio.sleep(30)  # Heartbeat every 30 seconds
            
    async def _task_polling_loop(self) -> None:
        """Poll for available tasks"""
        task_queue = InMemoryTaskQueue(self.storage_manager)
        
        while True:
            try:
                # Check if we have capacity
                if self.worker_pool.active_workers < self.worker_pool.max_workers:
                    # Look for pending tasks
                    task = await task_queue.dequeue()
                    if task:
                        # Submit task to worker pool
                        processor_func = self._get_processor_for_task(task)
                        await self.worker_pool.submit_task(task, processor_func)
                        
            except Exception as e:
                logger.error(f"Error in task polling loop: {e}")
                
            await asyncio.sleep(1)  # Poll every second
            
    def _get_processor_for_task(self, task: Task):
        """Get appropriate processor function for task type"""
        # This would be configured based on task type
        processors = {
            "transcription": self._process_transcription_task,
            "translation": self._process_translation_task
        }
        return processors.get(task.task_type, self._default_processor)
        
    async def _process_transcription_task(self, task: Task) -> None:
        """Process transcription task"""
        # Implementation would call existing transcription service
        pass
        
    async def _process_translation_task(self, task: Task) -> None:
        """Process translation task"""
        # Implementation would call existing translation service
        pass
        
    async def _default_processor(self, task: Task) -> None:
        """Default processor for unknown task types"""
        raise ValueError(f"No processor available for task type: {task.task_type}")
        
    async def shutdown(self) -> None:
        """Gracefully shutdown the process"""
        # Update process status
        if self.process_info_file.exists():
            with open(self.process_info_file, 'r') as f:
                process_info = json.load(f)
            process_info['status'] = 'shutting_down'
            process_info['shutdown_at'] = datetime.utcnow().isoformat()
            
            with open(self.process_info_file, 'w') as f:
                json.dump(process_info, f, indent=2)
                
        # Stop worker pool
        await self.worker_pool.stop()
        
        # Remove process info file
        try:
            self.process_info_file.unlink()
        except OSError:
            pass
```

### Simple Performance Optimizations

```python
class TaskBatchProcessor:
    """Simple batch processing for similar tasks"""
    
    def __init__(self, batch_size: int = 5, batch_timeout: float = 3.0):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.pending_batches: Dict[str, List[Task]] = {}
        self.batch_timers: Dict[str, asyncio.Task] = {}
        
    async def add_task(self, task: Task) -> None:
        """Add task to appropriate batch"""
        batch_key = self._get_batch_key(task)
        
        if batch_key not in self.pending_batches:
            self.pending_batches[batch_key] = []
            
        self.pending_batches[batch_key].append(task)
        
        # Start timer if this is the first task in batch
        if len(self.pending_batches[batch_key]) == 1:
            self.batch_timers[batch_key] = asyncio.create_task(
                self._batch_timeout_handler(batch_key)
            )
            
        # Process batch if it's full
        if len(self.pending_batches[batch_key]) >= self.batch_size:
            await self._process_batch(batch_key)
            
    def _get_batch_key(self, task: Task) -> str:
        """Generate batch key for similar tasks"""
        # Batch by task type and some key parameters
        if task.task_type == "translation":
            target_lang = task.input_data.get("target_language", "unknown")
            return f"translation:{target_lang}"
        elif task.task_type == "transcription":
            model = task.input_data.get("model", "default")
            return f"transcription:{model}"
        else:
            return f"single:{task.task_type}"
            
    async def _batch_timeout_handler(self, batch_key: str) -> None:
        """Handle batch timeout"""
        await asyncio.sleep(self.batch_timeout)
        
        # Process batch if it still exists and has tasks
        if (batch_key in self.pending_batches and 
            len(self.pending_batches[batch_key]) > 0):
            await self._process_batch(batch_key)
            
    async def _process_batch(self, batch_key: str) -> None:
        """Process a batch of tasks"""
        if batch_key not in self.pending_batches:
            return
            
        tasks = self.pending_batches.pop(batch_key)
        
        # Cancel timer if it exists
        if batch_key in self.batch_timers:
            timer_task = self.batch_timers.pop(batch_key)
            if not timer_task.done():
                timer_task.cancel()
                
        if not tasks:
            return
            
        # Process based on task type
        if tasks[0].task_type == "translation":
            await self._batch_translate(tasks)
        elif tasks[0].task_type == "transcription":
            await self._parallel_transcribe(tasks)
        else:
            await self._process_individually(tasks)
            
    async def _batch_translate(self, tasks: List[Task]) -> None:
        """Process translation tasks in batch"""
        logger.info(f"Batch processing {len(tasks)} translation tasks")
        
        # Group texts by target language for more efficient API calls
        texts_to_translate = []
        task_mapping = {}
        
        for task in tasks:
            source_text = self._extract_source_text(task)
            texts_to_translate.append(source_text)
            task_mapping[len(texts_to_translate) - 1] = task
            
        try:
            # Call translation service with batch of texts
            target_language = tasks[0].input_data["target_language"]
            translated_texts = await self._call_translation_service(texts_to_translate, target_language)
            
            # Distribute results back to tasks
            for i, translated_text in enumerate(translated_texts):
                task = task_mapping[i]
                result = self._format_translation_result(translated_text, task)
                task.complete(result)
                
        except Exception as e:
            # If batch fails, mark all tasks as failed
            for task in tasks:
                task.fail(e)
                
    async def _parallel_transcribe(self, tasks: List[Task]) -> None:
        """Process transcription tasks in parallel"""
        logger.info(f"Parallel processing {len(tasks)} transcription tasks")
        
        # Process transcription tasks in parallel (they can't be easily batched)
        async def process_single_transcription(task: Task):
            try:
                result = await self._call_transcription_service(task)
                task.complete(result)
            except Exception as e:
                task.fail(e)
                
        await asyncio.gather(*[
            process_single_transcription(task) for task in tasks
        ], return_exceptions=True)
        
    async def _process_individually(self, tasks: List[Task]) -> None:
        """Process tasks individually"""
        for task in tasks:
            try:
                result = await self._call_generic_processor(task)
                task.complete(result)
            except Exception as e:
                task.fail(e)
                
    def _extract_source_text(self, task: Task) -> str:
        """Extract text to translate from task"""
        # This would extract text from the source file
        # Implementation depends on file format
        return task.input_data.get("source_text", "")
        
    async def _call_translation_service(self, texts: List[str], target_language: str) -> List[str]:
        """Call translation service with batch of texts"""
        # This would call the actual translation service
        # Implementation depends on the translation backend
        pass
        
    async def _call_transcription_service(self, task: Task) -> Dict[str, Any]:
        """Call transcription service for single task"""
        # This would call the actual transcription service
        pass
        
    async def _call_generic_processor(self, task: Task) -> Dict[str, Any]:
        """Call generic processor for task"""
        # Default processing for unknown task types
        pass
        
    def _format_translation_result(self, translated_text: str, task: Task) -> Dict[str, Any]:
        """Format translation result for task completion"""
        return {
            "translated_text": translated_text,
            "source_language": task.input_data.get("source_language"),
            "target_language": task.input_data.get("target_language"),
            "timestamp": datetime.utcnow().isoformat()
        }
```

## Conclusion

The current VoiceTransl task management system is a minimal proof-of-concept that lacks the robustness, scalability, and features required for production use. The proposed simple service-oriented architecture addresses all critical gaps while maintaining simplicity:

**Key Benefits of New Architecture:**
- **Durability**: File-based persistence with automatic backup ensures no data loss
- **Scalability**: Multi-process scaling with shared file storage for coordination
- **Reliability**: Comprehensive retry mechanisms, task recovery, and fault tolerance
- **Observability**: Structured logging, metrics collection, and detailed health monitoring
- **Security**: Input validation, task isolation, and user-level access control
- **Maintainability**: Simple service-oriented design with clear responsibilities and minimal dependencies

**Migration Path:** The proposed 7-week migration strategy allows for gradual, risk-free transition while maintaining system availability.

This architecture provides a solid foundation for a production-ready task management system that can handle significant workloads while remaining simple to deploy, maintain, and debug. The file-based approach eliminates database dependencies while still providing durability and recoverability.

---

*Analysis Date: 2025-08-07*  
*Target: Production-ready task management system with zero technical debt*