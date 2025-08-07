// Extended API Types based on FastAPI backend analysis

// Base API Response
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}

// Server Status Types
export interface ServerStatus {
  status: 'running' | 'stopped' | 'starting' | 'unknown'
  url: string
  port: number
  healthy: boolean
  message: string
  response_time_ms?: number
  server_info?: ServerInfo
}

export interface ServerInfo {
  status: string
  url: string
  port: number
  host: string
  max_concurrent_tasks?: number
  request_timeout?: number
}

// Health Check Response
export interface HealthResponse {
  status: string
  server: string
  version: string
}

// Task Types
export interface Task {
  id: string
  type: 'transcription' | 'translation' | 'workflow' | 'config'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  message: string
  created_at: string
  updated_at: string
  result?: unknown
}

export interface TaskStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

// Configuration Types
export interface VoiceTranslConfig {
  transcription: TranscriptionConfig
  translation: TranslationConfig
  server?: ServerConfig
  llama?: LlamaServerConfig
  dictionaries?: DictionariesConfig
  prompts?: PromptsConfig
}

export interface TranscriptionConfig {
  language: string
  suppress_repetitions: boolean
  alignment_backend: 'qwen3' | 'openai' | 'gemini'
  api_key?: string
  api_endpoint?: string
  model_name?: string
}

export interface TranslationConfig {
  translator: string
  language: string
  gpt_token?: string
  gpt_address?: string
  gpt_model?: string
}

export interface ServerConfig {
  host: string
  port: number
  max_concurrent_tasks: number
  request_timeout: number
}

export interface LlamaServerConfig {
  model_file: string
  num_layers: number
  parameters: string
  host?: string
  port?: number
}

export interface DictionariesConfig {
  pre_translation: DictionaryEntry[]
  gpt_dictionary: DictionaryEntry[]
  post_translation: DictionaryEntry[]
}

export interface DictionaryEntry {
  original: string
  translation: string
  enabled?: boolean
}

export interface PromptsConfig {
  extra_prompt: string
  system_prompt?: string
}

// File Types
export interface FileInfo {
  name: string
  size: number
  type: string
  path?: string
}

export interface UploadResponse {
  success: boolean
  file_paths: string[]
  message: string
}

export interface ModelInfo {
  name: string
  path: string
  size_mb: number
  type: string
}

// Task Creation Requests
export interface TranscriptionRequest {
  input_file: string
  language?: string
  suppress_repetitions?: boolean
  alignment_backend?: string
  api_key?: string
  api_endpoint?: string
  model_name?: string
}

export interface TranslationRequest {
  input_file: string
  language?: string
  translator?: string
  gpt_token?: string
  gpt_address?: string
  gpt_model?: string
}

export interface WorkflowRequest {
  input_files: string
  language?: string
  translator?: string
  output_format?: string
  api_key?: string
  api_endpoint?: string
  model_name?: string
}

// WebSocket Types
export interface WebSocketMessage {
  type: string
  data: unknown
  timestamp: string
}

// Log Management Types
export interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
}

export interface LogMonitoringStats {
  monitoring: boolean
  monitored_files: number
  files: string[]
}

// API Test Types
export interface ApiTestRequest {
  token: string
  address: string
  model: string
}

// Configuration Backup Types
export interface ConfigBackup {
  filename: string
  created_at: string
  size_kb: number
}

// User Interface Types
export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
  duration?: number
}

// Request/Response wrapper types
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ErrorResponse {
  success: false
  message: string
  errors?: Array<{
    field: string
    message: string
  }>
}

// Specific Response Types for API endpoints
export interface TaskResponse extends ApiResponse<Task> {}

export interface TranscriptionResponse extends ApiResponse<{
  task_id: string
  output_file: string
  format: string
}> {}

export interface TranslationResponse extends ApiResponse<{
  task_id: string
  output_file: string
  format: string
}> {}

export interface ConfigResponse extends ApiResponse<VoiceTranslConfig> {}
