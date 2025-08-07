import { toast } from 'sonner'
import { AxiosError } from 'axios'

// Error types
export interface AppError {
  message: string
  code?: string
  statusCode?: number
  details?: any
  timestamp: Date
  context?: string
}

export interface RetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier?: number
  maxDelayMs?: number
  retryCondition?: (error: any) => boolean
}

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity]

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryCondition: (error) => {
    // Retry on network errors and 5xx server errors
    if (error?.code === 'NETWORK_ERROR') return true
    if (error?.response?.status >= 500) return true
    return false
  }
}

// Error classification
export function classifyError(error: any): AppError {
  const timestamp = new Date()

  // Network/connection errors
  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return {
      message: 'Network connection error. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      timestamp,
      context: 'network'
    }
  }

  // Axios HTTP errors
  if (error?.isAxiosError || error instanceof AxiosError) {
    const status = error.response?.status
    const data = error.response?.data

    switch (status) {
      case 400:
        return {
          message: data?.message || 'Invalid request. Please check your input.',
          code: 'BAD_REQUEST',
          statusCode: 400,
          details: data,
          timestamp,
          context: 'api'
        }
      case 401:
        return {
          message: 'Authentication failed. Please check your credentials.',
          code: 'UNAUTHORIZED',
          statusCode: 401,
          timestamp,
          context: 'auth'
        }
      case 403:
        return {
          message: 'Access denied. You don\'t have permission for this action.',
          code: 'FORBIDDEN',
          statusCode: 403,
          timestamp,
          context: 'auth'
        }
      case 404:
        return {
          message: 'Resource not found. The requested item may have been deleted.',
          code: 'NOT_FOUND',
          statusCode: 404,
          timestamp,
          context: 'api'
        }
      case 422:
        return {
          message: data?.message || 'Validation error. Please check your input.',
          code: 'VALIDATION_ERROR',
          statusCode: 422,
          details: data,
          timestamp,
          context: 'validation'
        }
      case 429:
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMITED',
          statusCode: 429,
          timestamp,
          context: 'api'
        }
      case 500:
        return {
          message: 'Server error. Please try again later.',
          code: 'SERVER_ERROR',
          statusCode: 500,
          timestamp,
          context: 'server'
        }
      case 503:
        return {
          message: 'Service temporarily unavailable. Please try again later.',
          code: 'SERVICE_UNAVAILABLE',
          statusCode: 503,
          timestamp,
          context: 'server'
        }
      default:
        return {
          message: data?.message || error.message || 'An unexpected error occurred.',
          code: 'HTTP_ERROR',
          statusCode: status,
          details: data,
          timestamp,
          context: 'api'
        }
    }
  }

  // Generic JavaScript errors
  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      timestamp,
      context: 'runtime'
    }
  }

  // Unknown error format
  return {
    message: typeof error === 'string' ? error : 'An unknown error occurred.',
    code: 'UNKNOWN_ERROR',
    timestamp,
    context: 'unknown'
  }
}

// Error severity assessment
export function getErrorSeverity(error: AppError): ErrorSeverity {
  // Critical errors
  if (error.code === 'NETWORK_ERROR' || error.statusCode === 500) {
    return ErrorSeverity.CRITICAL
  }

  // High severity errors
  if (error.statusCode === 401 || error.statusCode === 403 || error.statusCode === 404) {
    return ErrorSeverity.HIGH
  }

  // Medium severity errors
  if (error.statusCode === 400 || error.statusCode === 422 || error.statusCode === 429) {
    return ErrorSeverity.MEDIUM
  }

  // Default to low severity
  return ErrorSeverity.LOW
}

// Global error handler
export function handleError(error: any, context?: string): AppError {
  const appError = classifyError(error)
  if (context) appError.context = context

  const severity = getErrorSeverity(appError)

  // Log error to console (in development) or external service (in production)
  console.error('Global error handler:', {
    error: appError,
    severity,
    originalError: error
  })

  // Show appropriate toast notification
  const toastConfig = {
    description: appError.details?.detail || undefined,
    duration: severity === ErrorSeverity.CRITICAL ? 0 : 5000, // Critical errors don't auto-dismiss
  }

  switch (severity) {
    case ErrorSeverity.CRITICAL:
      toast.error(appError.message, {
        ...toastConfig,
        action: {
          label: 'Reload',
          onClick: () => window.location.reload(),
        },
      })
      break
    case ErrorSeverity.HIGH:
      toast.error(appError.message, toastConfig)
      break
    case ErrorSeverity.MEDIUM:
      toast.warning(appError.message, toastConfig)
      break
    case ErrorSeverity.LOW:
      toast.info(appError.message, toastConfig)
      break
  }

  return appError
}

// Retry mechanism with exponential backoff
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: any
  let delay = retryConfig.delayMs

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Don't retry if this is the last attempt
      if (attempt === retryConfig.maxAttempts) {
        break
      }

      // Check if we should retry this error
      if (retryConfig.retryCondition && !retryConfig.retryCondition(error)) {
        break
      }

      // Show retry notification
      toast.info(`Attempt ${attempt} failed, retrying in ${delay}ms...`, {
        duration: delay,
      })

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))

      // Exponential backoff
      if (retryConfig.backoffMultiplier) {
        delay = Math.min(
          delay * retryConfig.backoffMultiplier,
          retryConfig.maxDelayMs || Infinity
        )
      }
    }
  }

  // All attempts failed, throw the last error
  throw lastError
}

// Error recovery utilities
export const errorRecovery = {
  // Retry an API call with exponential backoff
  async retryApiCall<T>(apiCall: () => Promise<T>, context?: string): Promise<T> {
    try {
      return await withRetry(apiCall, {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2,
        retryCondition: (error) => {
          const appError = classifyError(error)
          return appError.context === 'network' || appError.statusCode === 500
        }
      })
    } catch (error) {
      handleError(error, context)
      throw error
    }
  },

  // Graceful degradation for non-critical features
  async gracefulFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await primaryOperation()
    } catch (error) {
      console.warn(`Primary operation failed, using fallback:`, error)
      try {
        return await fallbackOperation()
      } catch (fallbackError) {
        handleError(fallbackError, context)
        throw fallbackError
      }
    }
  },

  // Retry with user confirmation
  async retryWithConfirmation<T>(
    operation: () => Promise<T>,
    _errorMessage: string,
    context?: string
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      const appError = handleError(error, context)
      
      return new Promise((resolve, reject) => {
        toast.error(appError.message, {
          duration: 0,
          action: {
            label: 'Retry',
            onClick: async () => {
              try {
                const result = await operation()
                resolve(result)
                toast.success('Operation completed successfully')
              } catch (retryError) {
                handleError(retryError, context)
                reject(retryError)
              }
            },
          },
        })
        
        // Reject after timeout if user doesn't retry
        setTimeout(() => reject(appError), 30000)
      })
    }
  }
}

