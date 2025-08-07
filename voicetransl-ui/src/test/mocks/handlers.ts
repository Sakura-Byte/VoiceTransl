import { http, HttpResponse } from 'msw'
import type { 
  ServerStatus, 
  Task, 
  TranscriptionResponse, 
  TranslationResponse,
  VoiceTranslConfig 
} from '@/types'

// Mock data
const mockServerStatus: ServerStatus = {
  status: 'running',
  healthy: true,
  url: 'http://localhost:8080',
  port: 8080,
  response_time_ms: 45,
  message: 'Server is running normally',
  server_info: {
    host: 'localhost',
    port: 8080,
    url: 'http://localhost:8080',
    status: 'running',
    max_concurrent_tasks: 4,
    request_timeout: 300,
  }
}

const mockActiveTasks: Record<string, Task> = {
  'task-1': {
    id: 'task-1',
    type: 'transcription',
    status: 'running',
    progress: 45,
    message: 'Transcribing audio...',
    created_at: '2024-01-01T12:00:00Z',
    updated_at: '2024-01-01T12:05:00Z',
    result: null,
  },
  'task-2': {
    id: 'task-2',
    type: 'translation',
    status: 'completed',
    progress: 100,
    message: 'Translation completed',
    created_at: '2024-01-01T11:30:00Z',
    updated_at: '2024-01-01T11:45:00Z',
    result: {
      output_path: '/path/to/output.srt',
      format: 'srt',
      duration: 300,
      segments: 25,
    },
  }
}

const mockConfig: VoiceTranslConfig = {
  transcription: {
    language: 'auto',
    suppress_repetitions: true,
    alignment_backend: 'qwen3',
    api_key: '',
    api_endpoint: '',
    model_name: 'whisper-large-v3',
  },
  translation: {
    translator: 'openai',
    language: 'en',
    gpt_token: '',
    gpt_address: '',
    gpt_model: 'gpt-4',
  },
  server: {
    host: 'localhost',
    port: 8080,
    max_concurrent_tasks: 4,
    request_timeout: 300,
  }
}

// API handlers
export const handlers = [
  // Server status endpoints
  http.get('/api/server/status', () => {
    return HttpResponse.json(mockServerStatus)
  }),

  http.post('/api/server/start', () => {
    return HttpResponse.json({ message: 'Server start command sent', success: true })
  }),

  http.post('/api/server/stop', () => {
    return HttpResponse.json({ message: 'Server stop command sent', success: true })
  }),

  http.post('/api/server/restart', () => {
    return HttpResponse.json({ message: 'Server restart command sent', success: true })
  }),

  // Task management endpoints
  http.get('/api/tasks/active', () => {
    return HttpResponse.json(mockActiveTasks)
  }),

  http.get('/api/tasks/:taskId', ({ params }) => {
    const { taskId } = params
    const task = mockActiveTasks[taskId as string]
    
    if (!task) {
      return new HttpResponse(null, { status: 404 })
    }
    
    return HttpResponse.json(task)
  }),

  http.delete('/api/tasks/:taskId', ({ params }) => {
    const { taskId } = params
    delete mockActiveTasks[taskId as string]
    return HttpResponse.json({ message: 'Task cancelled', success: true })
  }),

  // Transcription endpoints
  http.post('/api/transcribe', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new HttpResponse(null, { status: 400 })
    }

    const mockResponse: TranscriptionResponse = {
      success: true,
      message: 'Transcription task queued',
      data: {
        task_id: 'transcribe-' + Date.now(),
        output_file: file.name.replace(/\.[^/.]+$/, '_transcribed.srt'),
        format: 'srt'
      }
    }

    return HttpResponse.json(mockResponse)
  }),

  // Translation endpoints
  http.post('/api/translate', async ({ request }) => {
    const body = await request.json() as any
    
    if (!body?.text && !body?.file_path) {
      return new HttpResponse(null, { status: 400 })
    }

    const mockResponse: TranslationResponse = {
      success: true,
      message: 'Translation task queued',
      data: {
        task_id: 'translate-' + Date.now(),
        output_file: body?.file_path?.replace(/\.[^/.]+$/, '_translated.srt') || 'translated.srt',
        format: 'srt'
      }
    }

    return HttpResponse.json(mockResponse)
  }),

  // Configuration endpoints
  http.get('/api/config', () => {
    return HttpResponse.json(mockConfig)
  }),

  http.put('/api/config', async ({ request }) => {
    const updates = await request.json()
    Object.assign(mockConfig, updates)
    return HttpResponse.json({ message: 'Configuration updated', success: true })
  }),

  http.get('/api/config/transcription', () => {
    return HttpResponse.json(mockConfig.transcription)
  }),

  http.put('/api/config/transcription', async ({ request }) => {
    const updates = await request.json()
    Object.assign(mockConfig.transcription, updates)
    return HttpResponse.json({ message: 'Transcription config updated', success: true })
  }),

  http.get('/api/config/translation', () => {
    return HttpResponse.json(mockConfig.translation)
  }),

  http.put('/api/config/translation', async ({ request }) => {
    const updates = await request.json()
    Object.assign(mockConfig.translation, updates)
    return HttpResponse.json({ message: 'Translation config updated', success: true })
  }),

  http.get('/api/config/server', () => {
    return HttpResponse.json(mockConfig.server)
  }),

  http.put('/api/config/server', async ({ request }) => {
    const updates = await request.json()
    if (mockConfig.server) {
      Object.assign(mockConfig.server, updates)
    }
    return HttpResponse.json({ message: 'Server config updated', success: true })
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  }),

  // Error simulation endpoints (for testing error handling)
  http.get('/api/test/error-500', () => {
    return new HttpResponse(null, { status: 500 })
  }),

  http.get('/api/test/error-404', () => {
    return new HttpResponse(null, { status: 404 })
  }),

  http.get('/api/test/network-error', () => {
    return HttpResponse.error()
  }),

  // File validation endpoint
  http.post('/api/validate/file', async ({ request }) => {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new HttpResponse(JSON.stringify({ 
        valid: false, 
        error: 'No file provided' 
      }), { status: 400 })
    }

    // Mock validation based on file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'video/mp4', 'video/avi']
    const isValid = validTypes.includes(file.type)

    return HttpResponse.json({
      valid: isValid,
      file_info: {
        name: file.name,
        size: file.size,
        type: file.type,
        duration: isValid ? 300 : null,
      },
      error: isValid ? null : 'Unsupported file type'
    })
  }),
]