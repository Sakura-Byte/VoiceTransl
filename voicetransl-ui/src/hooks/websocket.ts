// WebSocket integration hooks
import { useEffect, useCallback } from 'react'
import { websocketService, type WebSocketHandler } from '@/services/websocket'
import { useAppStore } from '@/stores/appStore'
import { queryUtils } from '@/lib/react-query'
import { toast } from 'sonner'
import type { Task, ServerStatus } from '@/types'

// Main WebSocket hook
export function useWebSocket() {
  const {
    setWsConnected,
    setReconnectAttempts,
    setConnectionError,
    updateActiveTask,
    removeActiveTask,
    setServerStatus,
  } = useAppStore()

  // Connection management
  const connect = useCallback((clientId?: string) => {
    websocketService.connect(clientId).catch((error) => {
      console.error('WebSocket connection failed:', error)
      setConnectionError(error.message)
    })
  }, [setConnectionError])

  const disconnect = useCallback(() => {
    websocketService.disconnect()
  }, [])

  const reconnect = useCallback(() => {
    websocketService.connect().catch((error) => {
      console.error('WebSocket reconnection failed:', error)
      setConnectionError(error.message)
    })
  }, [setConnectionError])

  // Connection status management
  useEffect(() => {
    const unsubscribeConnection = websocketService.on('connection', () => {
      setWsConnected(true)
      setReconnectAttempts(0)
      setConnectionError(undefined)
    })

    const unsubscribeDisconnection = websocketService.on('disconnection', () => {
      setWsConnected(false)
    })

    const unsubscribeReconnection = websocketService.on('reconnection', (data: any) => {
      setReconnectAttempts(data?.attempt || 0)
    })

    const unsubscribeError = websocketService.on('error', (error: any) => {
      setConnectionError(error?.message || 'WebSocket error')
    })

    return () => {
      unsubscribeConnection()
      unsubscribeDisconnection()
      unsubscribeReconnection()
      unsubscribeError()
    }
  }, [setWsConnected, setReconnectAttempts, setConnectionError])

  // Task progress updates
  useEffect(() => {
    const unsubscribeTaskProgress = websocketService.subscribeToTaskProgress((data: any) => {
      console.log('Task progress update:', data)
      
      if (data && data.task_id) {
        const taskUpdate: Partial<Task> = {
          id: data.task_id,
          status: data.status,
          progress: data.progress,
          message: data.message,
          updated_at: new Date().toISOString(),
        }

        // Update task in store
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          removeActiveTask(data.task_id)
        } else {
          updateActiveTask(data.task_id, taskUpdate)
        }

        // Update React Query cache
        queryUtils.updateTaskProgress(data.task_id, taskUpdate)
      }
    })

    return unsubscribeTaskProgress
  }, [updateActiveTask, removeActiveTask])

  // Server status updates
  useEffect(() => {
    const unsubscribeServerStatus = websocketService.subscribeToServerStatus((data: any) => {
      console.log('Server status update:', data)
      
      if (data) {
        const serverStatus: ServerStatus = {
          status: data.status || 'unknown',
          url: data.url || 'http://localhost:8000',
          port: data.port || 8000,
          healthy: data.healthy || false,
          message: data.message || '',
          response_time_ms: data.response_time_ms,
          server_info: data.server_info,
        }

        // Update store
        setServerStatus(serverStatus)

        // Update React Query cache
        queryUtils.setServerStatus(serverStatus)
      }
    })

    return unsubscribeServerStatus
  }, [setServerStatus])

  // Log updates
  useEffect(() => {
    const unsubscribeLogUpdates = websocketService.subscribeToLogUpdates((data: any) => {
      console.log('Log update:', data)
      
      // Invalidate log queries to refetch
      queryUtils.invalidateLogs()
    })

    return unsubscribeLogUpdates
  }, [])

  // Get connection info
  const connectionInfo = websocketService.getConnectionInfo()

  return {
    // Connection methods
    connect,
    disconnect,
    reconnect,
    
    // Connection state
    isConnected: connectionInfo.connected,
    isConnecting: connectionInfo.connecting,
    reconnectAttempts: connectionInfo.reconnectAttempts,
    shouldReconnect: connectionInfo.shouldReconnect,
    
    // Utility methods
    send: websocketService.send.bind(websocketService),
    getConnectionState: websocketService.getConnectionState.bind(websocketService),
  }
}

