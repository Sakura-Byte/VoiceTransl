# Backend Architecture Analysis: Fresh Design Approach

## Executive Summary

The current VoiceTransl backend requires a complete architectural redesign to support the frontend's 51+ endpoint requirements while eliminating all technical debt. This analysis provides a fresh, ground-up design approach following modern software architecture principles.

## Current State Assessment

### Existing Structure Analysis

**Core Backend (`api/` directory):**
- **FastAPI Application** (`api/main.py`): Basic setup with global exception handling
- **Core Services** (`api/core/`): Task manager, configuration, rate limiting
- **Routers** (`api/routers/`): 4 router modules (transcription, translation, tasks, config)
- **Models** (`api/models/`): Pydantic models for request/response validation
- **Services** (`api/services/`): Business logic implementations

**Integration Points:**
- **Transcription Backends** (`backends/`): Multiple backend implementations
- **Translation System** (`GalTransl/`): Existing translation engine
- **Configuration** (`config.yaml`): YAML-based configuration system
- **Project Structure** (`project/`): Working directories and cache

### Technical Debt Inventory

**Critical Issues:**
1. **Import Errors**: `get_gui_integration()` function missing, causing service failures
2. **Mock Implementations**: Translation service returns placeholder data
3. **Inconsistent Response Formats**: Multiple format patterns across endpoints
4. **Missing Error Handling**: Incomplete exception coverage and error states
5. **No WebSocket Support**: Real-time features not implemented
6. **Limited Task Management**: Basic async tasks without persistence or advanced features
7. **No Authentication System**: Security framework missing
8. **Configuration Limitations**: Read-only config management, no persistence
9. **Resource Leaks**: Inadequate cleanup of temporary files and connections
10. **No Observability**: Limited logging, metrics, and monitoring

**Architecture Debt:**
- Monolithic service layer without clear boundaries
- Direct database/file access without repository pattern
- Tight coupling between routers and business logic
- No domain modeling or business rules encapsulation
- Missing dependency injection framework
- Inadequate testing infrastructure
- No event-driven architecture for loose coupling

## Fresh Architecture Design

### Service-Oriented Architecture Structure

```
src/
├── services/                        # Core Business Services
│   ├── transcription/
│   │   ├── transcription_service.py
│   │   ├── audio_processor.py
│   │   ├── result_formatter.py
│   │   └── progress_tracker.py
│   ├── translation/
│   │   ├── translation_service.py
│   │   ├── language_detector.py
│   │   ├── quality_analyzer.py
│   │   └── cache_manager.py
│   ├── task_management/
│   │   ├── task_service.py
│   │   ├── queue_manager.py
│   │   ├── scheduler.py
│   │   └── status_tracker.py
│   ├── configuration/
│   │   ├── config_service.py
│   │   ├── validation_service.py
│   │   ├── backup_service.py
│   │   └── migration_service.py
│   ├── file_management/
│   │   ├── file_service.py
│   │   ├── upload_handler.py
│   │   ├── storage_manager.py
│   │   └── cleanup_service.py
│   ├── server_management/
│   │   ├── server_service.py
│   │   ├── health_monitor.py
│   │   ├── resource_tracker.py
│   │   └── metrics_collector.py
│   └── notification/
│       ├── notification_service.py
│       ├── websocket_manager.py
│       └── event_dispatcher.py
├── storage/                         # File-Based Data Storage
│   ├── file_storage.py             # Generic file storage interface
│   ├── json_storage.py             # JSON file operations
│   ├── cache_storage.py            # In-memory + file backup
│   ├── session_storage.py          # Session data persistence
│   ├── config_storage.py           # Configuration persistence
│   └── backup_storage.py           # Backup and recovery
├── integrations/                    # External Service Integrations
│   ├── galtransl/
│   │   ├── galtransl_client.py
│   │   ├── model_manager.py
│   │   └── config_adapter.py
│   ├── whisper/
│   │   ├── whisper_client.py
│   │   ├── model_loader.py
│   │   └── result_parser.py
│   ├── openai/
│   │   ├── openai_client.py
│   │   ├── rate_limiter.py
│   │   └── error_handler.py
│   └── llama/
│       ├── llama_client.py
│       ├── process_manager.py
│       └── output_parser.py
├── api/                            # FastAPI Application Layer
│   ├── routers/
│   │   ├── transcription_router.py
│   │   ├── translation_router.py
│   │   ├── configuration_router.py
│   │   ├── task_router.py
│   │   ├── file_router.py
│   │   ├── server_router.py
│   │   └── websocket_router.py
│   ├── middleware/
│   │   ├── error_middleware.py
│   │   ├── logging_middleware.py
│   │   ├── rate_limit_middleware.py
│   │   └── cors_middleware.py
│   ├── dependencies/
│   │   ├── service_container.py
│   │   ├── auth_dependencies.py
│   │   └── validation_dependencies.py
│   ├── models/
│   │   ├── request_models.py
│   │   ├── response_models.py
│   │   └── shared_models.py
│   └── utils/
│       ├── response_formatter.py
│       ├── error_handler.py
│       └── validation_helper.py
├── shared/                         # Shared Utilities
│   ├── exceptions.py
│   ├── constants.py
│   ├── validators.py
│   ├── helpers.py
│   └── types.py
└── main.py                         # Application Entry Point
```

### Core Design Principles

