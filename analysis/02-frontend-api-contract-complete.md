# VoiceTransl Frontend API Contract: Complete Specification

## Executive Summary

The React frontend expects a comprehensive REST API with WebSocket support for real-time updates. The API follows a clean architecture design with clear separation between HTTP routing concerns and business logic. The API layer acts as thin handlers that delegate to dedicated service components, ensuring maintainable and testable code. This document provides the complete specification for implementing the backend API with clean architecture principles that will eliminate all frontend placeholders.

## API Contract Overview

- **Total Endpoints Required**: 51+
- **Architecture**: Clean API layer with service-based business logic
- **Authentication**: Optional Bearer token support
- **Response Format**: Standardized JSON with success/error structure
- **WebSocket Support**: Real-time updates via separate service (port 8001)
- **File Upload Support**: Multipart form data handling
- **CORS Support**: Required for local development
- **Service Injection**: Dependency injection pattern for testable architecture
- **Business Logic Separation**: All business logic extracted from API handlers

## Clean API Architecture Design

### Architecture Principles

The VoiceTransl API follows clean architecture principles with clear separation of concerns:

1. **Thin API Layer**: HTTP handlers focus only on request/response handling
2. **Service-Based Logic**: Business logic encapsulated in dedicated service classes
3. **Dependency Injection**: Services injected into API routes for testability
4. **Separate Concerns**: Clear boundaries between HTTP, business, and infrastructure layers

### Layer Structure

```
api/
├── routers/           # HTTP routing and request/response handling
│   ├── config.py      # Configuration endpoints
│   ├── server.py      # Server control endpoints
│   ├── tasks.py       # Task management endpoints
│   ├── files.py       # File processing endpoints
│   └── logs.py        # Log management endpoints
│
services/              # Business logic services
│   ├── config/        # Configuration management services
│   ├── server/        # Server control services
│   ├── tasks/         # Task processing services
│   ├── files/         # File processing services
│   ├── logs/          # Log management services
│   └── websocket/     # WebSocket service (separate port)
│
core/                  # Infrastructure and shared components
│   ├── container.py   # Dependency injection container
│   ├── storage/       # File-based persistence layer
│   └── integrations/  # External service adapters
│
integrations/          # External service adapters
├── galtransl/         # GalTransl integration
├── whisper/           # Whisper integration
└── kikoeru/           # Kikoeru integration
```

### Service Injection Pattern

```python
# api/routers/config.py - Clean API handler
from fastapi import APIRouter, Depends
from services.config.config_service import ConfigService
from core.container import get_config_service

router = APIRouter(prefix="/config")

@router.get("/full")
async def get_full_config(
    config_service: ConfigService = Depends(get_config_service)
) -> ApiResponse[VoiceTranslConfig]:
    """Retrieve complete application configuration."""
    try:
        config = await config_service.get_full_config()
        return ApiResponse(
            success=True,
            message="Configuration retrieved",
            data=config
        )
    except ConfigError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/full")
async def save_full_config(
    config_data: VoiceTranslConfig,
    config_service: ConfigService = Depends(get_config_service)
) -> ApiResponse:
    """Save complete configuration."""
    try:
        await config_service.save_full_config(config_data)
        return ApiResponse(
            success=True,
            message="Configuration saved successfully"
        )
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except ConfigError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Business Logic Service Example

```python
# services/config/config_service.py - Business logic service
from typing import Optional
from core.storage.file_storage import FileStorage
from models.config import VoiceTranslConfig, TranscriptionConfig
from integrations.galtransl.adapter import GalTranslAdapter

class ConfigService:
    """Service for configuration management business logic."""
    
    def __init__(
        self,
        storage: FileStorage,
        galtransl_adapter: GalTranslAdapter
    ):
        self.storage = storage
        self.galtransl_adapter = galtransl_adapter
    
    async def get_full_config(self) -> VoiceTranslConfig:
        """Load complete configuration from storage."""
        config_data = await self.storage.load_config("config.yaml")
        if not config_data:
            return self._get_default_config()
        return VoiceTranslConfig.parse_obj(config_data)
    
    async def save_full_config(self, config: VoiceTranslConfig) -> None:
        """Save complete configuration to storage."""
        # Validate configuration
        await self._validate_config(config)
        
        # Save to storage
        await self.storage.save_config("config.yaml", config.dict())
        
        # Update GalTransl configuration
        await self.galtransl_adapter.update_config(config.translation)
    
    async def test_api_connection(
        self, 
        token: str, 
        address: str, 
        model: str
    ) -> dict:
        """Test API connection with given credentials."""
        return await self.galtransl_adapter.test_connection(
            token, address, model
        )
    
    async def _validate_config(self, config: VoiceTranslConfig) -> None:
        """Validate configuration before saving."""
        if config.translation.translator == "gpt" and not config.translation.gpt_token:
            raise ConfigError("GPT token required for GPT translator")
        # Additional validation logic...
    
    def _get_default_config(self) -> VoiceTranslConfig:
        """Get default configuration."""
        return VoiceTranslConfig(
            transcription=TranscriptionConfig(
                language="auto",
                suppress_repetitions=True,
                alignment_backend="qwen3"
            ),
            # Other default settings...
        )
```

### WebSocket Service Architecture

```python
# services/websocket/websocket_service.py - Separate WebSocket service
from fastapi import WebSocket
from typing import Set, Dict
from core.events import EventBus

