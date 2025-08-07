import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios'
import type {
  ApiResponse,
  ServerStatus,
  ServerConfig,
  Task,
  TaskStats,
  FileUploadResponse,
  VoiceTranslConfig,
  TranscriptionConfig,
  TranslationConfig,
  LlamaServerConfig,
  DictionariesConfig,
  PromptsConfig,
  LogMonitoringStatus,
  LogEntry,
  ApiTestRequest,
  ApiTestResponse,
  BackgroundTaskRequest,
  TranscriptionTaskRequest,
  TranslationTaskRequest,
  WorkflowTaskRequest,
  ModelInfo,
} from '@/types/api'

export class ApiError extends Error {
  public status?: number
  public response?: unknown
  
  constructor(
    message: string,
    status?: number,
    response?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.response = response
  }
}

// Configuration
const DEFAULT_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  wsURL: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
} as const

export class ApiService {
  private client: AxiosInstance
  public readonly config = DEFAULT_CONFIG

  constructor(baseURL?: string) {
    const apiBaseURL = baseURL || DEFAULT_CONFIG.baseURL
    
    this.client = axios.create({
      baseURL: apiBaseURL,
      timeout: DEFAULT_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      config => {
        // Add timestamp to prevent caching in development
        if (import.meta.env.DEV) {
          config.params = {
            ...config.params,
            _t: Date.now(),
          }
        }
        
        // Add request ID for tracking
        config.headers['X-Request-ID'] = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`
        
        // Log requests in development
        if (import.meta.env.DEV) {
          console.log(`🔄 API Request: ${config.method?.toUpperCase()} ${config.url}`, config)
        }
        
        return config
      },
      error => {
        if (import.meta.env.DEV) {
          console.error('🚫 API Request Error:', error)
        }
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful responses in development
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          })
        }
        return response
      },
      (error: AxiosError) => {
        const message = this.extractErrorMessage(error)
        const status = error.response?.status
        const responseData = error.response?.data
        
        // Log errors in development
        if (import.meta.env.DEV) {
          console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status,
            message,
            data: responseData,
          })
        }
        
        // Enhanced error reporting for production
        if (import.meta.env.PROD && import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
          // TODO: Send error to monitoring service
          console.warn('API Error occurred:', { status, message, url: error.config?.url })
        }

        throw new ApiError(message, status, responseData)
      }
    )
  }

  private extractErrorMessage(error: AxiosError): string {
    if (error.response?.data) {
      const data = error.response.data as any
      if (data.message) return data.message
      if (data.detail) return data.detail
      if (typeof data === 'string') return data
    }

    if (error.message) return error.message
    return 'An unexpected error occurred'
  }

  // ==================== SERVER STATUS & CONTROL ====================

  async getServerStatus(): Promise<ServerStatus> {
    try {
      const response = await this.client.get('/health')
      return {
        status: 'running',
        url: this.config.baseURL,
        port: 8000, // Default FastAPI port
        healthy: true,
        message: 'Server is healthy',
        response_time_ms: undefined,
        server_info: {
          status: response.data.status,
          url: this.config.baseURL,
          port: 8000,
          host: 'localhost'
        }
      }
    } catch (error) {
      return {
        status: 'stopped',
        url: this.config.baseURL,
        port: 8000,
        healthy: false,
        message: 'Server is not responding',
        response_time_ms: undefined
      }
    }
  }

  async startServer(config?: Partial<ServerConfig>): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/server/start', config)
    return response.data
  }

  async stopServer(force = false): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/server/stop', { force })
    return response.data
  }

  async restartServer(): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/server/restart')
    return response.data
  }

  async checkServerHealth(): Promise<ApiResponse> {
    const response = await this.client.get<ApiResponse>('/server/health')
    return response.data
  }

  async getServerInfo(): Promise<ApiResponse> {
    const response = await this.client.get<ApiResponse>('/server/info')
    return response.data
  }

  async getServerLogs(lines = 50): Promise<ApiResponse> {
    const response = await this.client.get<ApiResponse>('/server/logs', {
      params: { lines },
    })
    return response.data
  }

  async getServerConfig(): Promise<ApiResponse<ServerConfig>> {
    const response = await this.client.get<ApiResponse<ServerConfig>>('/server/config')
    return response.data
  }

  async saveServerConfig(config: ServerConfig): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/server/config', config)
    return response.data
  }

  // ==================== CONFIGURATION MANAGEMENT ====================

  async getFullConfig(): Promise<ApiResponse<VoiceTranslConfig>> {
    const response = await this.client.get<ApiResponse<VoiceTranslConfig>>('/config/full')
    return response.data
  }

  async saveFullConfig(config: VoiceTranslConfig): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/config/full', config)
    return response.data
  }

  async getTranscriptionConfig(): Promise<ApiResponse<TranscriptionConfig>> {
    const response = await this.client.get<ApiResponse<TranscriptionConfig>>('/config/transcription')
    return response.data
  }

  async saveTranscriptionConfig(config: TranscriptionConfig): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/config/transcription', config)
    return response.data
  }

  async getTranslationConfig(): Promise<ApiResponse<TranslationConfig>> {
    const response = await this.client.get<ApiResponse<TranslationConfig>>('/config/translation')
    return response.data
  }

  async saveTranslationConfig(config: TranslationConfig): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/config/translation', config)
    return response.data
  }

  async getLlamaConfig(): Promise<ApiResponse<LlamaServerConfig>> {
    const response = await this.client.get<ApiResponse<LlamaServerConfig>>('/config/llama')
    return response.data
  }

  async saveLlamaConfig(config: LlamaServerConfig): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/config/llama', config)
    return response.data
  }

  async getAvailableModels(): Promise<ApiResponse<ModelInfo[]>> {
    const response = await this.client.get<ApiResponse<ModelInfo[]>>('/config/llama/models')
    return response.data
  }

  async getAllDictionaries(): Promise<ApiResponse<DictionariesConfig>> {
    const response = await this.client.get<ApiResponse<DictionariesConfig>>('/config/dictionaries')
    return response.data
  }

  async saveAllDictionaries(dictionaries: DictionariesConfig): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/config/dictionaries', dictionaries)
    return response.data
  }

  async getPromptsConfig(): Promise<ApiResponse<PromptsConfig>> {
    const response = await this.client.get<ApiResponse<PromptsConfig>>('/config/prompts')
    return response.data
  }

  async savePromptsConfig(prompts: PromptsConfig): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/config/prompts', prompts)
    return response.data
  }

  async migrateFromTxtConfigs(): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/config/migrate-from-txt')
    return response.data
  }

  async getConfigBackups(): Promise<ApiResponse> {
    const response = await this.client.get<ApiResponse>('/config/backup-list')
    return response.data
  }

  async testApiConnection(apiData: ApiTestRequest): Promise<ApiTestResponse> {
    const response = await this.client.post<ApiTestResponse>('/config/test-api', apiData)
    return response.data
  }

  // ==================== TASK MANAGEMENT ====================

  async getActiveTasks(): Promise<Record<string, Task>> {
    const response = await this.client.get('/tasks', {
      params: { status: 'running', limit: 100 }
    })
    
    // Convert array response to record for compatibility
    const tasks: Record<string, Task> = {}
    if (response.data.tasks) {
      response.data.tasks.forEach((task: Task) => {
        tasks[task.id] = task
      })
    }
    return tasks
  }

  async getTaskHistory(limit = 20): Promise<Record<string, Task>> {
    const response = await this.client.get('/tasks', {
      params: { limit }
    })
    
    // Convert array response to record for compatibility
    const tasks: Record<string, Task> = {}
    if (response.data.tasks) {
      response.data.tasks.forEach((task: Task) => {
        tasks[task.id] = task
      })
    }
    return tasks
  }

  async getTaskStats(): Promise<TaskStats> {
    const response = await this.client.get('/stats')
    return response.data
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await this.client.get(`/status/${taskId}`)
    return response.data
  }

  async cancelTask(taskId: string): Promise<ApiResponse> {
    const response = await this.client.delete(`/tasks/${taskId}`)
    return {
      success: true,
      message: response.data.message || 'Task cancelled successfully'
    }
  }

  async clearTaskHistory(): Promise<ApiResponse> {
    // This endpoint may not exist in the current backend
    // Return a mock response for now
    return {
      success: true,
      message: 'Task history cleared (not implemented in backend)'
    }
  }

  // ==================== BACKGROUND TASK PROCESSING ====================

  async createBackgroundTask(taskData: BackgroundTaskRequest): Promise<ApiResponse<{ task_id: string }>> {
    const response = await this.client.post<ApiResponse<{ task_id: string }>>('/tasks/create', taskData)
    return response.data
  }

  async getBackgroundTaskStatus(taskId: string): Promise<ApiResponse<Task>> {
    const response = await this.client.get<ApiResponse<Task>>(`/tasks/background/${taskId}`)
    return response.data
  }

  async cancelBackgroundTask(taskId: string): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>(`/tasks/background/${taskId}/cancel`)
    return response.data
  }

  async getActiveBackgroundTasks(): Promise<ApiResponse<Record<string, Task>>> {
    const response = await this.client.get<ApiResponse<Record<string, Task>>>('/tasks/background/active')
    return response.data
  }

  async getBackgroundTaskHistory(limit = 20): Promise<ApiResponse<Task[]>> {
    const response = await this.client.get<ApiResponse<Task[]>>('/tasks/background/history', {
      params: { limit },
    })
    return response.data
  }

  async getBackgroundTaskStats(): Promise<ApiResponse<TaskStats>> {
    const response = await this.client.get<ApiResponse<TaskStats>>('/tasks/background/stats')
    return response.data
  }

  async clearBackgroundTaskHistory(): Promise<ApiResponse> {
    const response = await this.client.delete<ApiResponse>('/tasks/background/history')
    return response.data
  }

  // ==================== FILE PROCESSING WORKFLOWS ====================

  async startTranscription(data: TranscriptionTaskRequest): Promise<ApiResponse<{ task_id: string }>> {
    const response = await this.client.post<ApiResponse<{ task_id: string }>>('/process/transcribe', data)
    return response.data
  }

  async startTranslation(data: TranslationTaskRequest): Promise<ApiResponse<{ task_id: string }>> {
    const response = await this.client.post<ApiResponse<{ task_id: string }>>('/process/translate', data)
    return response.data
  }

  async startWorkflow(data: WorkflowTaskRequest): Promise<ApiResponse<{ task_id: string }>> {
    const response = await this.client.post<ApiResponse<{ task_id: string }>>('/process/workflow', data)
    return response.data
  }

  async saveConfiguration(configData: Record<string, unknown>): Promise<ApiResponse<{ task_id: string }>> {
    const response = await this.client.post<ApiResponse<{ task_id: string }>>('/process/save-config', configData)
    return response.data
  }

  // ==================== FILE HANDLING ====================

  async uploadFiles(files: File[]): Promise<FileUploadResponse> {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })

    const response = await this.client.post<FileUploadResponse>('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  // ==================== LOG MONITORING ====================

  async getLogMonitoringStatus(): Promise<ApiResponse<LogMonitoringStatus>> {
    const response = await this.client.get<ApiResponse<LogMonitoringStatus>>('/logs/status')
    return response.data
  }

  async addLogFile(filePath: string, logType = 'general'): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/logs/add-file', {
      file_path: filePath,
      log_type: logType,
    })
    return response.data
  }

  async removeLogFile(filePath: string): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/logs/remove-file', {
      file_path: filePath,
    })
    return response.data
  }

  async getRecentLogs(filePath = 'log.txt', lines = 50): Promise<ApiResponse<LogEntry[]>> {
    const response = await this.client.get<ApiResponse<LogEntry[]>>('/logs/recent', {
      params: { file_path: filePath, lines },
    })
    return response.data
  }

  // ==================== LLAMA SERVER CONTROL ====================

  async getLlamaServerStatus(): Promise<{ running: boolean; status: string; message: string }> {
    const response = await this.client.get<{ running: boolean; status: string; message: string }>('/llama/status')
    return response.data
  }

  async startLlamaServer(config: Record<string, unknown>): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/llama/start', config)
    return response.data
  }

  async stopLlamaServer(): Promise<ApiResponse> {
    const response = await this.client.post<ApiResponse>('/llama/stop')
    return response.data
  }

  // ==================== UTILITY METHODS ====================

  updateBaseURL(newBaseURL: string): void {
    this.client.defaults.baseURL = newBaseURL
  }

  setAuthToken(token: string): void {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  removeAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization']
  }

  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout
  }
}

// Create and export a default instance
export const apiService = new ApiService()
export default apiService