**1. Simple Service-Oriented Design**
```python
# Core Service with Direct Methods
class TranscriptionService:
    def __init__(
        self,
        storage: SessionStorage,
        file_service: FileService,
        notification_service: NotificationService
    ):
        self.storage = storage
        self.file_service = file_service
        self.notification_service = notification_service
        self.active_sessions = {}  # In-memory cache
    
    async def create_transcription(
        self,
        audio_file_path: str,
        language: str,
        output_format: str,
        backend_config: Dict[str, Any]
    ) -> str:
        # Generate session ID
        session_id = f"trans_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        # Validate audio file
        file_info = await self.file_service.validate_audio_file(audio_file_path)
        
        # Create session data
        session_data = {
            "id": session_id,
            "audio_file_path": audio_file_path,
            "file_info": file_info,
            "language": language,
            "output_format": output_format,
            "backend_config": backend_config,
            "status": "pending",
            "progress": 0.0,
            "results": [],
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Store session data
        await self.storage.save_session(session_id, session_data)
        self.active_sessions[session_id] = session_data
        
        # Start transcription process
        await self._start_transcription_async(session_id)
        
        return session_id
    
    async def get_transcription_status(self, session_id: str) -> Dict[str, Any]:
        # Try memory cache first
        if session_id in self.active_sessions:
            return self.active_sessions[session_id]
        
        # Load from storage
        session_data = await self.storage.load_session(session_id)
        if not session_data:
            raise ValueError(f"Transcription session {session_id} not found")
        
        # Cache for next access
        self.active_sessions[session_id] = session_data
        return session_data
    
    async def _start_transcription_async(self, session_id: str) -> None:
        # Update status
        await self._update_session_status(session_id, "processing", 0.0)
        
        # Notify clients
        await self.notification_service.send_status_update(
            session_id, "started", {"progress": 0.0}
        )
```

**2. File-Based Storage Pattern**
```python
class SessionStorage:
    def __init__(self, storage_path: str = "data/sessions"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.cache = {}  # In-memory cache with file backup
    
    async def save_session(self, session_id: str, data: Dict[str, Any]) -> None:
        # Update in-memory cache
        self.cache[session_id] = data.copy()
        
        # Write to file for persistence
        file_path = self.storage_path / f"{session_id}.json"
        async with aiofiles.open(file_path, 'w') as f:
            await f.write(json.dumps(data, indent=2, default=str))
    
    async def load_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        # Check memory cache first
        if session_id in self.cache:
            return self.cache[session_id].copy()
        
        # Load from file
        file_path = self.storage_path / f"{session_id}.json"
        if not file_path.exists():
            return None
        
        try:
            async with aiofiles.open(file_path, 'r') as f:
                content = await f.read()
                data = json.loads(content)
                
            # Cache for next access
            self.cache[session_id] = data
            return data.copy()
        except Exception as e:
            logger.error(f"Failed to load session {session_id}: {e}")
            return None
    
    async def list_sessions(
        self, 
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        sessions = []
        
        # Get all session files
        session_files = list(self.storage_path.glob("*.json"))
        session_files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
        
        for file_path in session_files[:limit]:
            try:
                session_id = file_path.stem
                data = await self.load_session(session_id)
                
                if data and (not status or data.get('status') == status):
                    sessions.append(data)
            except Exception as e:
                logger.warning(f"Failed to load session from {file_path}: {e}")
        
        return sessions
    
    async def delete_session(self, session_id: str) -> bool:
        # Remove from cache
        self.cache.pop(session_id, None)
        
        # Remove file
        file_path = self.storage_path / f"{session_id}.json"
        try:
            if file_path.exists():
                file_path.unlink()
                return True
        except Exception as e:
            logger.error(f"Failed to delete session {session_id}: {e}")
        
        return False

# Configuration Storage
class ConfigStorage:
    def __init__(self, config_path: str = "data/config.json"):
        self.config_path = Path(config_path)
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        self._cache = None
        self._lock = asyncio.Lock()
    
    async def load_config(self) -> Dict[str, Any]:
        if self._cache is not None:
            return self._cache.copy()
        
        async with self._lock:
            if not self.config_path.exists():
                # Create default config
                default_config = self._get_default_config()
                await self.save_config(default_config)
                return default_config
            
            try:
                async with aiofiles.open(self.config_path, 'r', encoding='utf-8') as f:
                    content = await f.read()
                    self._cache = json.loads(content)
                    return self._cache.copy()
            except Exception as e:
                logger.error(f"Failed to load config: {e}")
                return self._get_default_config()
    
    async def save_config(self, config: Dict[str, Any]) -> bool:
        async with self._lock:
            try:
                # Backup current config
                if self.config_path.exists():
                    backup_path = self.config_path.with_suffix('.json.backup')
                    shutil.copy2(self.config_path, backup_path)
                
                # Write new config
                async with aiofiles.open(self.config_path, 'w', encoding='utf-8') as f:
                    await f.write(json.dumps(config, indent=2, ensure_ascii=False))
                
                # Update cache
                self._cache = config.copy()
                return True
            except Exception as e:
                logger.error(f"Failed to save config: {e}")
                return False
```

