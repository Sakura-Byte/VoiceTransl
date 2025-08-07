// Error handling components
export { ErrorBoundary, withErrorBoundary, useErrorHandler } from '../ErrorBoundary'

// Error handling utilities
export {
  handleError,
  withRetry,
  errorRecovery,
  classifyError,
  getErrorSeverity,
  DEFAULT_RETRY_CONFIG,
  ErrorSeverity,
  type AppError,
  type RetryConfig
} from '@/lib/error-handling'

// Error handling hooks
export {
  useErrorState,
  useMutationWithErrorHandling,
  useQueryWithErrorHandling,
  useAsyncOperation,
  useRetry,
  useGracefulDegradation,
  useErrorReporting
} from '@/hooks/useErrorHandling'