class WebSocketService:
    """Manages WebSocket connections and real-time updates."""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.connections: Set[WebSocket] = set()
        self.client_tasks: Dict[str, Set[str]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Handle new WebSocket connection."""
        await websocket.accept()
        self.connections.add(websocket)
        self.client_tasks[client_id] = set()
        
        # Subscribe to relevant events
        await self.event_bus.subscribe("task_progress", self._handle_task_update)
        await self.event_bus.subscribe("server_status", self._handle_server_update)
    
    async def broadcast_task_update(self, task_id: str, update: dict) -> None:
        """Broadcast task update to relevant clients."""
        message = {
            "type": "task_progress",
            "data": {
                "task_id": task_id,
                **update
            },
            "timestamp": time.time()
        }
        await self._broadcast_message(message)
    
    async def _broadcast_message(self, message: dict) -> None:
        """Send message to all connected clients."""
        disconnected = set()
        for connection in self.connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.add(connection)
        
        # Clean up disconnected clients
        self.connections -= disconnected

# WebSocket endpoint runs on separate port 8001
# websocket/main.py
from fastapi import FastAPI, WebSocket
from services.websocket.websocket_service import WebSocketService

app = FastAPI()
ws_service = WebSocketService(event_bus)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, client_id: str = None):
    await ws_service.connect(websocket, client_id or "anonymous")
    try:
        while True:
            data = await websocket.receive_json()
            await ws_service.handle_message(data)
    except Exception:
        await ws_service.disconnect(websocket, client_id)
```

---

## A. Configuration Management APIs

### Clean Architecture Implementation

**Service Layer**: `services.config.ConfigService`
**Storage Layer**: `core.storage.FileStorage` (YAML-based persistence)
**Integration Layer**: `integrations.galtransl.GalTranslAdapter`

The configuration APIs delegate all business logic to the `ConfigService`, which handles:
- Configuration validation and transformation
- File-based persistence via storage layer
- Integration with GalTransl configuration updates
- API credential testing and validation
- Configuration backup and migration

**API Router Implementation Pattern**:
```python
# All configuration endpoints follow this pattern
@router.get("/endpoint")
async def endpoint_handler(
    config_service: ConfigService = Depends(get_config_service)
) -> ApiResponse:
    return await config_service.handle_business_logic()
```

### A.1 Full Configuration Management

**GET /config/full**
- **Purpose**: Retrieve complete application configuration
- **Method**: GET
- **Authentication**: Optional
- **Service Delegation**: `config_service.get_full_config()`
- **Response Format**:
```json
{
  "success": true,
  "message": "Configuration retrieved",
  "data": {
    "transcription": TranscriptionConfig,
    "translation": TranslationConfig,
    "llama": LlamaServerConfig,
    "dictionaries": DictionariesConfig,
    "prompts": PromptsConfig
  }
}
```

**POST /config/full**
- **Purpose**: Save complete configuration
- **Method**: POST
- **Content-Type**: application/json
- **Request Body**: `VoiceTranslConfig` object
- **Service Delegation**: `config_service.save_full_config(config)`
- **Business Logic**: Validation, storage persistence, GalTransl integration
- **Response**: Standard `ApiResponse`

### A.2 Transcription Configuration

**GET /config/transcription**
- **Purpose**: Get current transcription settings
- **Method**: GET
- **Response Data**:
```typescript
{
  language: string           // Default: "auto"
  suppress_repetitions: boolean
  alignment_backend: 'qwen3' | 'openai' | 'gemini'
  api_key?: string
  api_endpoint?: string
  model_name?: string
}
```

**POST /config/transcription**
- **Purpose**: Update transcription configuration
- **Method**: POST
- **Request Body**: `TranscriptionConfig`
- **Response**: Success confirmation

### A.3 Translation Configuration

**GET /config/translation**
- **Purpose**: Get current translation settings
- **Method**: GET
- **Response Data**:
```typescript
{
  translator: string
  language: string
  gpt_token?: string
  gpt_address?: string
  gpt_model?: string
}
```

**POST /config/translation**
- **Purpose**: Update translation configuration
- **Method**: POST
- **Request Body**: `TranslationConfig`
- **Response**: Success confirmation

### A.4 LLaMA Server Configuration

**GET /config/llama**
- **Purpose**: Get LLaMA server settings
- **Method**: GET
- **Response Data**:
```typescript
{
  model_file: string
  num_layers: number
  parameters: string
  host?: string
  port?: number
}
```

**POST /config/llama**
- **Purpose**: Update LLaMA server configuration
- **Method**: POST
- **Request Body**: `LlamaServerConfig`
- **Response**: Success confirmation

**GET /config/llama/models**
- **Purpose**: List available LLaMA models
- **Method**: GET
- **Response Data**: Array of available models
```typescript
{
  success: true,
  data: ModelInfo[]
}

interface ModelInfo {
  name: string
  path: string
  size_mb: number
  type: string
}
```

### A.5 Dictionaries Management

**GET /config/dictionaries**
- **Purpose**: Get translation dictionaries
- **Method**: GET
- **Response Data**:
```typescript
{
  pre_translation: DictionaryEntry[]
  gpt_dictionary: DictionaryEntry[]
  post_translation: DictionaryEntry[]
}

interface DictionaryEntry {
  original: string
  translation: string
  enabled: boolean
}
```

**POST /config/dictionaries**
- **Purpose**: Update translation dictionaries
- **Method**: POST
- **Request Body**: Complete dictionaries configuration
- **Response**: Success confirmation

### A.6 Prompts Configuration

**GET /config/prompts**
- **Purpose**: Get translation prompts
- **Method**: GET
- **Response Data**:
```typescript
{
  extra_prompt: string
  system_prompt?: string
}
```

**POST /config/prompts**
- **Purpose**: Update translation prompts
- **Method**: POST
- **Request Body**: `PromptsConfig`
- **Response**: Success confirmation

### A.7 Configuration Utilities

**POST /config/migrate-from-txt**
- **Purpose**: Migrate from legacy text-based config files
- **Method**: POST
- **Request Body**: Optional migration parameters
- **Response**: Success/failure status

**GET /config/backup-list**
- **Purpose**: List available configuration backups
- **Method**: GET
- **Response**: Array of backup metadata

**POST /config/test-api**
- **Purpose**: Test API connection with given credentials
- **Method**: POST
- **Service Delegation**: `config_service.test_api_connection()`
- **Business Logic**: Connection testing via GalTransl adapter
- **Request Body**:
```typescript
{
  token: string
  address: string
  model: string
}
```
- **Response**:
```typescript
{
  success: boolean
  message: string
  response_time_ms?: number
}
```

---

## B. Server Control & Status APIs

### Clean Architecture Implementation

**Service Layer**: `services.server.ServerControlService`
**Storage Layer**: `core.storage.ServerConfigStorage`
**Integration Layer**: `integrations.llama.LlamaServerAdapter`

The server control APIs delegate to `ServerControlService` which manages:
- Server lifecycle operations (start/stop/restart)
- Health monitoring and diagnostics
- Configuration management for server settings
- Log aggregation and monitoring
- Process management and resource monitoring

**Service Injection Pattern**:
```python
@router.post("/start")
async def start_server(
    config: Optional[ServerConfig],
    server_service: ServerControlService = Depends(get_server_service)
) -> ApiResponse:
    return await server_service.start_server(config)
```

### B.1 Server Health & Status

**GET /health**
- **Purpose**: Basic health check endpoint
- **Method**: GET
- **Authentication**: Not required
- **Service Delegation**: `server_service.get_health_status()`
- **Business Logic**: Health diagnostics, dependency checking, status aggregation
- **Expected Response Structure**:
```json
{
  "status": "running" | "stopped" | "starting" | "unknown",
  "url": "http://localhost:8000",
  "port": 8000,
  "healthy": true,
  "message": "Server is healthy",
  "response_time_ms": 45,
  "server_info": {
    "status": "running",
    "url": "http://localhost:8000", 
    "port": 8000,
    "host": "localhost",
    "max_concurrent_tasks": 4,
    "request_timeout": 300
  }
}
```

### B.2 Server Control Operations

**POST /server/start**
- **Purpose**: Start the server
- **Method**: POST
- **Service Delegation**: `server_service.start_server(config)`
- **Business Logic**: Process spawning, configuration application, health verification
- **Request Body**: `Partial<ServerConfig>` (optional)
- **Response**: Operation confirmation
```typescript
interface ServerConfig {
  host: string
  port: number
  max_concurrent_tasks: number
  request_timeout: number
}
```

**POST /server/stop**
- **Purpose**: Stop the server
- **Method**: POST
- **Request Body**: `{ force?: boolean }`
- **Response**: Operation confirmation

**POST /server/restart**
- **Purpose**: Restart the server
- **Method**: POST
- **Request Body**: Optional parameters
- **Response**: Operation confirmation

### B.3 Server Information

**GET /server/health**
- **Purpose**: Detailed health check with diagnostics
- **Method**: GET
- **Response**: Detailed health check information

**GET /server/info**
- **Purpose**: Get server information and capabilities
- **Method**: GET
- **Response**: Server information and capabilities

**GET /server/logs**
- **Purpose**: Retrieve server logs
- **Method**: GET
- **Query Parameters**: `lines?: number` (default: 50)
- **Response**: Server log entries

**GET /server/config**
- **Purpose**: Get current server configuration
- **Method**: GET
- **Response**: Server configuration

**POST /server/config**
- **Purpose**: Update server configuration
- **Method**: POST
- **Request Body**: `ServerConfig`
- **Response**: Configuration update confirmation

---

## C. Task Management APIs

### Clean Architecture Implementation

**Service Layer**: `services.tasks.TaskManager`
**Storage Layer**: `core.storage.TaskStorage` (JSON-based task persistence)
**Background Processing**: `services.tasks.BackgroundProcessor`
**WebSocket Integration**: Events published to `services.websocket.WebSocketService`

The task management APIs delegate to `TaskManager` service which handles:
- Async task creation and lifecycle management
- Task status tracking and progress updates
- Background task processing coordination
- Task history and statistics
- Real-time progress broadcasting via WebSocket events

**Service Architecture**:
```python
class TaskManager:
    def __init__(
        self,
        storage: TaskStorage,
        processor: BackgroundProcessor,
        event_bus: EventBus
    ):
        self.storage = storage
        self.processor = processor
        self.event_bus = event_bus
    
    async def create_task(self, task_request: TaskRequest) -> str:
        task = await self.storage.create_task(task_request)
        await self.processor.enqueue_task(task)
        await self.event_bus.publish("task_created", task)
        return task.id
```

### C.1 Task Retrieval

**GET /tasks**
- **Purpose**: List tasks with filtering
- **Method**: GET
- **Service Delegation**: `task_manager.list_tasks(filters)`
- **Business Logic**: Task filtering, pagination, status aggregation
- **Query Parameters**:
  - `status?: string` (e.g., "running")
  - `limit?: number` (default: 100)
- **Response Format**:
```json
{
  "tasks": Task[]
}
```

**GET /status/{taskId}**
- **Purpose**: Get specific task details
- **Method**: GET
- **Path Parameters**: `taskId: string`
- **Response**: Single `Task` object

**GET /tasks/background/active**
- **Purpose**: Get all active background tasks
- **Method**: GET
- **Response**: Active background tasks as Record<string, Task>

**GET /tasks/background/history**
- **Purpose**: Get background task history
- **Method**: GET
- **Query Parameters**: `limit?: number`
- **Response**: Historical tasks array

**GET /stats**
- **Purpose**: Get task statistics
- **Method**: GET
- **Response**:
```typescript
{
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}
```

### C.2 Task Control

**DELETE /tasks/{taskId}**
- **Purpose**: Cancel task
- **Method**: DELETE
- **Path Parameters**: `taskId: string`
- **Response**: Cancellation confirmation

**POST /tasks/background/{taskId}/cancel**
- **Purpose**: Cancel background task
- **Method**: POST
- **Path Parameters**: `taskId: string`
- **Response**: Cancellation confirmation

**DELETE /tasks/background/history**
- **Purpose**: Clear task history
- **Method**: DELETE
- **Response**: Operation confirmation

### C.3 Task Creation

**POST /tasks/create**
- **Purpose**: Create new background task
- **Method**: POST
- **Service Delegation**: `task_manager.create_background_task(request)`
- **Business Logic**: Task validation, background processing setup, progress tracking
- **Request Body**: `BackgroundTaskRequest`
```typescript
{
  task_type: 'config' | 'transcription' | 'translation' | 'output' | 'workflow'
  config: Record<string, unknown>
}
```
- **Response**: `{ task_id: string }`

---

## D. File Processing APIs

### Clean Architecture Implementation

**Service Layer**: `services.files.FileProcessingService`
**Storage Layer**: `core.storage.FileStorage` (file system operations)
**Integration Layers**: 
- `integrations.whisper.WhisperAdapter` (transcription)
- `integrations.galtransl.GalTranslAdapter` (translation)
- `integrations.kikoeru.KikoeruAdapter` (audio processing)

The file processing APIs delegate to specialized services:
- **File Upload**: Input validation, storage management, metadata extraction
- **Transcription**: Whisper integration, format conversion, alignment processing
- **Translation**: GalTransl integration, dictionary application, prompt management
- **Workflow**: End-to-end processing coordination, status tracking

**Service Integration Pattern**:
```python
class FileProcessingService:
    def __init__(
        self,
        storage: FileStorage,
        whisper: WhisperAdapter,
        galtransl: GalTranslAdapter,
        task_manager: TaskManager
    ):
        self.storage = storage
        self.whisper = whisper
        self.galtransl = galtransl
        self.task_manager = task_manager
    
    async def start_transcription(
        self, 
        request: TranscriptionTaskRequest
    ) -> str:
        # Validate input file
        await self.storage.validate_file(request.input_file)
        # Create background task
        return await self.task_manager.create_task(
            "transcription", 
            request.dict()
        )
```

### D.1 File Upload

**POST /files/upload**
- **Purpose**: Upload files for processing
- **Method**: POST
- **Content-Type**: `multipart/form-data`
- **Service Delegation**: `file_service.handle_upload(files)`
- **Business Logic**: File validation, storage, metadata extraction, virus scanning
- **Body**: Multiple files as form data
- **Response**:
```typescript
{
  success: boolean
  file_paths: string[]
  message: string
}
```

### D.2 Processing Workflows

**POST /process/transcribe**
- **Purpose**: Start transcription workflow
- **Method**: POST
- **Service Delegation**: `file_service.start_transcription_workflow(request)`
- **Business Logic**: Whisper integration, alignment processing, format conversion
- **Request Body**: `TranscriptionTaskRequest`
```typescript
{
  input_file: string
  language: string
  suppress_repetitions: boolean
  alignment_backend: 'qwen3' | 'openai' | 'gemini'
  api_key?: string
  api_endpoint?: string
  model_name?: string
}
```
- **Response**: `{ task_id: string }`

**POST /process/translate**
- **Purpose**: Start translation workflow
- **Method**: POST
- **Service Delegation**: `file_service.start_translation_workflow(request)`
- **Business Logic**: GalTransl integration, dictionary application, prompt processing
- **Request Body**: `TranslationTaskRequest`
```typescript
{
  input_file: string
  language: string
  translator?: string
  gpt_token?: string
  gpt_address?: string
  gpt_model?: string
}
```
- **Response**: `{ task_id: string }`

**POST /process/workflow**
- **Purpose**: Start complete processing workflow
- **Method**: POST
- **Service Delegation**: `file_service.start_complete_workflow(request)`
- **Business Logic**: End-to-end processing coordination, progress tracking, error recovery
- **Request Body**: `WorkflowTaskRequest`
```typescript
{
  input_files: string | string[]
  language: string
  translator?: string
  output_format: string
  api_key?: string
  api_endpoint?: string
  model_name?: string
}
```
- **Response**: `{ task_id: string }`

**POST /process/save-config**
- **Purpose**: Save configuration via workflow
- **Method**: POST
- **Request Body**: Configuration data
- **Response**: `{ task_id: string }`

---

## E. Log Management APIs

### E.1 Log Monitoring

**GET /logs/status**
- **Purpose**: Get log monitoring status
- **Method**: GET
- **Response**:
```typescript
{
  success: true,
  data: {
    monitoring: boolean
    monitored_files: number
    files: string[]
  }
}
```

**POST /logs/add-file**
- **Purpose**: Add file to log monitoring
- **Method**: POST
- **Request Body**:
```json
{
  "file_path": "string",
  "log_type": "general"
}
```
- **Response**: Success confirmation

**POST /logs/remove-file**
- **Purpose**: Remove file from log monitoring
- **Method**: POST
- **Request Body**:
```json
{
  "file_path": "string"
}
```
- **Response**: Success confirmation

**GET /logs/recent**
- **Purpose**: Get recent log entries
- **Method**: GET
- **Query Parameters**:
  - `file_path?: string` (default: "log.txt")
  - `lines?: number` (default: 50)
- **Response**:
```typescript
{
  success: true,
  data: LogEntry[]
}

interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
}
```

---

## F. LLaMA Server Control APIs

**GET /llama/status**
- **Purpose**: Get LLaMA server status
- **Method**: GET
- **Response**:
```json
{
  "running": boolean,
  "status": string,
  "message": string
}
```

**POST /llama/start**
- **Purpose**: Start LLaMA server
- **Method**: POST
- **Request Body**: Configuration object
- **Response**: Start operation confirmation

**POST /llama/stop**
- **Purpose**: Stop LLaMA server
- **Method**: POST
- **Response**: Stop operation confirmation

---

## G. WebSocket Protocol

### Clean Architecture Implementation

**Service Layer**: `services.websocket.WebSocketService` (runs on port 8001)
**Event System**: `core.events.EventBus` for decoupled communication
**Integration**: WebSocket service subscribes to events from other services

The WebSocket functionality is implemented as a separate service to ensure:
- **Separation of Concerns**: WebSocket logic isolated from HTTP API
- **Scalability**: Can run on different port/process for load distribution
- **Event-Driven**: Loosely coupled with other services via event bus
- **Connection Management**: Dedicated service for connection lifecycle

**Architecture Pattern**:
```python
# services/websocket/websocket_service.py
class WebSocketService:
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.connection_manager = ConnectionManager()
        self._setup_event_subscriptions()
    
    async def _setup_event_subscriptions(self):
        await self.event_bus.subscribe("task_progress", self._broadcast_task_update)
        await self.event_bus.subscribe("server_status", self._broadcast_server_status)
        await self.event_bus.subscribe("log_update", self._broadcast_log_update)
```

### G.1 Connection Details

**WebSocket URL**: `ws://localhost:8001/ws` (separate port from API)
- **Optional Query Parameter**: `client_id` for session identification
- **Connection Headers**: Standard WebSocket headers
- **Authentication**: Optional Bearer token in query string or headers
- **Service Architecture**: Dedicated WebSocket service with event bus integration
- **Connection Management**: Automatic reconnection, heartbeat, cleanup

### G.2 Message Format

All WebSocket messages follow this structure:
```typescript
{
  type: string
  data?: unknown
  timestamp?: number
}
```

### G.3 Message Types

#### Ping/Pong
- **Client sends**: `{ type: 'ping', timestamp: number }`
- **Server responds**: `{ type: 'pong', timestamp: number }`

#### Task Progress Updates
- **Type**: `task_progress`
- **Data Structure**:
```typescript
{
  task_id: string
  type: 'transcription' | 'translation' | 'workflow' | 'config' | 'output'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message: string
}
```

#### Server Status Updates
- **Type**: `server_status`
- **Data Structure**:
```typescript
{
  status: 'running' | 'stopped' | 'starting'
  url: string
  port: number
  healthy: boolean
  message: string
  response_time_ms?: number
  server_info?: ServerInfo
}
```

#### Log Updates
- **Type**: `log_update`
- **Data Structure**:
```typescript
{
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  timestamp: string
  source?: string
}
```

---

## H. Data Models

### H.1 Standard API Response Format

```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
}
```

### H.2 Task Model

```typescript
interface Task {
  id: string
  type: 'transcription' | 'translation' | 'workflow' | 'config' | 'output'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message: string
  created_at: string
  updated_at: string
  result?: unknown
  config?: TaskConfig
}

interface TaskConfig {
  input_file?: string
  input_files?: string[]
  language?: string
  translator?: string
  output_format?: string
  [key: string]: unknown
}
```

### H.3 Configuration Models

```typescript
interface TranscriptionConfig {
  language: string
  suppress_repetitions: boolean
  alignment_backend: 'qwen3' | 'openai' | 'gemini'
  api_key?: string
  api_endpoint?: string
  model_name?: string
}

interface TranslationConfig {
  translator: string
  language: string
  gpt_token?: string
  gpt_address?: string
  gpt_model?: string
}

interface LlamaServerConfig {
  model_file: string
  num_layers: number
  parameters: string
  host?: string
  port?: number
}

interface VoiceTranslConfig {
  transcription: TranscriptionConfig
  translation: TranslationConfig
  llama: LlamaServerConfig
  dictionaries: DictionariesConfig
  prompts: PromptsConfig
}
```

---

## I. Error Handling

### I.1 HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Unprocessable Entity
- **500**: Internal Server Error
- **503**: Service Unavailable

### I.2 Error Response Format
```typescript
{
  success: false,
  message: "Error description",
  errors?: [
    {
      field?: string,
      code: string,
      message: string
    }
  ]
}
```

### I.3 Validation Errors
```typescript
{
  success: false,
  message: "Validation failed",
  errors: [
    {
      field: "language",
      code: "INVALID_VALUE",
      message: "Language code must be valid ISO 639-1 format"
    }
  ]
}
```

---

## J. Authentication & Security

### J.1 Request Headers
- **Content-Type**: `application/json` (standard API calls)
- **Content-Type**: `multipart/form-data` (file uploads)
- **X-Request-ID**: Unique request identifier for tracking
- **Authorization**: `Bearer {token}` (when authentication is required)
- **Accept**: `application/json`

### J.2 Environment Configuration
- **Base URL**: `VITE_API_BASE_URL` (default: `http://localhost:8000`)
- **WebSocket URL**: `VITE_WS_URL` (default: `ws://localhost:8000/ws`)
- **Timeout**: `VITE_API_TIMEOUT` (default: 30000ms)

### J.3 CORS Requirements
```typescript
{
  origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  credentials: true
}
```

---

## K. Frontend Integration Patterns

### K.1 React Query Usage
- **Caching Strategy**: Automatic caching with appropriate stale times
- **Refetch Intervals**: 
  - Server status: 10 seconds
  - Active tasks: 2 seconds
  - Task history: Manual refetch
  - Logs: 5 seconds
  - Configuration: Manual refetch

### K.2 Real-time Updates
- **WebSocket Connection**: Auto-connect with reconnection logic
- **Event Handling**: Task progress, server status, log updates
- **State Synchronization**: Updates both React Query cache and Zustand store
- **Connection Management**: Automatic reconnection on disconnect

### K.3 Error Handling Strategy
- **Toast Notifications**: Success/error feedback using Sonner
- **Retry Logic**: Automatic retries with exponential backoff
- **Graceful Degradation**: Fallbacks when APIs are unavailable
- **Error Boundaries**: Component-level error isolation

### K.4 Loading States
- **Skeleton Loading**: For data-heavy components
- **Button Loading**: For form submissions
- **Progressive Loading**: For large datasets
- **Optimistic Updates**: For non-critical operations

---

## L. Performance Requirements

### L.1 Response Times
- **Configuration APIs**: < 500ms
- **Task Management**: < 200ms
- **File Upload**: Depends on file size
- **WebSocket Messages**: < 100ms
- **Health Checks**: < 100ms

### L.2 File Upload Limits
- **Maximum File Size**: 1GiB per file
- **Supported Formats**: Audio/video files for transcription
- **Concurrent Uploads**: Up to 3 files simultaneously
- **Progress Tracking**: Required for files > 10MB

### L.3 WebSocket Requirements
- **Max Connections**: 100 concurrent connections
- **Message Rate**: Up to 10 messages/second per connection
- **Heartbeat Interval**: 30 seconds
- **Reconnection Strategy**: Exponential backoff up to 30 seconds

---

## M. Frontend State Management Integration

### M.1 Zustand Store Integration
The API responses need to integrate with the frontend's Zustand store structure:

```typescript
interface AppState {
  // Server status from /health endpoint
  serverStatus: ServerStatus
  
  // Configuration from /config/* endpoints
  config: VoiceTranslConfig
  
  // Active tasks from /tasks/background/active
  activeTasks: Record<string, Task>
  
  // Task history from /tasks/background/history
  taskHistory: Task[]
  
  // WebSocket connection state
  websocket: {
    connected: boolean
    reconnecting: boolean
    lastMessage?: WebSocketMessage
  }
}
```

### M.2 React Query Cache Keys
The API must work with these cache key patterns:
```typescript
// Server status
['server', 'status']

// Configuration
['config', 'full']
['config', 'transcription']
['config', 'translation']
['config', 'llama']

// Tasks
['tasks', 'active']
['tasks', 'history', { limit?: number }]
['tasks', taskId]

// Logs
['logs', 'status']
['logs', 'recent', { file_path?: string, lines?: number }]
```

---

## N. Service Organization Strategy

### Service Component Mapping

The 51+ API endpoints are organized into service components as follows:

**Configuration Management (12 endpoints)**
- `services.config.ConfigService` - Main configuration operations
- `services.config.MigrationService` - Legacy config migration
- `services.config.ValidationService` - Config validation and testing

**Server Control (11 endpoints)**  
- `services.server.ServerControlService` - Lifecycle management
- `services.server.HealthService` - Health monitoring and diagnostics
- `services.server.LogService` - Log aggregation and monitoring

**Task Management (9 endpoints)**
- `services.tasks.TaskManager` - Task lifecycle and status
- `services.tasks.BackgroundProcessor` - Async task execution
- `services.tasks.StatisticsService` - Task metrics and reporting

**File Processing (8 endpoints)**
- `services.files.FileProcessingService` - Upload and validation
- `services.files.TranscriptionService` - Whisper integration workflows
- `services.files.TranslationService` - GalTransl integration workflows
- `services.files.WorkflowService` - End-to-end processing coordination

**Log Management (5 endpoints)**
- `services.logs.LogMonitoringService` - File monitoring and aggregation
- `services.logs.LogStreamService` - Real-time log streaming

**LLaMA Server Control (3 endpoints)**
- `services.llama.LlamaServerService` - LLaMA.cpp server management

**WebSocket Protocol (1 service, separate port)**
- `services.websocket.WebSocketService` - Real-time updates (port 8001)

### Directory Structure

```
services/
├── config/
│   ├── config_service.py         # Main configuration operations
│   ├── migration_service.py      # Legacy migration
│   └── validation_service.py     # API testing and validation
│
├── server/
│   ├── server_control_service.py # Process lifecycle
│   ├── health_service.py         # Health monitoring
│   └── log_service.py            # Server log management
│
├── tasks/
│   ├── task_manager.py           # Task lifecycle
│   ├── background_processor.py   # Async execution
│   └── statistics_service.py     # Metrics and reporting
│
├── files/
│   ├── file_processing_service.py # Upload and validation
│   ├── transcription_service.py   # Whisper workflows
│   ├── translation_service.py     # GalTransl workflows
│   └── workflow_service.py        # End-to-end processing
│
├── logs/
│   ├── log_monitoring_service.py  # File monitoring
│   └── log_stream_service.py      # Real-time streaming
│
├── llama/
│   └── llama_server_service.py    # LLaMA.cpp management
│
└── websocket/
    ├── websocket_service.py       # Connection management
    ├── connection_manager.py      # Connection lifecycle
    └── message_handler.py         # Message routing

core/
├── container.py                   # Dependency injection container
├── events/
│   ├── event_bus.py              # Event system for service communication
│   └── event_types.py            # Event type definitions
│
└── storage/
    ├── file_storage.py           # File system operations
    ├── config_storage.py         # Configuration persistence
    └── task_storage.py           # Task state persistence

integrations/
├── galtransl/
│   ├── adapter.py                # GalTransl integration
│   └── config_mapper.py          # Configuration mapping
│
├── whisper/
│   ├── adapter.py                # Whisper integration
│   └── format_converter.py       # Format conversion
│
└── kikoeru/
    └── adapter.py                # Kikoeru audio processing
```

### Dependency Injection Container

```python
# core/container.py
from dependency_injector import containers, providers
from services.config.config_service import ConfigService
from services.tasks.task_manager import TaskManager
from core.storage.file_storage import FileStorage

class ApplicationContainer(containers.DeclarativeContainer):
    # Storage layer
    file_storage = providers.Singleton(FileStorage)
    config_storage = providers.Singleton(ConfigStorage)
    task_storage = providers.Singleton(TaskStorage)
    
    # Integration layer
    galtransl_adapter = providers.Singleton(GalTranslAdapter)
    whisper_adapter = providers.Singleton(WhisperAdapter)
    
    # Service layer
    config_service = providers.Singleton(
        ConfigService,
        storage=file_storage,
        galtransl_adapter=galtransl_adapter
    )
    
    task_manager = providers.Singleton(
        TaskManager,
        storage=task_storage,
        event_bus=event_bus
    )
    
    # Event system
    event_bus = providers.Singleton(EventBus)
    
    # WebSocket service (separate container for port 8001)
    websocket_service = providers.Singleton(
        WebSocketService,
        event_bus=event_bus
    )

# Dependency injection helpers
async def get_config_service() -> ConfigService:
    return container.config_service()

async def get_task_manager() -> TaskManager:
    return container.task_manager()
```

### Service Lifecycle Management

```python
# core/lifecycle.py
class ServiceLifecycleManager:
    def __init__(self, container: ApplicationContainer):
        self.container = container
    
    async def startup(self):
        # Initialize storage layers
        await self.container.file_storage().initialize()
        await self.container.task_storage().initialize()
        
        # Start background services
        await self.container.task_manager().start_background_processor()
        
        # Initialize integrations
        await self.container.galtransl_adapter().initialize()
        await self.container.whisper_adapter().initialize()
    
    async def shutdown(self):
        # Gracefully shutdown services
        await self.container.task_manager().stop_background_processor()
        await self.container.websocket_service().close_all_connections()
```

---

## O. Missing Implementation Requirements

### Service Layer Architecture Requirements

**Configuration Services**
- YAML-based configuration persistence with validation
- Configuration migration from legacy text files
- API credential testing and validation
- GalTransl configuration synchronization
- Configuration backup and restore functionality

**Server Management Services**
- Process lifecycle management (start/stop/restart)
- Health monitoring with dependency checking
- Resource monitoring and metrics collection
- Log aggregation from multiple sources
- Configuration hot-reloading

**Task Processing Services**
- Async task queue with priority handling
- Background task execution with progress tracking
- Task persistence and recovery after restarts
- Real-time progress broadcasting via events
- Task statistics and performance metrics

**File Processing Services**
- Multi-format file upload with validation
- Transcription workflow coordination
- Translation pipeline management
- Format conversion and output generation
- Error recovery and retry mechanisms

### Storage Layer Requirements

**File-Based Persistence**
- YAML configuration storage with atomic writes
- JSON task state persistence with indexing
- File upload storage with cleanup policies
- Log rotation and archival
- Backup and restore functionality

**Data Integrity**
- Atomic operations for configuration changes
- Task state consistency across restarts
- File upload integrity validation
- Concurrent access handling
- Data corruption detection and recovery

### Integration Layer Requirements

**GalTransl Integration**
- Configuration mapping and synchronization
- Translation request coordination
- Dictionary and prompt management
- Error handling and retry logic
- Performance monitoring

**Whisper Integration**
- Multiple Whisper backend support
- Audio format validation and conversion
- Transcription result alignment
- Progress tracking and cancellation
- Model management and caching

**Kikoeru Integration**
- Audio processing pipeline
- Format conversion capabilities
- Metadata extraction
- Quality validation
- Performance optimization

### WebSocket Service Requirements

**Connection Management**
- WebSocket connection lifecycle on port 8001
- Client session tracking and authentication
- Connection pooling and scaling
- Heartbeat and reconnection handling
- Message queuing for disconnected clients

**Event Broadcasting**
- Real-time task progress updates
- Server status change notifications
- Log streaming capabilities
- Configuration change broadcasts
- Error and alert notifications

---

## P. Implementation Effort Estimates

### API Layer Refactoring (2-3 weeks)
- Extract business logic from existing endpoints
- Implement dependency injection pattern
- Add proper error handling and validation
- Create standardized response formatting
- Add comprehensive logging and monitoring

### Service Creation (4-6 weeks)
- **Configuration Services**: 1 week (validation, persistence, migration)
- **Server Control Services**: 1 week (lifecycle, health monitoring, logs)
- **Task Management Services**: 2 weeks (async processing, persistence, events)
- **File Processing Services**: 1.5 weeks (upload, workflows, integrations)
- **Log Management Services**: 0.5 weeks (monitoring, streaming)
- **WebSocket Service**: 1 week (connections, broadcasting, events)

### Integration Layer Development (3-4 weeks)
- **GalTransl Adapter**: 1.5 weeks (config sync, translation coordination)
- **Whisper Adapter**: 1.5 weeks (backend abstraction, result processing)
- **Kikoeru Adapter**: 1 week (audio processing, format conversion)
- **Storage Abstraction**: 1 week (file operations, persistence)

### Infrastructure Setup (1-2 weeks)
- Dependency injection container setup
- Event bus implementation
- Storage layer implementation
- Service lifecycle management
- Testing infrastructure

### WebSocket Service Implementation (1 week)
- Separate service on port 8001
- Connection management and authentication
- Event subscription and broadcasting
- Client session tracking
- Performance optimization

**Total Estimated Effort**: 11-16 weeks

---

## Q. Migration Strategy

### Phase 1: Infrastructure Setup (Week 1-2)
1. **Create Service Foundation**
   - Set up dependency injection container
   - Implement event bus system
   - Create storage abstraction layer
   - Set up service lifecycle management

2. **Establish Testing Framework**
   - Service layer testing utilities
   - Integration testing setup
   - Mock adapters for external services
   - Performance testing framework

### Phase 2: Service Extraction (Week 3-6)
1. **Configuration Services First**
   - Extract config logic from API endpoints
   - Implement YAML-based storage
   - Add validation and testing capabilities
   - Migrate existing configuration data

2. **Task Management Services**
   - Extract task logic from API layer
   - Implement background processing
   - Add progress tracking and events
   - Ensure task persistence across restarts

### Phase 3: Integration Services (Week 7-10)
1. **External Service Adapters**
   - GalTransl integration service
   - Whisper backend abstraction
   - Kikoeru audio processing
   - Configuration synchronization

2. **File Processing Workflows**
   - Upload and validation services
   - Transcription workflow coordination
   - Translation pipeline management
   - End-to-end processing orchestration

### Phase 4: WebSocket Service (Week 11-12)
1. **Separate WebSocket Service**
   - Implement on port 8001
   - Connection management and authentication
   - Event subscription and broadcasting
   - Client session tracking

### Phase 5: API Layer Refactoring (Week 13-15)
1. **Clean API Handlers**
   - Convert endpoints to thin handlers
   - Implement service injection
   - Add comprehensive error handling
   - Standardize response formatting

2. **Testing and Documentation**
   - End-to-end API testing
   - Performance testing and optimization
   - API documentation updates
   - Migration guide completion

### Phase 6: Production Deployment (Week 16)
1. **Production Readiness**
   - Performance optimization
   - Security hardening
   - Monitoring and alerting setup
   - Deployment automation

### Backward Compatibility During Migration

```python
# Gradual migration pattern
@router.get("/config/full")
async def get_full_config(
    # Optional service injection during migration
    config_service: Optional[ConfigService] = Depends(get_config_service_optional)
) -> ApiResponse:
    if config_service:
        # New service-based approach
        return await config_service.get_full_config()
    else:
        # Legacy approach as fallback
        return await legacy_get_full_config()
```

### Testing Approach for Clean Architecture

```python
# Service layer unit tests
class TestConfigService:
    async def test_get_full_config(self):
        # Test service logic in isolation
        mock_storage = AsyncMock()
        mock_adapter = AsyncMock()
        service = ConfigService(mock_storage, mock_adapter)
        
        result = await service.get_full_config()
        assert result.transcription.language == "auto"

# Integration tests
class TestConfigAPI:
    async def test_config_endpoint_integration(self):
        # Test API with real services
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/config/full")
        assert response.status_code == 200
```

---

This comprehensive API contract ensures that the backend implementation will fully support all frontend functionality with clean architecture principles. The specification provides clear separation between HTTP concerns and business logic, enabling maintainable, testable, and scalable code. The service-based architecture eliminates all placeholders and provides exact requirements for a production-ready system with proper separation of concerns.

---

*Analysis Date: 2025-08-07*  
*Target: Complete frontend compatibility with zero placeholders*