**3. Direct Method Call Architecture**
```python
# Simple Event Dispatcher (no complex event bus)
class EventDispatcher:
    def __init__(self):
        self.handlers: Dict[str, List[Callable]] = defaultdict(list)
    
    def subscribe(self, event_type: str, handler: Callable) -> None:
        self.handlers[event_type].append(handler)
    
    async def dispatch(self, event_type: str, data: Dict[str, Any]) -> None:
        handlers = self.handlers.get(event_type, [])
        
        # Execute handlers concurrently
        tasks = []
        for handler in handlers:
            task = asyncio.create_task(handler(data))
            tasks.append(task)
        
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Log any handler failures
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Event handler {i} failed for {event_type}: {result}")

# Service Integration Example
class TranscriptionWorkflow:
    def __init__(
        self,
        transcription_service: TranscriptionService,
        task_service: TaskService,
        notification_service: NotificationService
    ):
        self.transcription_service = transcription_service
        self.task_service = task_service
        self.notification_service = notification_service
    
    async def process_transcription_request(
        self,
        audio_file_path: str,
        config: Dict[str, Any]
    ) -> str:
        # Create transcription session
        session_id = await self.transcription_service.create_transcription(
            audio_file_path=audio_file_path,
            language=config.get('language', 'auto'),
            output_format=config.get('output_format', 'srt'),
            backend_config=config.get('backend_config', {})
        )
        
        # Create background task
        task_id = await self.task_service.create_task(
            task_type="transcription",
            session_id=session_id,
            priority=config.get('priority', 'normal')
        )
        
        # Send initial notification
        await self.notification_service.send_notification(
            "transcription_started",
            {
                "session_id": session_id,
                "task_id": task_id,
                "audio_file": audio_file_path
            }
        )
        
        return session_id
```

**4. Simple Dependency Injection**
```python
# Lightweight Service Container
class ServiceContainer:
    def __init__(self):
        self._services = {}
        self._singletons = {}
    
    def register(self, service_name: str, factory: Callable, singleton: bool = True):
        self._services[service_name] = {
            'factory': factory,
            'singleton': singleton
        }
    
    def get(self, service_name: str):
        if service_name not in self._services:
            raise ValueError(f"Service '{service_name}' not registered")
        
        service_config = self._services[service_name]
        
        if service_config['singleton']:
            if service_name not in self._singletons:
                self._singletons[service_name] = service_config['factory']()
            return self._singletons[service_name]
        else:
            return service_config['factory']()
    
    def clear_cache(self):
        self._singletons.clear()

# Service Factory Functions
def create_session_storage() -> SessionStorage:
    return SessionStorage("data/sessions")

def create_config_storage() -> ConfigStorage:
    return ConfigStorage("data/config.json")

def create_file_service(config_storage: ConfigStorage) -> FileService:
    return FileService(config_storage)

def create_transcription_service(
    session_storage: SessionStorage,
    file_service: FileService,
    notification_service: NotificationService
) -> TranscriptionService:
    return TranscriptionService(session_storage, file_service, notification_service)

# Container Setup
def setup_services() -> ServiceContainer:
    container = ServiceContainer()
    
    # Storage services
    container.register("session_storage", create_session_storage, singleton=True)
    container.register("config_storage", create_config_storage, singleton=True)
    
    # Core services  
    container.register("file_service", 
                      lambda: create_file_service(container.get("config_storage")), 
                      singleton=True)
    container.register("notification_service", 
                      lambda: NotificationService(container.get("event_dispatcher")), 
                      singleton=True)
    container.register("transcription_service",
                      lambda: create_transcription_service(
                          container.get("session_storage"),
                          container.get("file_service"),
                          container.get("notification_service")
                      ), singleton=True)
    
    # Infrastructure
    container.register("event_dispatcher", EventDispatcher, singleton=True)
    
    return container

# FastAPI Dependency
async def get_service_container() -> ServiceContainer:
    # This would be set up once at startup
    return app.state.container
```

**5. File-Based Persistence Pattern**
```python
class FileBasedStorage:
    """Generic file-based storage with JSON serialization"""
    
    def __init__(self, base_path: str, cache_enabled: bool = True):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.cache_enabled = cache_enabled
        self._cache = {} if cache_enabled else None
        self._lock = asyncio.Lock()
    
    async def save(self, key: str, data: Any) -> bool:
        try:
            # Update cache
            if self.cache_enabled:
                self._cache[key] = json.loads(json.dumps(data, default=str))
            
            # Write to file
            file_path = self.base_path / f"{key}.json"
            async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(data, indent=2, default=str, ensure_ascii=False))
            
            return True
        except Exception as e:
            logger.error(f"Failed to save {key}: {e}")
            return False
    
    async def load(self, key: str) -> Optional[Any]:
        # Check cache first
        if self.cache_enabled and key in self._cache:
            return json.loads(json.dumps(self._cache[key]))
        
        # Load from file
        file_path = self.base_path / f"{key}.json"
        if not file_path.exists():
            return None
        
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                data = json.loads(content)
            
            # Update cache
            if self.cache_enabled:
                self._cache[key] = data
            
            return data
        except Exception as e:
            logger.error(f"Failed to load {key}: {e}")
            return None
    
    async def exists(self, key: str) -> bool:
        if self.cache_enabled and key in self._cache:
            return True
        
        file_path = self.base_path / f"{key}.json"
        return file_path.exists()
    
    async def delete(self, key: str) -> bool:
        try:
            # Remove from cache
            if self.cache_enabled:
                self._cache.pop(key, None)
            
            # Remove file
            file_path = self.base_path / f"{key}.json"
            if file_path.exists():
                file_path.unlink()
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete {key}: {e}")
            return False
    
    async def list_keys(self, pattern: str = "*.json") -> List[str]:
        try:
            files = list(self.base_path.glob(pattern))
            return [f.stem for f in files]
        except Exception as e:
            logger.error(f"Failed to list keys: {e}")
            return []

# Specialized Storage Classes
class TaskStorage(FileBasedStorage):
    def __init__(self):
        super().__init__("data/tasks")
    
    async def save_task(self, task_id: str, task_data: Dict[str, Any]) -> bool:
        task_data['updated_at'] = datetime.utcnow().isoformat()
        return await self.save(task_id, task_data)
    
    async def get_tasks_by_status(self, status: str) -> List[Dict[str, Any]]:
        all_keys = await self.list_keys()
        tasks = []
        
        for key in all_keys:
            task_data = await self.load(key)
            if task_data and task_data.get('status') == status:
                tasks.append(task_data)
        
        return sorted(tasks, key=lambda x: x.get('created_at', ''), reverse=True)
```

