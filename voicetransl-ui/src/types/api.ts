// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
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

export interface ServerConfig {
  host: string
  port: number
  max_concurrent_tasks: number
  request_timeout: number
}

// Task Types
export interface Task {
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

export interface TaskConfig {
  input_file?: string
  input_files?: string[]
  language?: string
  translator?: string
  output_format?: string
  [key: string]: unknown
}

export interface TaskStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

// File Types
export interface FileInfo {
  name: string
  size: number
  type: string
  path?: string
  error?: string
}

export interface FileUploadResponse {
  success: boolean
  file_paths: string[]
  message: string
}

// Configuration Types
export interface VoiceTranslConfig {
  transcription: TranscriptionConfig
  translation: TranslationConfig
  llama: LlamaServerConfig
  dictionaries: DictionariesConfig
  prompts: PromptsConfig
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
  enabled: boolean
}

export interface PromptsConfig {
  extra_prompt: string
  system_prompt?: string
}

// Log Types
export interface LogMonitoringStatus {
  monitoring: boolean
  monitored_files: number
  files: string[]
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  source?: string
}

// API Test Types
export interface ApiTestRequest {
  token: string
  address: string
  model: string
}

export interface ApiTestResponse {
  success: boolean
  message: string
  response_time_ms?: number
}

// Background Task Types
export interface BackgroundTaskRequest {
  task_type: 'config' | 'transcription' | 'translation' | 'output' | 'workflow'
  config: Record<string, unknown>
}

export interface TranscriptionTaskRequest {
  input_file: string
  language: string
  suppress_repetitions: boolean
  alignment_backend: 'qwen3' | 'openai' | 'gemini'
  api_key?: string
  api_endpoint?: string
  model_name?: string
}

export interface TranslationTaskRequest {
  input_file: string
  language: string
  translator?: string
  gpt_token?: string
  gpt_address?: string
  gpt_model?: string
}

export interface WorkflowTaskRequest {
  input_files: string | string[]
  language: string
  translator?: string
  output_format: string
  api_key?: string
  api_endpoint?: string
  model_name?: string
}

// Model Types
export interface ModelInfo {
  name: string
  path: string
  size_mb: number
  type: string
}