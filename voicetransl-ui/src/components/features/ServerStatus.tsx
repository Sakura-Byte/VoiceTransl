import { useState, useEffect } from 'react'
import { 
  Server, 
  Play, 
  Square, 
  RotateCcw, 
  Wifi, 
  WifiOff, 
  Activity, 
  Clock, 
  Zap,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Info
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { useServerStatus, useServerControl } from '@/hooks/api'
import { toast } from 'sonner'

interface ServerStatusProps {
  className?: string
  showControls?: boolean
  showDetails?: boolean
  compact?: boolean
}

export function ServerStatus({ 
  className, 
  showControls = true, 
  showDetails = true, 
  compact = false 
}: ServerStatusProps) {
  const { data: serverStatus, isLoading, error, refetch } = useServerStatus()
  const { startServer, stopServer, restartServer, isStarting, isStopping, isRestarting } = useServerControl()
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Update last update time when server status changes
  useEffect(() => {
    if (serverStatus) {
      setLastUpdate(new Date())
    }
  }, [serverStatus])

  // Auto-refresh status
  useEffect(() => {
    const interval = setInterval(() => {
      refetch()
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [refetch])

  // Server status helpers
  const isRunning = serverStatus?.status === 'running'
  const isHealthy = serverStatus?.healthy ?? false
  const isStartingUp = serverStatus?.status === 'starting'
  // const isOffline = error || !serverStatus || serverStatus.status === 'stopped'

  // Get premium status display info
  const getStatusInfo = () => {
    if (isLoading) {
      return {
        label: 'Checking...',
        color: 'text-neutral-600 dark:text-neutral-400',
        bgColor: 'bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900',
        ringColor: 'ring-neutral-200 dark:ring-neutral-800',
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        variant: 'secondary' as const,
        description: 'Connecting to server...'
      }
    }

    if (error || !serverStatus) {
      return {
        label: 'Offline',
        color: 'text-error-600 dark:text-error-400',
        bgColor: 'bg-gradient-to-br from-error-100 to-error-200 dark:from-error-800 dark:to-error-900',
        ringColor: 'ring-error-200 dark:ring-error-800',
        icon: <WifiOff className="h-5 w-5" />,
        variant: 'destructive' as const,
        description: 'Server is not reachable'
      }
    }

    if (isStartingUp) {
      return {
        label: 'Starting...',
        color: 'text-warning-600 dark:text-warning-400',
        bgColor: 'bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-900',
        ringColor: 'ring-warning-200 dark:ring-warning-800',
        icon: <Loader2 className="h-5 w-5 animate-spin" />,
        variant: 'secondary' as const,
        description: 'Server is starting up...'
      }
    }

    if (isRunning && isHealthy) {
      return {
        label: 'Online',
        color: 'text-success-600 dark:text-success-400',
        bgColor: 'bg-gradient-to-br from-success-100 to-success-200 dark:from-success-800 dark:to-success-900',
        ringColor: 'ring-success-200 dark:ring-success-800 animate-pulse',
        icon: <CheckCircle2 className="h-5 w-5" />,
        variant: 'default' as const,
        description: 'Server is running optimally'
      }
    }

    if (isRunning && !isHealthy) {
      return {
        label: 'Unhealthy',
        color: 'text-warning-600 dark:text-warning-400',
        bgColor: 'bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-900',
        ringColor: 'ring-warning-200 dark:ring-warning-800',
        icon: <AlertTriangle className="h-5 w-5" />,
        variant: 'secondary' as const,
        description: 'Server has issues'
      }
    }

    return {
      label: 'Stopped',
      color: 'text-neutral-600 dark:text-neutral-400',
      bgColor: 'bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900',
      ringColor: 'ring-neutral-200 dark:ring-neutral-800',
      icon: <Square className="h-5 w-5" />,
      variant: 'secondary' as const,
      description: 'Server is not running'
    }
  }

  // Server control handlers
  const handleStart = async () => {
    try {
      await startServer({})
      toast.success('Server start command sent')
    } catch (error: any) {
      toast.error(`Failed to start server: ${error.message}`)
    }
  }

  const handleStop = async () => {
    try {
      await stopServer(false)
      toast.success('Server stop command sent')
    } catch (error: any) {
      toast.error(`Failed to stop server: ${error.message}`)
    }
  }

  const handleRestart = async () => {
    try {
      await restartServer()
      toast.success('Server restart command sent')
    } catch (error: any) {
      toast.error(`Failed to restart server: ${error.message}`)
    }
  }

  const statusInfo = getStatusInfo()

  // Premium compact view for sidebar or small spaces
  if (compact) {
    return (
      <div className={cn("flex items-center space-x-3 p-3 rounded-xl bg-surface-secondary shadow-apple-sm", className)}>
        <div className={cn(
          "relative w-3 h-3 rounded-full shadow-sm", 
          isHealthy && isRunning && "bg-success-500 animate-pulse shadow-success-200/50",
          isRunning && !isHealthy && "bg-warning-500 shadow-warning-200/50",
          !isRunning && "bg-error-500 shadow-error-200/50"
        )}>
          {isHealthy && isRunning && (
            <div className="absolute inset-0 rounded-full bg-success-400 animate-ping" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-body-sm font-semibold text-text-primary">{statusInfo.label}</span>
          {serverStatus?.response_time_ms && (
            <span className="ml-2 text-body-sm text-text-tertiary font-mono">
              {serverStatus.response_time_ms}ms
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Premium Main Status Card */}
      <Card className="border-0 bg-surface-elevated shadow-apple-lg overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 shadow-apple-sm">
                <Server className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <CardTitle className="text-heading-md text-text-primary">
                  Server Status
                </CardTitle>
                <p className="text-body-sm text-text-tertiary mt-1">
                  {statusInfo.description}
                </p>
              </div>
            </div>
            
            <Badge className={cn(
              "ml-auto px-4 py-2 rounded-full font-semibold border-0 shadow-sm",
              statusInfo.variant === 'default' && "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
              statusInfo.variant === 'destructive' && "bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300",
              statusInfo.variant === 'secondary' && "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            )}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Premium Status Overview */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={cn(
                "relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-apple-md backdrop-blur-sm border border-white/20",
                statusInfo.bgColor
              )}>
                <div className={statusInfo.color}>
                  {statusInfo.icon}
                </div>
                {isHealthy && isRunning && (
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-success-400/20 to-success-600/20 animate-pulse" />
                )}
              </div>
              
              <div className="space-y-2">
                <div>
                  <p className="text-heading-sm text-text-primary">{statusInfo.label}</p>
                  <p className="text-body text-text-secondary font-mono">
                    {serverStatus?.url || 'http://localhost:8080'}
                  </p>
                </div>
                <p className="text-body-sm text-text-tertiary">
                  Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Premium Server Controls */}
            {showControls && (
              <div className="flex items-center space-x-3">
                {!isRunning ? (
                  <Button 
                    onClick={handleStart}
                    disabled={isStarting || isLoading}
                    size="lg"
                    className="px-6 py-3 rounded-xl font-semibold bg-gradient-brand hover:opacity-90 shadow-apple-md hover:shadow-apple-lg transition-shadow-apple"
                  >
                    {isStarting ? (
                      <div className="flex items-center">
                        <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                        Starting...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Play className="h-5 w-5 mr-3" />
                        Start Server
                      </div>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="outline"
                      onClick={handleStop}
                      disabled={isStopping || isLoading}
                      className="px-4 py-2 rounded-xl font-medium bg-surface-secondary hover:bg-surface-tertiary border border-border-primary shadow-apple-sm hover:shadow-apple-md transition-shadow-apple"
                    >
                      {isStopping ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Stopping...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Square className="h-4 w-4 mr-2" />
                          Stop
                        </div>
                      )}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={handleRestart}
                      disabled={isRestarting || isLoading}
                      className="px-4 py-2 rounded-xl font-medium bg-surface-secondary hover:bg-surface-tertiary border border-border-primary shadow-apple-sm hover:shadow-apple-md transition-shadow-apple"
                    >
                      {isRestarting ? (
                        <div className="flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Restarting...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restart
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Premium Connection Status Metrics */}
          {serverStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gradient-to-br from-surface-secondary to-surface-tertiary shadow-apple-sm border border-border-primary">
                <div className="flex flex-col items-center space-y-3">
                  <div className={cn(
                    "p-2 rounded-xl shadow-apple-sm",
                    isHealthy 
                      ? "bg-gradient-to-br from-success-100 to-success-200 dark:from-success-800 dark:to-success-900" 
                      : "bg-gradient-to-br from-error-100 to-error-200 dark:from-error-800 dark:to-error-900"
                  )}>
                    {isHealthy ? (
                      <Wifi className="h-5 w-5 text-success-600 dark:text-success-400" />
                    ) : (
                      <WifiOff className="h-5 w-5 text-error-600 dark:text-error-400" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-text-tertiary">Connection</p>
                    <p className="text-body-sm font-semibold text-text-primary">
                      {isHealthy ? 'Healthy' : 'Unhealthy'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-surface-secondary to-surface-tertiary shadow-apple-sm border border-border-primary">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 shadow-apple-sm">
                    <Activity className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-text-tertiary">Response Time</p>
                    <p className="text-body-sm font-semibold text-text-primary font-mono">
                      {serverStatus.response_time_ms ? `${serverStatus.response_time_ms}ms` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-surface-secondary to-surface-tertiary shadow-apple-sm border border-border-primary">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-900 shadow-apple-sm">
                    <Zap className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-text-tertiary">Port</p>
                    <p className="text-body-sm font-semibold text-text-primary font-mono">
                      {serverStatus.port}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-surface-secondary to-surface-tertiary shadow-apple-sm border border-border-primary">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 shadow-apple-sm">
                    <Clock className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-text-tertiary">Status</p>
                    <p className="text-body-sm font-semibold text-text-primary capitalize">
                      {serverStatus.status}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Premium Performance Metrics */}
          {serverStatus?.response_time_ms && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-surface-secondary to-surface-tertiary shadow-apple-sm border border-border-primary">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 shadow-apple-sm">
                      <Activity className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <p className="text-body-sm font-medium text-text-primary">Response Time</p>
                      <p className="text-body-sm text-text-tertiary">
                        {serverStatus.response_time_ms < 100 ? 'Excellent' :
                         serverStatus.response_time_ms < 300 ? 'Good' :
                         serverStatus.response_time_ms < 1000 ? 'Fair' : 'Poor'} performance
                      </p>
                    </div>
                  </div>
                  <p className="text-heading-sm font-semibold text-text-primary font-mono">
                    {serverStatus.response_time_ms}ms
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Progress 
                    value={Math.min((1000 - serverStatus.response_time_ms) / 10, 100)} 
                    className="h-2 bg-surface-tertiary shadow-inner rounded-full"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium Server Details */}
      {showDetails && serverStatus?.server_info && (
        <Card className="border-0 bg-surface-elevated shadow-apple-lg overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 shadow-apple-sm">
                <Settings className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div>
                <CardTitle className="text-heading-md text-text-primary">
                  Server Information
                </CardTitle>
                <p className="text-body-sm text-text-tertiary mt-1">
                  Detailed server configuration
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-heading-sm text-text-primary border-b border-border-secondary pb-2">Network</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary">
                    <span className="text-body-sm text-text-tertiary font-medium">Host:</span>
                    <span className="text-body-sm font-mono text-text-primary bg-surface-tertiary px-2 py-1 rounded">{serverStatus.server_info.host}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary">
                    <span className="text-body-sm text-text-tertiary font-medium">Port:</span>
                    <span className="text-body-sm font-mono text-text-primary bg-surface-tertiary px-2 py-1 rounded">{serverStatus.server_info.port}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary">
                    <span className="text-body-sm text-text-tertiary font-medium">URL:</span>
                    <span className="text-body-sm font-mono text-brand-600 dark:text-brand-400 bg-brand-100 dark:bg-brand-900 px-2 py-1 rounded">{serverStatus.server_info.url}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-heading-sm text-text-primary border-b border-border-secondary pb-2">Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary">
                    <span className="text-body-sm text-text-tertiary font-medium">Max Concurrent Tasks:</span>
                    <span className="text-body-sm font-mono text-text-primary bg-surface-tertiary px-2 py-1 rounded">{serverStatus.server_info.max_concurrent_tasks || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary">
                    <span className="text-body-sm text-text-tertiary font-medium">Request Timeout:</span>
                    <span className="text-body-sm font-mono text-text-primary bg-surface-tertiary px-2 py-1 rounded">{serverStatus.server_info.request_timeout || 'N/A'}s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-surface-secondary">
                    <span className="text-body-sm text-text-tertiary font-medium">Status:</span>
                    <Badge className="px-3 py-1 rounded-full font-medium bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 border-0">
                      {serverStatus.server_info.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Error Display */}
      {error && (
        <Card className="border-0 bg-gradient-to-r from-error-50 to-error-100 dark:from-error-950 dark:to-error-900 shadow-apple-lg">
          <CardContent className="p-4">
            <Alert className="border-0 bg-transparent">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-error flex items-center justify-center shadow-apple-sm">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <AlertDescription className="text-body text-error-700 dark:text-error-300 font-medium">
                    Failed to connect to server. Please check if the API server is running.
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Premium Health Check Message */}
      {serverStatus?.message && (
        <Card className="border-0 bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900 shadow-apple-lg">
          <CardContent className="p-4">
            <Alert className="border-0 bg-transparent">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-apple-sm">
                  <Info className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <AlertDescription className="text-body text-brand-700 dark:text-brand-300 font-medium">
                    {serverStatus.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  )
}