### Service Layer Implementation

**Core Service Examples**
```python
class TranscriptionService:
    def __init__(
        self,
        storage: SessionStorage,
        backend_manager: BackendManager,
        file_service: FileService
    ):
        self.storage = storage
        self.backend_manager = backend_manager
        self.file_service = file_service
    
    async def start_transcription(
        self,
        audio_file_path: str,
        config: Dict[str, Any]
    ) -> str:
        # Validate input
        await self.file_service.validate_audio_file(audio_file_path)
        
        # Create session
        session_id = self._generate_session_id()
        session_data = {
            "id": session_id,
            "audio_file_path": audio_file_path,
            "config": config,
            "status": "processing",
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Save session
        await self.storage.save_session(session_id, session_data)
        
        # Start background transcription
        asyncio.create_task(self._process_transcription(session_id, audio_file_path, config))
        
        return session_id
    
    async def _process_transcription(
        self,
        session_id: str,
        audio_file_path: str,
        config: Dict[str, Any]
    ):
        try:
            # Get backend
            backend = self.backend_manager.get_backend(config.get('backend', 'whisper'))
            
            # Process with progress updates
            async for progress_data in backend.transcribe_with_progress(audio_file_path, config):
                # Update session progress
                await self._update_progress(session_id, progress_data)
            
            # Complete transcription
            await self._complete_transcription(session_id, progress_data.get('results', []))
            
        except Exception as e:
            await self._fail_transcription(session_id, str(e))

class TaskService:
    def __init__(self, storage: TaskStorage):
        self.storage = storage
        self.active_tasks = {}
        self.task_queue = asyncio.Queue()
    
    async def create_task(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        priority: str = "normal"
    ) -> str:
        task_id = f"task_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        task_data = {
            "id": task_id,
            "type": task_type,
            "input_data": input_data,
            "priority": priority,
            "status": "queued",
            "progress": 0.0,
            "created_at": datetime.utcnow().isoformat(),
            "result": None,
            "error": None
        }
        
        # Save task
        await self.storage.save_task(task_id, task_data)
        
        # Add to queue
        await self.task_queue.put(task_data)
        
        return task_id
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        # Check active tasks first
        if task_id in self.active_tasks:
            return self.active_tasks[task_id]
        
        # Load from storage
        return await self.storage.load(task_id)

class ConfigurationService:
    def __init__(self, storage: ConfigStorage):
        self.storage = storage
        self._current_config = None
    
    async def get_config(self) -> Dict[str, Any]:
        if self._current_config is None:
            self._current_config = await self.storage.load_config()
        return self._current_config.copy()
    
    async def update_config(
        self,
        updates: Dict[str, Any],
        validate: bool = True
    ) -> bool:
        current_config = await self.get_config()
        
        # Apply updates
        updated_config = self._deep_merge(current_config, updates)
        
        # Validate if requested
        if validate:
            validation_errors = await self._validate_config(updated_config)
            if validation_errors:
                raise ValueError(f"Configuration validation failed: {validation_errors}")
        
        # Save updated config
        success = await self.storage.save_config(updated_config)
        if success:
            self._current_config = updated_config
        
        return success
    
    def _deep_merge(self, base: Dict, updates: Dict) -> Dict:
        result = base.copy()
        for key, value in updates.items():
            if isinstance(value, dict) and key in result and isinstance(result[key], dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result
```

**Integration Layer**
```python
class BackendManager:
    def __init__(self):
        self.backends = {}
        self.initialized_backends = {}
    
    def register_backend(self, name: str, backend_class: Type):
        self.backends[name] = backend_class
    
    def get_backend(self, name: str):
        if name not in self.backends:
            raise ValueError(f"Backend '{name}' not registered")
        
        if name not in self.initialized_backends:
            backend_class = self.backends[name]
            self.initialized_backends[name] = backend_class()
        
        return self.initialized_backends[name]

class WhisperBackend:
    def __init__(self):
        self.model = None
    
    async def transcribe_with_progress(
        self,
        audio_file_path: str,
        config: Dict[str, Any]
    ) -> AsyncIterator[Dict[str, Any]]:
        if not self.model:
            yield {"status": "loading_model", "progress": 0.1}
            await self._load_model(config.get('model', 'base'))
        
        yield {"status": "processing", "progress": 0.2}
        
        # Simulate transcription with progress
        segments = await self._transcribe_file(audio_file_path, config)
        
        for i, segment in enumerate(segments):
            progress = 0.2 + (0.7 * i / len(segments))
            yield {
                "status": "processing",
                "progress": progress,
                "current_segment": segment
            }
        
        # Final result
        yield {
            "status": "completed",
            "progress": 1.0,
            "results": segments
        }
    
    async def _load_model(self, model_name: str):
        # Load Whisper model
        pass
    
    async def _transcribe_file(
        self,
        audio_file_path: str,
        config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        # Actual transcription logic
        return []

class GalTranslIntegration:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.translator_cache = {}
    
    async def translate_content(
        self,
        content: Dict[str, Any],
        translation_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        translator_type = translation_config.get('translator', 'gpt-custom')
        
        # Get or create translator
        translator = await self._get_translator(translator_type, translation_config)
        
        # Translate segments
        translated_segments = []
        segments = content.get('segments', [])
        
        for segment in segments:
            translated_text = await translator.translate(
                segment.get('text', ''),
                source_lang=translation_config.get('source_language', 'auto'),
                target_lang=translation_config.get('target_language', 'en')
            )
            
            translated_segments.append({
                **segment,
                'translated_text': translated_text
            })
        
        return {
            'original_content': content,
            'translated_segments': translated_segments,
            'translation_config': translation_config,
            'completed_at': datetime.utcnow().isoformat()
        }
    
    async def _get_translator(self, translator_type: str, config: Dict[str, Any]):
        cache_key = f"{translator_type}_{hash(str(config))}"
        
        if cache_key not in self.translator_cache:
            # Initialize translator based on type
            if translator_type.startswith('gpt'):
                from .gpt_translator import GPTTranslator
                translator = GPTTranslator(config)
            elif translator_type.startswith('sakura'):
                from .sakura_translator import SakuraTranslator
                translator = SakuraTranslator(config)
            else:
                from .online_translator import OnlineTranslator
                translator = OnlineTranslator(translator_type, config)
            
            self.translator_cache[cache_key] = translator
        
        return self.translator_cache[cache_key]
```

