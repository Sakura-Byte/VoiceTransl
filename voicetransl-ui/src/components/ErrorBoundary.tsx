import React, { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  showDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })

    // Call custom error handler
    this.props.onError?.(error, errorInfo)

    // Show toast notification
    toast.error('An unexpected error occurred', {
      description: 'The application encountered an error. Please try refreshing the page.',
      action: {
        label: 'Reload',
        onClick: () => window.location.reload(),
      },
    })
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleReportBug = () => {
    const errorText = this.state.error?.stack || this.state.error?.message || 'Unknown error'
    const subject = encodeURIComponent('VoiceTransl Error Report')
    const body = encodeURIComponent(`
Error Details:
${errorText}

Component Stack:
${this.state.errorInfo?.componentStack || 'Not available'}

Please describe what you were doing when this error occurred:
[Please describe your actions here]
    `)
    
    window.open(`mailto:support@voicetransl.com?subject=${subject}&body=${body}`)
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  The application encountered an unexpected error. This might be a temporary issue.
                </AlertDescription>
              </Alert>

              {this.props.showDetails && this.state.error && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Error Details:</h4>
                  <div className="bg-gray-100 p-3 rounded-md text-xs font-mono text-gray-800 overflow-auto max-h-32">
                    {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                        Stack trace
                      </summary>
                      <pre className="bg-gray-100 p-2 rounded mt-2 text-xs overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleRetry} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button variant="outline" onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="gap-2">
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
              </div>

              <div className="border-t pt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={this.handleReportBug} 
                  className="gap-2 w-full text-gray-600"
                >
                  <Bug className="h-4 w-4" />
                  Report this issue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryConfig?: Omit<Props, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryConfig}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`

  return WithErrorBoundaryComponent
}

// Hook for error boundary in functional components (React 18+)
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    console.error('Manual error:', error, errorInfo)
    toast.error('An error occurred', {
      description: error.message,
      action: {
        label: 'Reload',
        onClick: () => window.location.reload(),
      },
    })
    throw error // Re-throw to trigger error boundary
  }
}

// Error boundary error handler
export function handleBoundaryError(error: Error, errorInfo: ErrorInfo) {
  console.error('React Error Boundary:', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString()
  })

  // Report to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // Sentry, LogRocket, or other error tracking service
    // reportToErrorTracking({ error, errorInfo })
  }
}