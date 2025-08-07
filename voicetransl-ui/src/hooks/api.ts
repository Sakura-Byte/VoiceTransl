// Custom hooks for React Query integration with API service
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { apiService } from '@/services/api'
import { queryKeys, queryUtils } from '@/lib/react-query'
import { useAppStore } from '@/stores/appStore'
import type {
  ServerConfig,
  VoiceTranslConfig,
  TranscriptionConfig,
  TranslationConfig,
  LlamaServerConfig,
  DictionariesConfig,
  PromptsConfig,
  ApiTestRequest,
} from '@/types/api'

// ==================== SERVER HOOKS ====================

export function useServerStatus() {
  const setServerStatus = useAppStore((state) => state.setServerStatus)
  
  const query = useQuery({
    queryKey: queryKeys.server.status(),
    queryFn: async () => {
      const response = await apiService.getServerStatus()
      return response
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  // Update store when data changes
  useEffect(() => {
    if (query.data) {
      setServerStatus(query.data)
    }
  }, [query.data, setServerStatus])

  return query
}

export function useServerControl() {
  const startMutation = useMutation({
    mutationFn: (config?: Partial<ServerConfig>) => apiService.startServer(config),
    onSuccess: () => {
      toast.success('Server started successfully')
      queryUtils.invalidateServer()
    },
  })
  
  const stopMutation = useMutation({
    mutationFn: (force?: boolean) => apiService.stopServer(force),
    onSuccess: () => {
      toast.success('Server stopped successfully')
      queryUtils.invalidateServer()
    },
  })
  
  const restartMutation = useMutation({
    mutationFn: () => apiService.restartServer(),
    onSuccess: () => {
      toast.success('Server restarted successfully')
      queryUtils.invalidateServer()
    },
  })
  
  return {
    startServer: startMutation.mutate,
    stopServer: stopMutation.mutate,
    restartServer: restartMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isRestarting: restartMutation.isPending,
  }
}

export function useServerHealth() {
  return useQuery({
    queryKey: queryKeys.server.health(),
    queryFn: () => apiService.checkServerHealth(),
    refetchInterval: 30000, // Check every 30 seconds
  })
}

export function useServerLogs(lines = 50) {
  return useQuery({
    queryKey: queryKeys.server.logs(lines),
    queryFn: () => apiService.getServerLogs(lines),
    refetchInterval: 5000, // Refresh every 5 seconds
  })
}

// ==================== CONFIGURATION HOOKS ====================

export function useFullConfig() {
  return useQuery({
    queryKey: queryKeys.config.full(),
    queryFn: () => apiService.getFullConfig(),
  })
}

export function useConfigMutation() {
  return useMutation({
    mutationFn: (config: VoiceTranslConfig) => apiService.saveFullConfig(config as any),
    onSuccess: () => {
      toast.success('Configuration saved successfully')
      queryUtils.invalidateConfig()
    },
  })
}

export function useTranscriptionConfig() {
  return useQuery({
    queryKey: queryKeys.config.transcription(),
    queryFn: () => apiService.getTranscriptionConfig(),
  })
}

export function useTranscriptionConfigMutation() {
  return useMutation({
    mutationFn: (config: TranscriptionConfig) => apiService.saveTranscriptionConfig(config),
    onSuccess: () => {
      toast.success('Transcription configuration saved')
      queryUtils.invalidateConfig()
    },
  })
}

export function useTranslationConfig() {
  return useQuery({
    queryKey: queryKeys.config.translation(),
    queryFn: () => apiService.getTranslationConfig(),
  })
}

export function useTranslationConfigMutation() {
  return useMutation({
    mutationFn: (config: TranslationConfig) => apiService.saveTranslationConfig(config),
    onSuccess: () => {
      toast.success('Translation configuration saved')
      queryUtils.invalidateConfig()
    },
  })
}

export function useLlamaConfig() {
  return useQuery({
    queryKey: queryKeys.config.llama(),
    queryFn: () => apiService.getLlamaConfig(),
  })
}

export function useLlamaConfigMutation() {
  return useMutation({
    mutationFn: (config: LlamaServerConfig) => apiService.saveLlamaConfig(config),
    onSuccess: () => {
      toast.success('LLaMA configuration saved')
      queryUtils.invalidateConfig()
    },
  })
}

export function useAvailableModels() {
  return useQuery({
    queryKey: queryKeys.config.models(),
    queryFn: () => apiService.getAvailableModels(),
    staleTime: 5 * 60 * 1000, // Models don't change often
  })
}

export function useDictionaries() {
  return useQuery({
    queryKey: queryKeys.config.dictionaries(),
    queryFn: () => apiService.getAllDictionaries(),
  })
}

export function useDictionariesMutation() {
  return useMutation({
    mutationFn: (dictionaries: DictionariesConfig) => apiService.saveAllDictionaries(dictionaries as any),
    onSuccess: () => {
      toast.success('Dictionaries saved successfully')
      queryUtils.invalidateConfig()
    },
  })
}

export function usePromptsConfig() {
  return useQuery({
    queryKey: queryKeys.config.prompts(),
    queryFn: () => apiService.getPromptsConfig(),
  })
}

export function usePromptsConfigMutation() {
  return useMutation({
    mutationFn: (prompts: PromptsConfig) => apiService.savePromptsConfig(prompts),
    onSuccess: () => {
      toast.success('Prompts configuration saved')
      queryUtils.invalidateConfig()
    },
  })
}

export function useConfigBackups() {
  return useQuery({
    queryKey: queryKeys.config.backups(),
    queryFn: () => apiService.getConfigBackups(),
  })
}

export function useApiConnectionTest() {
  return useMutation({
    mutationFn: (testData: ApiTestRequest) => apiService.testApiConnection(testData),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('API connection test passed')
      } else {
        toast.error('API connection test failed', {
          description: result.message,
        })
      }
    },
  })
}

// ==================== TASK HOOKS ====================

export function useActiveTasks() {
  const setActiveTasks = useAppStore((state) => state.setActiveTasks)
  
  const query = useQuery({
    queryKey: queryKeys.tasks.active(),
    queryFn: async () => {
      const response = await apiService.getActiveTasks()
      return response.data || {}
    },
    refetchInterval: 2000, // Refresh every 2 seconds for active tasks
  })

  // Update store when data changes
  useEffect(() => {
    if (query.data) {
      setActiveTasks(query.data as any)
    }
  }, [query.data, setActiveTasks])

  return query
}

export function useTaskHistory(limit = 20) {
  return useQuery({
    queryKey: queryKeys.tasks.history(limit),
    queryFn: () => apiService.getTaskHistory(limit),
  })
}

export function useTaskStats() {
  return useQuery({
    queryKey: queryKeys.tasks.stats(),
    queryFn: () => apiService.getTaskStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => apiService.getTask(taskId),
    enabled: !!taskId,
    refetchInterval: (query) => {
      // Stop polling if task is completed, failed, or cancelled
      const task = query.state.data
      if (task && ['completed', 'failed', 'cancelled'].includes(task.status)) {
        return false
      }
      return 3000 // Poll every 3 seconds for active tasks
    },
  })
}

export function useTaskMutations() {
  const cancelTask = useMutation({
    mutationFn: (taskId: string) => apiService.cancelTask(taskId),
    onSuccess: () => {
      toast.success('Task cancelled')
      queryUtils.invalidateTasks()
    },
  })
  
  const clearHistory = useMutation({
    mutationFn: () => apiService.clearTaskHistory(),
    onSuccess: () => {
      toast.success('Task history cleared')
      queryUtils.invalidateTasks()
    },
  })
  
  return {
    cancelTask: cancelTask.mutate,
    clearHistory: clearHistory.mutate,
    isCancelling: cancelTask.isPending,
    isClearing: clearHistory.isPending,
  }
}

// ==================== FILE PROCESSING HOOKS ====================

export function useTranscriptionTask() {
  return useMutation({
    mutationFn: (data: { input_file: string; language: string; suppress_repetitions?: boolean; alignment_backend?: string; api_key?: string; api_endpoint?: string; model_name?: string }) => 
      apiService.startTranscription({...data, suppress_repetitions: data.suppress_repetitions ?? false} as any),
    onSuccess: (result) => {
      toast.success('Transcription task started', {
        description: `Task ID: ${result.data?.task_id}`,
      })
      queryUtils.invalidateTasks()
    },
  })
}

export function useTranslationTask() {
  return useMutation({
    mutationFn: (data: { input_file: string; language: string; translator?: string; gpt_token?: string; gpt_address?: string; gpt_model?: string }) => 
      apiService.startTranslation(data),
    onSuccess: (result) => {
      toast.success('Translation task started', {
        description: `Task ID: ${result.data?.task_id}`,
      })
      queryUtils.invalidateTasks()
    },
  })
}

export function useWorkflowTask() {
  return useMutation({
    mutationFn: (data: { input_files: string; language: string; translator?: string; output_format?: string; api_key?: string; api_endpoint?: string; model_name?: string }) => 
      apiService.startWorkflow({...data, output_format: data.output_format ?? 'srt'} as any),
    onSuccess: (result) => {
      toast.success('Workflow started', {
        description: `Task ID: ${result.data?.task_id}`,
      })
      queryUtils.invalidateTasks()
    },
  })
}

export function useFileUpload() {
  return useMutation({
    mutationFn: (files: File[]) => apiService.uploadFiles(files),
    onSuccess: (result) => {
      toast.success('Files uploaded successfully', {
        description: `${result.file_paths.length} files uploaded`,
      })
    },
  })
}

// ==================== LOG HOOKS ====================

export function useLogMonitoringStatus() {
  return useQuery({
    queryKey: queryKeys.logs.status(),
    queryFn: () => apiService.getLogMonitoringStatus(),
    refetchInterval: 30000,
  })
}

export function useRecentLogs(filePath = 'log.txt', lines = 50) {
  return useQuery({
    queryKey: queryKeys.logs.recent(filePath, lines),
    queryFn: () => apiService.getRecentLogs(filePath, lines),
    refetchInterval: 5000, // Refresh every 5 seconds
  })
}

export function useLogMutations() {
  return {
    addLogFile: useMutation({
      mutationFn: ({ filePath, logType }: { filePath: string; logType?: string }) =>
        apiService.addLogFile(filePath, logType),
      onSuccess: () => {
        toast.success('Log file added to monitoring')
        queryUtils.invalidateLogs()
      },
    }),
    
    removeLogFile: useMutation({
      mutationFn: (filePath: string) => apiService.removeLogFile(filePath),
      onSuccess: () => {
        toast.success('Log file removed from monitoring')
        queryUtils.invalidateLogs()
      },
    }),
  }
}

// ==================== LLAMA SERVER HOOKS ====================

export function useLlamaServerStatus() {
  return useQuery({
    queryKey: queryKeys.llama.status(),
    queryFn: () => apiService.getLlamaServerStatus(),
    refetchInterval: 30000,
  })
}

export function useLlamaServerControl() {
  const startServer = useMutation({
    mutationFn: (config: Record<string, unknown>) => apiService.startLlamaServer(config),
    onSuccess: () => {
      toast.success('LLaMA server started')
      queryUtils.invalidateLogs()
    },
  })
  
  const stopServer = useMutation({
    mutationFn: () => apiService.stopLlamaServer(),
    onSuccess: () => {
      toast.success('LLaMA server stopped')
      queryUtils.invalidateLogs()
    },
  })
  
  return {
    startServer: startServer.mutate,
    stopServer: stopServer.mutate,
    isStarting: startServer.isPending,
    isStopping: stopServer.isPending,
  }
}