### FastAPI Integration

**Router Implementation**
```python
# transcription_router.py
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from ..dependencies.service_container import get_transcription_service, get_task_service
from ..models.request_models import TranscriptionRequest
from ..models.response_models import TranscriptionResponse, TaskStatusResponse

router = APIRouter(prefix="/api/transcription", tags=["transcription"])

@router.post("/", response_model=TranscriptionResponse)
async def create_transcription(
    request: TranscriptionRequest,
    transcription_service: TranscriptionService = Depends(get_transcription_service),
    task_service: TaskService = Depends(get_task_service)
):
    try:
        # Start transcription
        session_id = await transcription_service.start_transcription(
            audio_file_path=request.audio_file_path,
            config=request.config.dict()
        )
        
        # Create tracking task
        task_id = await task_service.create_task(
            task_type="transcription",
            input_data={"session_id": session_id}
        )
        
        return TranscriptionResponse(
            session_id=session_id,
            task_id=task_id,
            status="processing"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{session_id}", response_model=TaskStatusResponse)
async def get_transcription_status(
    session_id: str,
    transcription_service: TranscriptionService = Depends(get_transcription_service)
):
    try:
        status_data = await transcription_service.get_transcription_status(session_id)
        return TaskStatusResponse(**status_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# WebSocket for real-time updates
@router.websocket("/ws/{session_id}")
async def transcription_websocket(
    websocket: WebSocket,
    session_id: str,
    notification_service: NotificationService = Depends(get_notification_service)
):
    await websocket.accept()
    
    # Subscribe to session updates
    async def send_updates(data: Dict[str, Any]):
        await websocket.send_json(data)
    
    notification_service.subscribe(f"transcription_{session_id}", send_updates)
    
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        notification_service.unsubscribe(f"transcription_{session_id}", send_updates)

# service_container.py - Simple dependency injection
class ServiceContainer:
    def __init__(self):
        self._instances = {}
    
    def get_transcription_service(self) -> TranscriptionService:
        if 'transcription_service' not in self._instances:
            session_storage = SessionStorage()
            file_service = FileService()
            notification_service = NotificationService()
            self._instances['transcription_service'] = TranscriptionService(
                session_storage, file_service, notification_service
            )
        return self._instances['transcription_service']

# Global container instance
container = ServiceContainer()

# FastAPI dependencies
async def get_transcription_service() -> TranscriptionService:
    return container.get_transcription_service()
```

**Data Flow Patterns**
```python
# Simple Request/Response Flow
@router.post("/translate")
async def translate_content(
    request: TranslationRequest,
    translation_service: TranslationService = Depends(get_translation_service)
):
    # 1. Validate request
    if not request.content or not request.target_language:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # 2. Process request
    try:
        result = await translation_service.translate_content(
            content=request.content,
            source_language=request.source_language,
            target_language=request.target_language,
            translator=request.translator_config
        )
        
        # 3. Return response
        return TranslationResponse(
            translation_id=result['id'],
            translated_content=result['translated_segments'],
            status="completed"
        )
    except Exception as e:
        # 4. Handle errors
        logger.error(f"Translation failed: {e}")
        raise HTTPException(status_code=500, detail="Translation failed")

# Background Task Processing
class BackgroundTaskProcessor:
    def __init__(self, task_service: TaskService):
        self.task_service = task_service
        self.running = False
    
    async def start(self):
        self.running = True
        asyncio.create_task(self._process_tasks())
    
    async def stop(self):
        self.running = False
    
    async def _process_tasks(self):
        while self.running:
            try:
                # Get next task from queue
                task_data = await self.task_service.get_next_task()
                
                if task_data:
                    # Process task based on type
                    if task_data['type'] == 'transcription':
                        await self._process_transcription_task(task_data)
                    elif task_data['type'] == 'translation':
                        await self._process_translation_task(task_data)
                
                # Brief pause to prevent busy waiting
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Task processing error: {e}")
                await asyncio.sleep(1)  # Wait longer after error
```