// Hook for subscribing to specific WebSocket events
export function useWebSocketSubscription(
  eventType: string,
  handler: WebSocketHandler,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const unsubscribe = websocketService.onMessage(eventType, handler)
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// Hook for task progress updates
export function useTaskProgressUpdates() {
  const { updateActiveTask, addActiveTask, removeActiveTask } = useAppStore()

  useWebSocketSubscription('task_progress', (data: any) => {
    if (data && data.task_id) {
      const taskUpdate: Partial<Task> = {
        id: data.task_id,
        type: data.type || 'workflow',
        status: data.status,
        progress: data.progress || 0,
        message: data.message || '',
        updated_at: new Date().toISOString(),
      }

      if (data.status === 'pending' || data.status === 'running') {
        // Add or update active task
        if (data.status === 'running' && data.progress === 0) {
          // New task starting
          addActiveTask({
            ...taskUpdate,
            created_at: new Date().toISOString(),
          } as Task)
        } else {
          // Update existing task
          updateActiveTask(data.task_id, taskUpdate)
        }
      } else if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        // Remove from active tasks
        removeActiveTask(data.task_id)
        
        // Show completion notification
        if (data.status === 'completed') {
          toast.success('Task completed', {
            description: `${data.type || 'Task'} finished successfully`,
          })
        } else if (data.status === 'failed') {
          toast.error('Task failed', {
            description: data.message || 'Task failed to complete',
          })
        } else if (data.status === 'cancelled') {
          toast.info('Task cancelled', {
            description: 'Task was cancelled by user',
          })
        }
      }

      // Update React Query cache
      queryUtils.updateTaskProgress(data.task_id, taskUpdate)
    }
  })
}

// Hook for server status updates
export function useServerStatusUpdates() {
  const { setServerStatus } = useAppStore()

  useWebSocketSubscription('server_status', (data: any) => {
    if (data) {
      const serverStatus: ServerStatus = {
        status: data.status || 'unknown',
        url: data.url || 'http://localhost:8000',
        port: data.port || 8000,
        healthy: data.healthy || false,
        message: data.message || '',
        response_time_ms: data.response_time_ms,
        server_info: data.server_info,
      }

      setServerStatus(serverStatus)
      queryUtils.setServerStatus(serverStatus)

      // Show server status change notifications
      if (data.status === 'running') {
        toast.success('API Server started', {
          description: `Server is running on ${data.url}`,
        })
      } else if (data.status === 'stopped') {
        toast.info('API Server stopped', {
          description: 'Server is no longer running',
        })
      }
    }
  })
}

// Hook for log updates
export function useLogUpdates() {
  useWebSocketSubscription('log_update', (data: any) => {
    console.log('Log update received:', data)
    
    // Invalidate log queries to trigger refetch
    queryUtils.invalidateLogs()
    
    // Show notification for important log events
    if (data && data.level === 'error') {
      toast.error('Error logged', {
        description: data.message || 'An error was logged',
      })
    }
  })
}

// Comprehensive hook that sets up all WebSocket subscriptions
export function useWebSocketIntegration() {
  const webSocket = useWebSocket()
  
  // Set up all real-time subscriptions
  useTaskProgressUpdates()
  useServerStatusUpdates()
  useLogUpdates()
  
  // Auto-connect on mount if not connected
  useEffect(() => {
    if (!webSocket.isConnected && !webSocket.isConnecting) {
      webSocket.connect()
    }
  }, [])
  
  // Auto-reconnect on window focus if disconnected
  useEffect(() => {
    const handleFocus = () => {
      if (!webSocket.isConnected && !webSocket.isConnecting) {
        webSocket.reconnect()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [webSocket])
  
  return webSocket
}

// Hook for sending WebSocket messages
export function useWebSocketSender() {
  const send = useCallback((message: Record<string, unknown>) => {
    return websocketService.send(message)
  }, [])
  
  return { send }
}