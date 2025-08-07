import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { toast } from 'sonner'
import { ApiError } from '@/services/api'

// Performance-optimized React Query Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Enhanced caching for performance
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - extended garbage collection for better caching
      
      // Smart retry strategy
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408, 429
        if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500) {
          if (error.status === 408 || error.status === 429) {
            return failureCount < 2
          }
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Performance optimizations
      refetchOnWindowFocus: false, // Prevent unnecessary refetching
      refetchOnReconnect: 'always', // Always refetch when network reconnects
      refetchOnMount: true, // Refetch on component mount if data is stale
      
      // Network-aware behavior
      networkMode: 'online', // Only run queries when online
    },
    mutations: {
      // Mutation defaults
      retry: false,
      networkMode: 'online',
      
      onError: (error) => {
        // Enhanced error handling with performance consideration
        const message = error instanceof ApiError ? error.message : 'An unexpected error occurred'
        toast.error('Operation Failed', {
          description: message,
          action: {
            label: 'Dismiss',
            onClick: () => {},
          },
        })
      },
    },
  },
})

// Performance monitoring for React Query (development only)
if (process.env.NODE_ENV === 'development') {
  // Monitor query cache events
  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === 'added') {
      console.log('🔄 Query added:', event.query.queryKey)
    }
    if (event.type === 'updated') {
      const { query } = event
      if (query.state.status === 'pending') {
        console.log('📡 Query fetching:', query.queryKey)
      }
    }
  })

  // Monitor mutation cache events
  queryClient.getMutationCache().subscribe((event) => {
    if (event.type === 'added') {
      console.log('🔥 Mutation started:', event.mutation.options.mutationKey)
    }
    if (event.type === 'updated') {
      const { mutation } = event
      if (mutation.state.status === 'success') {
        console.log('✅ Mutation succeeded:', mutation.options.mutationKey)
      } else if (mutation.state.status === 'error') {
        console.log('❌ Mutation failed:', mutation.options.mutationKey, mutation.state.error)
      }
    }
  })
}

// React Query Provider Component
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-right"
          position="bottom"
        />
      )}
    </QueryClientProvider>
  )
}

// Export the query client for direct access
export { queryClient }

// Query Key Factory - centralized query key management
export const queryKeys = {
  // Server queries
  server: {
    all: ['server'] as const,
    status: () => [...queryKeys.server.all, 'status'] as const,
    health: () => [...queryKeys.server.all, 'health'] as const,
    info: () => [...queryKeys.server.all, 'info'] as const,
    logs: (lines?: number) => [...queryKeys.server.all, 'logs', { lines }] as const,
    config: () => [...queryKeys.server.all, 'config'] as const,
  },

  // Configuration queries
  config: {
    all: ['config'] as const,
    full: () => [...queryKeys.config.all, 'full'] as const,
    transcription: () => [...queryKeys.config.all, 'transcription'] as const,
    translation: () => [...queryKeys.config.all, 'translation'] as const,
    llama: () => [...queryKeys.config.all, 'llama'] as const,
    dictionaries: () => [...queryKeys.config.all, 'dictionaries'] as const,
    prompts: () => [...queryKeys.config.all, 'prompts'] as const,
    backups: () => [...queryKeys.config.all, 'backups'] as const,
    models: () => [...queryKeys.config.all, 'models'] as const,
  },

  // Task queries
  tasks: {
    all: ['tasks'] as const,
    active: () => [...queryKeys.tasks.all, 'active'] as const,
    history: (limit?: number) => [...queryKeys.tasks.all, 'history', { limit }] as const,
    stats: () => [...queryKeys.tasks.all, 'stats'] as const,
    detail: (id: string) => [...queryKeys.tasks.all, 'detail', id] as const,
    background: {
      all: () => [...queryKeys.tasks.all, 'background'] as const,
      active: () => [...queryKeys.tasks.background.all(), 'active'] as const,
      history: (limit?: number) => [...queryKeys.tasks.background.all(), 'history', { limit }] as const,
      stats: () => [...queryKeys.tasks.background.all(), 'stats'] as const,
      detail: (id: string) => [...queryKeys.tasks.background.all(), 'detail', id] as const,
    },
  },

  // Log queries
  logs: {
    all: ['logs'] as const,
    status: () => [...queryKeys.logs.all, 'status'] as const,
    recent: (filePath?: string, lines?: number) => 
      [...queryKeys.logs.all, 'recent', { filePath, lines }] as const,
  },

  // LLaMA server queries
  llama: {
    all: ['llama'] as const,
    status: () => [...queryKeys.llama.all, 'status'] as const,
  },
} as const

// Utility functions for query management
export const queryUtils = {
  // Invalidate queries by pattern
  invalidateServer: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.server.all,
    })
  },

  invalidateConfig: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.config.all,
    })
  },

  invalidateTasks: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.tasks.all,
    })
  },

  invalidateLogs: () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.logs.all,
    })
  },

  // Prefetch commonly needed data
  prefetchServerStatus: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.server.status(),
      staleTime: 30 * 1000, // 30 seconds
    })
  },

  prefetchActiveTasks: () => {
    return queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.active(),
      staleTime: 10 * 1000, // 10 seconds
    })
  },

  // Set query data directly (for real-time updates)
  setServerStatus: (data: unknown) => {
    queryClient.setQueryData(queryKeys.server.status(), data)
  },

  setActiveTasks: (data: unknown) => {
    queryClient.setQueryData(queryKeys.tasks.active(), data)
  },

  updateTaskProgress: (taskId: string, progress: unknown) => {
    queryClient.setQueryData(queryKeys.tasks.detail(taskId), (oldData: any) => {
      if (!oldData || typeof oldData !== 'object') return progress
      if (!progress || typeof progress !== 'object') return oldData
      return {
        ...oldData,
        ...progress,
      }
    })
  },

  // Remove queries
  removeTaskQueries: (taskId: string) => {
    queryClient.removeQueries({
      queryKey: queryKeys.tasks.detail(taskId),
    })
  },

  // Cancel queries
  cancelServerQueries: () => {
    return queryClient.cancelQueries({
      queryKey: queryKeys.server.all,
    })
  },

  // Reset queries
  resetAllQueries: () => {
    return queryClient.resetQueries()
  },

  // Get cached data
  getServerStatus: () => {
    return queryClient.getQueryData(queryKeys.server.status())
  },

  getActiveTasks: () => {
    return queryClient.getQueryData(queryKeys.tasks.active())
  },
}

// Error boundary for React Query
export function QueryErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  )
}