**WebSocket Real-time Updates**
```python
class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.session_subscribers: Dict[str, List[str]] = defaultdict(list)
    
    async def connect(self, websocket: WebSocket, connection_id: str):
        await websocket.accept()
        self.active_connections[connection_id] = websocket
    
    def disconnect(self, connection_id: str):
        self.active_connections.pop(connection_id, None)
        # Remove from all subscription lists
        for session_id, subscribers in self.session_subscribers.items():
            if connection_id in subscribers:
                subscribers.remove(connection_id)
    
    def subscribe_to_session(self, connection_id: str, session_id: str):
        if connection_id in self.active_connections:
            self.session_subscribers[session_id].append(connection_id)
    
    async def broadcast_to_session(self, session_id: str, message: Dict[str, Any]):
        subscribers = self.session_subscribers.get(session_id, [])
        
        # Send to all subscribers
        for connection_id in subscribers[:]:  # Copy list to avoid modification during iteration
            websocket = self.active_connections.get(connection_id)
            if websocket:
                try:
                    await websocket.send_json(message)
                except Exception:
                    # Connection is broken, remove it
                    self.disconnect(connection_id)

# Integration with services
class NotificationService:
    def __init__(self, websocket_manager: WebSocketManager):
        self.websocket_manager = websocket_manager
    
    async def send_progress_update(
        self,
        session_id: str,
        progress: float,
        status: str,
        extra_data: Dict[str, Any] = None
    ):
        message = {
            "type": "progress_update",
            "session_id": session_id,
            "progress": progress,
            "status": status,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if extra_data:
            message.update(extra_data)
        
        await self.websocket_manager.broadcast_to_session(session_id, message)
```

### Simplified Data Flow

**Request Processing Flow**
```
Client Request
      ↓
FastAPI Router
      ↓
Request Validation (Pydantic Models)
      ↓
Service Method Call (Direct)
      ↓
File-Based Storage Operation
      ↓
Optional Background Task Creation
      ↓
WebSocket Notification (if applicable)
      ↓
Response Formatting
      ↓
Client Response
```

**Background Processing Flow**
```
Task Created
      ↓
Added to Task Queue (asyncio.Queue)
      ↓
Background Worker Picks Up Task
      ↓
Service Method Execution
      ↓
Progress Updates to Storage
      ↓
WebSocket Progress Notifications
      ↓
Final Result Storage
      ↓
Completion Notification
```

### Error Handling & Resilience

**Circuit Breaker Pattern (Simplified)**
```python
class SimpleCircuitBreaker:
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    async def call(self, func: Callable, *args, **kwargs):
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker is OPEN")
        
        try:
            result = await func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            
            raise e

# Usage in service
class ExternalAPIClient:
    def __init__(self):
        self.circuit_breaker = SimpleCircuitBreaker()
    
    async def call_external_api(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return await self.circuit_breaker.call(self._make_api_request, data)
```

**Retry Mechanism**
```python
import asyncio
from typing import Optional, Callable, Any

async def retry_with_backoff(
    func: Callable,
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
) -> Any:
    """Simple exponential backoff retry mechanism"""
    
    for attempt in range(max_retries + 1):
        try:
            return await func()
        except exceptions as e:
            if attempt == max_retries:
                raise e
            
            delay = initial_delay * (backoff_factor ** attempt)
            logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
            await asyncio.sleep(delay)

# Usage example
async def robust_translation(text: str, config: Dict[str, Any]) -> str:
    async def translate():
        return await external_translator.translate(text, config)
    
    return await retry_with_backoff(
        translate,
        max_retries=3,
        exceptions=(ConnectionError, TimeoutError)
    )
```

### Performance Optimizations

**In-Memory Caching**
```python
from typing import Optional, Any
import time
import json
import hashlib

class SimpleCache:
    def __init__(self, ttl: int = 300):  # 5 minutes default TTL
        self.cache = {}
        self.ttl = ttl
    
    def _is_expired(self, timestamp: float) -> bool:
        return time.time() - timestamp > self.ttl
    
    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            value, timestamp = self.cache[key]
            if not self._is_expired(timestamp):
                return value
            else:
                del self.cache[key]
        return None
    
    def set(self, key: str, value: Any) -> None:
        self.cache[key] = (value, time.time())
    
    def delete(self, key: str) -> bool:
        return self.cache.pop(key, None) is not None
    
    def clear(self) -> None:
        self.cache.clear()

# Cache decorator
def cached(cache: SimpleCache, key_func: Optional[Callable] = None):
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_data = json.dumps({"args": args, "kwargs": kwargs}, default=str, sort_keys=True)
                cache_key = hashlib.md5(key_data.encode()).hexdigest()
            
            # Check cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result)
            return result
        
        return wrapper
    return decorator

# Usage in service
class TranslationService:
    def __init__(self):
        self.cache = SimpleCache(ttl=600)  # 10 minutes
    
    @cached(cache=cache, key_func=lambda self, text, config: f"trans_{hash(text)}_{hash(str(config))}")
    async def translate_text(self, text: str, config: Dict[str, Any]) -> str:
        # Expensive translation operation
        return await self._perform_translation(text, config)
```

**Connection Pooling (HTTP Clients)**
```python
import aiohttp
from typing import Optional

class HTTPClientManager:
    def __init__(self, max_connections: int = 100, timeout: int = 30):
        self.max_connections = max_connections
        self.timeout = timeout
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            connector = aiohttp.TCPConnector(
                limit=self.max_connections,
                limit_per_host=20,
                ttl_dns_cache=300,
                use_dns_cache=True,
            )
            
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            
            self._session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout
            )
        
        return self._session
    
    async def close(self):
        if self._session and not self._session.closed:
            await self._session.close()

# Global HTTP client manager
http_manager = HTTPClientManager()

# Usage in external API clients
class OpenAIClient:
    async def make_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        session = await http_manager.get_session()
        
        async with session.post(
            "https://api.openai.com/v1/chat/completions",
            json=data,
            headers={"Authorization": f"Bearer {self.api_key}"}
        ) as response:
            return await response.json()
```

