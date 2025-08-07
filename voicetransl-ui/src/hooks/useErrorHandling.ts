import { useCallback, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  handleError, 
  withRetry, 
  errorRecovery, 
  type AppError, 
  type RetryConfig 
} from '@/lib/error-handling'

// Global error state hook
export function useErrorState() {
  const [errors, setErrors] = useState<AppError[]>([])
  const [isRetrying, setIsRetrying] = useState(false)

  const addError = useCallback((error: AppError) => {
    setErrors(prev => [...prev, error])
  }, [])

  const removeError = useCallback((timestamp: Date) => {
    setErrors(prev => prev.filter(e => e.timestamp !== timestamp))
  }, [])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  const handleErrorWithState = useCallback((error: any, context?: string) => {
    const appError = handleError(error, context)
    addError(appError)
    return appError
  }, [addError])

  return {
    errors,
    isRetrying,
    setIsRetrying,
    addError,
    removeError,
    clearErrors,
    handleError: handleErrorWithState,
  }
}

// Enhanced mutation hook with error handling and retry
export function useMutationWithErrorHandling<TData, TVariables, TContext = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables, context: TContext) => void
    onError?: (error: any, variables: TVariables, context: TContext | undefined) => void
    retryConfig?: Partial<RetryConfig>
    errorContext?: string
    showSuccessToast?: boolean
    successMessage?: string
  }
) {
  const { handleError: handleErrorWithState } = useErrorState()

  return useMutation({
    mutationFn: async (variables: TVariables) => {
      if (options?.retryConfig) {
        return withRetry(() => mutationFn(variables), options.retryConfig)
      }
      return mutationFn(variables)
    },
    onSuccess: (data, variables, context) => {
      if (options?.showSuccessToast) {
        toast.success(options.successMessage || 'Operation completed successfully')
      }
      options?.onSuccess?.(data, variables, context as TContext)
    },
    onError: (error, variables, context) => {
      handleErrorWithState(error, options?.errorContext)
      options?.onError?.(error, variables, context as TContext | undefined)
    },
  })
}

// Enhanced query hook with error handling
export function useQueryWithErrorHandling<TData>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: {
    enabled?: boolean
    staleTime?: number
    cacheTime?: number
    refetchOnWindowFocus?: boolean
    retryConfig?: Partial<RetryConfig>
    errorContext?: string
    fallbackData?: TData
  }
) {
  const { handleError: handleErrorWithState } = useErrorState()

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (options?.retryConfig) {
        return withRetry(queryFn, options.retryConfig)
      }
      return queryFn()
    },
    enabled: options?.enabled,
    staleTime: options?.staleTime,
    gcTime: options?.cacheTime,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
    retry: (failureCount, error) => {
      // Custom retry logic based on error type
      const appError = handleErrorWithState(error, options?.errorContext)
      
      // Don't retry client errors (4xx) except 429 (rate limit)
      if (appError.statusCode && appError.statusCode >= 400 && appError.statusCode < 500 && appError.statusCode !== 429) {
        return false
      }
      
      // Retry up to 3 times for server errors and network errors
      return failureCount < 3
    },
    // Use fallback data on error if provided
    select: (data) => data || options?.fallbackData,
  })
}

// Hook for handling async operations with loading states and error handling
export function useAsyncOperation<T = any>() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AppError | null>(null)
  const [data, setData] = useState<T | null>(null)

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options?: {
      retryConfig?: Partial<RetryConfig>
      errorContext?: string
      onSuccess?: (data: T) => void
      onError?: (error: AppError) => void
      showSuccessToast?: boolean
      successMessage?: string
    }
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      let result: T
      
      if (options?.retryConfig) {
        result = await withRetry(operation, options.retryConfig)
      } else {
        result = await operation()
      }

      setData(result)
      
      if (options?.showSuccessToast) {
        toast.success(options.successMessage || 'Operation completed successfully')
      }
      
      options?.onSuccess?.(result)
      return result
    } catch (err) {
      const appError = handleError(err, options?.errorContext)
      setError(appError)
      options?.onError?.(appError)
      throw appError
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(null)
  }, [])

  return {
    execute,
    reset,
    isLoading,
    error,
    data,
  }
}

// Hook for retry functionality
export function useRetry() {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const retry = useCallback(async <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> => {
    setIsRetrying(true)
    setRetryCount(prev => prev + 1)

    try {
      const result = await withRetry(operation, config)
      toast.success('Operation completed successfully after retry')
      return result
    } catch (error) {
      handleError(error, 'retry')
      throw error
    } finally {
      setIsRetrying(false)
    }
  }, [])

  const retryWithConfirmation = useCallback(async <T>(
    operation: () => Promise<T>,
    message: string,
    context?: string
  ): Promise<T> => {
    setIsRetrying(true)
    try {
      return await errorRecovery.retryWithConfirmation(operation, message, context)
    } finally {
      setIsRetrying(false)
    }
  }, [])

  const reset = useCallback(() => {
    setIsRetrying(false)
    setRetryCount(0)
  }, [])

  return {
    retry,
    retryWithConfirmation,
    reset,
    isRetrying,
    retryCount,
  }
}

// Hook for graceful degradation
export function useGracefulDegradation<T>() {
  const [isFallbackMode, setIsFallbackMode] = useState(false)

  const executeWithFallback = useCallback(async (
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context?: string
  ): Promise<T> => {
    try {
      const result = await primaryOperation()
      setIsFallbackMode(false)
      return result
    } catch (error) {
      console.warn('Primary operation failed, switching to fallback:', error)
      setIsFallbackMode(true)
      
      try {
        return await fallbackOperation()
      } catch (fallbackError) {
        handleError(fallbackError, context)
        throw fallbackError
      }
    }
  }, [])

  return {
    executeWithFallback,
    isFallbackMode,
    setIsFallbackMode,
  }
}

// Hook for error reporting
export function useErrorReporting() {
  const reportError = useCallback((error: AppError, additionalContext?: any) => {
    console.error('Reporting error:', error, additionalContext)
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      // errorTrackingService.captureException(error, { extra: additionalContext })
    }
    
    toast.info('Error reported. Thank you for helping us improve!')
  }, [])

  return { reportError }
}