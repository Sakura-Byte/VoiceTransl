import { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Create a query client with custom configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
      onError: (error: any) => {
        // Global error handling for mutations
        const message = error?.message || 'An unexpected error occurred'
        toast.error('Error', {
          description: message,
        })
      },
    },
  },
})

// Query key factory
export const queryKeys = {
  // Server status queries
  serverStatus: ['server', 'status'] as const,
  serverInfo: ['server', 'info'] as const,
  serverConfig: ['server', 'config'] as const,
  serverLogs: (lines: number) => ['server', 'logs', lines] as const,
  serverHealth: ['server', 'health'] as const,

  // Configuration queries
  config: {
    full: ['config', 'full'] as const,
    transcription: ['config', 'transcription'] as const,
    translation: ['config', 'translation'] as const,
    llama: ['config', 'llama'] as const,
    dictionaries: ['config', 'dictionaries'] as const,
    prompts: ['config', 'prompts'] as const,
    backups: ['config', 'backups'] as const,
    models: ['config', 'models'] as const,
  },

  // Task queries
  tasks: {
    active: ['tasks', 'active'] as const,
    history: (limit: number) => ['tasks', 'history', limit] as const,
    stats: ['tasks', 'stats'] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    background: {
      active: ['tasks', 'background', 'active'] as const,
      history: (limit: number) => ['tasks', 'background', 'history', limit] as const,
      stats: ['tasks', 'background', 'stats'] as const,
      detail: (id: string) => ['tasks', 'background', 'detail', id] as const,
    },
  },

  // Log queries
  logs: {
    status: ['logs', 'status'] as const,
    recent: (filePath: string, lines: number) => ['logs', 'recent', filePath, lines] as const,
  },

  // LLaMA server queries
  llama: {
    status: ['llama', 'status'] as const,
  },
} as const

// Invalidation helpers
export const invalidateQueries = {
  serverStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.serverStatus }),
  serverInfo: () => queryClient.invalidateQueries({ queryKey: queryKeys.serverInfo }),
  serverConfig: () => queryClient.invalidateQueries({ queryKey: queryKeys.serverConfig }),
  serverLogs: () => queryClient.invalidateQueries({ queryKey: ['server', 'logs'] }),

  allConfig: () => queryClient.invalidateQueries({ queryKey: ['config'] }),
  config: {
    full: () => queryClient.invalidateQueries({ queryKey: queryKeys.config.full }),
    transcription: () => queryClient.invalidateQueries({ queryKey: queryKeys.config.transcription }),
    translation: () => queryClient.invalidateQueries({ queryKey: queryKeys.config.translation }),
    llama: () => queryClient.invalidateQueries({ queryKey: queryKeys.config.llama }),
    dictionaries: () => queryClient.invalidateQueries({ queryKey: queryKeys.config.dictionaries }),
    prompts: () => queryClient.invalidateQueries({ queryKey: queryKeys.config.prompts }),
  },

  allTasks: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  tasks: {
    active: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.active }),
    history: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'history'] }),
    stats: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.stats }),
    background: {
      active: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.background.active }),
      history: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'background', 'history'] }),
      stats: () => queryClient.invalidateQueries({ queryKey: queryKeys.tasks.background.stats }),
    },
  },

  allLogs: () => queryClient.invalidateQueries({ queryKey: ['logs'] }),
  logs: {
    status: () => queryClient.invalidateQueries({ queryKey: queryKeys.logs.status }),
    recent: () => queryClient.invalidateQueries({ queryKey: ['logs', 'recent'] }),
  },

  llamaStatus: () => queryClient.invalidateQueries({ queryKey: queryKeys.llama.status }),
}

// Prefetch helpers
export const prefetchQueries = {
  serverStatus: () =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.serverStatus,
      staleTime: 1000 * 30, // 30 seconds
    }),

  activeTasks: () =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.active,
      staleTime: 1000 * 10, // 10 seconds
    }),

  taskStats: () =>
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.stats,
      staleTime: 1000 * 30, // 30 seconds
    }),
}

export default queryClient