### Implementation Strategy

**Phase 1: Core Services Foundation (Weeks 1-2)**
1. **File-Based Storage Layer**
   - Implement `FileBasedStorage`, `SessionStorage`, `ConfigStorage`
   - Create backup and recovery mechanisms
   - Add data validation and error handling

2. **Basic Service Layer**
   - Create core service classes (TranscriptionService, TranslationService, etc.)
   - Implement simple dependency injection container
   - Add basic caching layer with file backup

**Phase 2: API Integration (Weeks 3-4)**
1. **FastAPI Router Implementation**
   - Refactor existing routers to use new service layer
   - Implement remaining endpoints required by frontend
   - Add comprehensive request/response validation

2. **WebSocket Real-time Features**
   - Implement WebSocket manager for real-time updates
   - Add notification service for progress tracking
   - Create event dispatcher for loose coupling

**Phase 3: Backend Integration (Weeks 5-6)**
1. **External Service Integration**
   - Implement GalTransl, Whisper, and other backend adapters
   - Add circuit breakers and retry mechanisms
   - Create connection pooling for HTTP clients

2. **Background Task Processing**
   - Implement async task processing with queues
   - Add task scheduling and priority handling
   - Create robust error handling and recovery

**Phase 4: Advanced Features (Weeks 7-8)**
1. **Performance Optimizations**
   - Add comprehensive caching strategies
   - Implement connection pooling and resource management
   - Add performance monitoring and metrics

2. **Production Readiness**
   - Add comprehensive logging and error tracking
   - Implement health checks and system monitoring
   - Create deployment scripts and documentation

### Migration Compatibility

**Backward Compatibility Approach**
```python
# Legacy Configuration Adapter
class LegacyConfigAdapter:
    def __init__(self, new_config_service: ConfigurationService):
        self.new_service = new_config_service
    
    def load_config(self) -> Dict[str, Any]:
        # Convert new config format to legacy format
        new_config = asyncio.run(self.new_service.get_config())
        return self._convert_to_legacy_format(new_config)
    
    def update_config(self, updates: Dict[str, Any]) -> bool:
        # Convert legacy updates to new format
        converted_updates = self._convert_from_legacy_format(updates)
        return asyncio.run(self.new_service.update_config(converted_updates))
    
    def _convert_to_legacy_format(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        # Map new config structure to old config.txt format
        legacy_config = {}
        
        # Example mappings
        if 'transcription' in new_config:
            legacy_config.update({
                'TRANSCRIPTION_BACKEND': new_config['transcription'].get('default_backend', 'whisper'),
                'WHISPER_MODEL': new_config['transcription'].get('whisper_model', 'base'),
                'LANGUAGE': new_config['transcription'].get('default_language', 'auto')
            })
        
        if 'translation' in new_config:
            legacy_config.update({
                'TRANSLATOR': new_config['translation'].get('default_translator', 'gpt-custom'),
                'TARGET_LANGUAGE': new_config['translation'].get('default_target_language', 'zh-cn')
            })
        
        return legacy_config

# Gradual Migration Service
class MigrationService:
    def __init__(
        self,
        old_task_manager,
        new_task_service: TaskService,
        migration_enabled: bool = True
    ):
        self.old_manager = old_task_manager
        self.new_service = new_task_service
        self.migration_enabled = migration_enabled
        self.id_mappings = {}  # Map old IDs to new IDs
    
    async def create_task(self, task_type: str, input_data: Dict[str, Any]) -> str:
        if self.migration_enabled:
            # Create in new system
            new_task_id = await self.new_service.create_task(task_type, input_data)
            
            # Also create in old system for compatibility
            old_task_id = self.old_manager.create_task(task_type, input_data)
            
            # Store mapping
            self.id_mappings[old_task_id] = new_task_id
            
            return new_task_id
        else:
            # Only use new system
            return await self.new_service.create_task(task_type, input_data)
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        # Try new system first
        if task_id in [v for v in self.id_mappings.values()]:
            return await self.new_service.get_task_status(task_id)
        
        # Fall back to old system
        if task_id in self.id_mappings:
            new_id = self.id_mappings[task_id]
            return await self.new_service.get_task_status(new_id)
        
        # Legacy task ID
        return self.old_manager.get_task_status(task_id)
```

