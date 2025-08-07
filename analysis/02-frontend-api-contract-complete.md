# VoiceTransl Frontend API Contract: Complete Specification

## Executive Summary

The React frontend expects a comprehensive REST API with WebSocket support for real-time updates. The API follows a consistent structure with standardized response formats, error handling, and extensive configuration management capabilities. This document provides the complete specification for implementing the backend API that will eliminate all frontend placeholders.

## API Contract Overview

- **Total Endpoints Required**: 51+
- **Authentication**: Optional Bearer token support
- **Response Format**: Standardized JSON with success/error structure
- **WebSocket Support**: Real-time updates for tasks and server status
- **File Upload Support**: Multipart form data handling
- **CORS Support**: Required for local development

---

## A. Configuration Management APIs

### A.1 Full Configuration Management

**GET /config/full**
- **Purpose**: Retrieve complete application configuration
- **Method**: GET
- **Authentication**: Optional
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

### B.1 Server Health & Status

**GET /health**
- **Purpose**: Basic health check endpoint
- **Method**: GET
- **Authentication**: Not required
- **Response**: Server health information
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

### C.1 Task Retrieval

**GET /tasks**
- **Purpose**: List tasks with filtering
- **Method**: GET
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

### D.1 File Upload

**POST /files/upload**
- **Purpose**: Upload files for processing
- **Method**: POST
- **Content-Type**: `multipart/form-data`
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

### G.1 Connection Details

**WebSocket URL**: `ws://localhost:8000/ws`
- **Optional Query Parameter**: `client_id` for session identification
- **Connection Headers**: Standard WebSocket headers
- **Authentication**: Optional Bearer token in query string or headers

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

This comprehensive API contract ensures that the backend implementation will fully support all frontend functionality, including real-time updates, file processing, configuration management, and system monitoring. The specification eliminates all placeholders and provides exact requirements for a production-ready system.

---

*Analysis Date: 2025-08-07*  
*Target: Complete frontend compatibility with zero placeholders*