**Data Migration Strategy**
```python
class DataMigrationService:
    def __init__(self, storage: FileBasedStorage):
        self.storage = storage
    
    async def migrate_existing_data(self):
        """Migrate existing data to new storage format"""
        
        # Migrate configuration files
        await self._migrate_config_files()
        
        # Migrate task data
        await self._migrate_task_data()
        
        # Migrate session data
        await self._migrate_session_data()
    
    async def _migrate_config_files(self):
        """Convert config.txt to new JSON format"""
        config_txt_path = Path("config.txt")
        if config_txt_path.exists():
            # Read old config
            old_config = {}
            with open(config_txt_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if '=' in line and not line.startswith('#'):
                        key, value = line.split('=', 1)
                        old_config[key.strip()] = value.strip()
            
            # Convert to new format
            new_config = self._convert_config_format(old_config)
            
            # Save as JSON
            config_storage = ConfigStorage()
            await config_storage.save_config(new_config)
            
            # Backup old config
            backup_path = config_txt_path.with_suffix('.txt.backup')
            shutil.copy2(config_txt_path, backup_path)
    
    def _convert_config_format(self, old_config: Dict[str, str]) -> Dict[str, Any]:
        """Convert old config format to new structured format"""
        new_config = {
            "transcription": {
                "default_backend": old_config.get("TRANSCRIPTION_BACKEND", "whisper"),
                "whisper_model": old_config.get("WHISPER_MODEL", "base"),
                "default_language": old_config.get("LANGUAGE", "auto"),
                "output_formats": ["srt", "lrc", "txt"]
            },
            "translation": {
                "default_translator": old_config.get("TRANSLATOR", "gpt-custom"),
                "default_target_language": old_config.get("TARGET_LANGUAGE", "zh-cn"),
                "cache_enabled": True
            },
            "server": {
                "host": old_config.get("HOST", "localhost"),
                "port": int(old_config.get("PORT", 8000)),
                "workers": int(old_config.get("WORKERS", 1))
            },
            "file_management": {
                "upload_dir": old_config.get("UPLOAD_DIR", "uploads"),
                "max_file_size": old_config.get("MAX_FILE_SIZE", "100MB"),
                "allowed_formats": ["mp4", "mp3", "wav", "m4a"]
            }
        }
        
        return new_config
```

### Testing Strategy

**Unit Testing Approach**
```python
import pytest
from unittest.mock import AsyncMock, patch
from services.transcription_service import TranscriptionService
from storage.session_storage import SessionStorage

@pytest.fixture
async def mock_storage():
    storage = AsyncMock(spec=SessionStorage)
    storage.save_session = AsyncMock()
    storage.load_session = AsyncMock()
    return storage

@pytest.fixture
def transcription_service(mock_storage):
    file_service = AsyncMock()
    notification_service = AsyncMock()
    return TranscriptionService(mock_storage, file_service, notification_service)

class TestTranscriptionService:
    
    async def test_create_transcription(self, transcription_service, mock_storage):
        # Arrange
        audio_path = "/test/audio.mp3"
        config = {"language": "en", "output_format": "srt"}
        
        # Act
        session_id = await transcription_service.start_transcription(audio_path, config)
        
        # Assert
        assert session_id is not None
        assert session_id.startswith("trans_")
        mock_storage.save_session.assert_called_once()
    
    async def test_get_transcription_status_not_found(self, transcription_service, mock_storage):
        # Arrange
        mock_storage.load_session.return_value = None
        
        # Act & Assert
        with pytest.raises(ValueError, match="not found"):
            await transcription_service.get_transcription_status("invalid_id")

# Integration Testing
class TestTranscriptionIntegration:
    
    @pytest.fixture
    async def real_storage(self, tmp_path):
        return SessionStorage(str(tmp_path / "sessions"))
    
    async def test_end_to_end_transcription(self, real_storage):
        # Create services with real storage
        file_service = FileService()
        notification_service = NotificationService()
        service = TranscriptionService(real_storage, file_service, notification_service)
        
        # Test actual workflow
        with patch('backends.whisper_backend.WhisperBackend') as mock_backend:
            # Configure mock
            mock_backend.return_value.transcribe_with_progress.return_value = async_iter([
                {"status": "processing", "progress": 0.5},
                {"status": "completed", "progress": 1.0, "results": []}
            ])
            
            # Execute
            session_id = await service.start_transcription("/test/audio.mp3", {})
            
            # Verify
            status = await service.get_transcription_status(session_id)
            assert status["id"] == session_id
            assert "created_at" in status

async def async_iter(items):
    for item in items:
        yield item
```

## Key Benefits of Simplified Architecture

**1. Maintainability**
- Simple, straightforward service classes with clear responsibilities
- Direct method calls eliminate complex event-driven abstractions
- File-based storage is easy to understand, debug, and backup
- Minimal dependencies reduce complexity and maintenance overhead

**2. Reliability**
- File-based persistence provides inherent data durability
- In-memory caching with file backup ensures fast access and data safety  
- Simple error handling patterns are easier to reason about and debug
- Circuit breakers and retry mechanisms provide resilience without complexity

**3. Performance**
- Direct service calls eliminate event bus overhead
- In-memory caching provides fast data access for active sessions
- Connection pooling optimizes external API usage
- File-based storage avoids database connection overhead

**4. Development Speed**
- Simpler patterns reduce learning curve for new developers
- Less boilerplate code means faster feature development
- Direct debugging without complex abstraction layers
- Easy to mock and test individual components

**5. Operational Simplicity**
- No database setup or maintenance required
- File-based data can be easily backed up, restored, and inspected
- Simple deployment without complex migration scripts
- Easy to scale horizontally by replicating file storage

**6. Flexibility**
- Service-oriented design allows easy replacement of individual components
- File storage can be easily migrated to databases later if needed
- Simple dependency injection allows easy testing and configuration
- Modular design supports incremental improvements

**7. Cost Effectiveness**
- No database licensing or hosting costs
- Reduced infrastructure complexity
- Lower operational overhead
- Easier disaster recovery with simple file backups

This simplified architecture eliminates all identified technical debt while providing a solid foundation for the 51+ API endpoints required by the frontend. The design achieves the same functionality as complex DDD patterns but with significantly less complexity, making it easier to develop, test, maintain, and operate.

The architecture is specifically designed for VoiceTransl's use case where:
- Data volumes are moderate (sessions, tasks, configurations)
- Complex domain relationships are not required
- Development speed and maintainability are priorities
- Simple deployment and operation are important
- The existing file-based project structure should be preserved

---

*Analysis Date: 2025-08-07*  
*Target: Complete backend expansion with zero technical debt using simplified service-oriented architecture*