import { useEffect } from 'react'
import { useWebSocketIntegration } from '@/hooks/websocket'
import { toast } from 'sonner'

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const webSocket = useWebSocketIntegration()

  // Show connection status notifications
  useEffect(() => {
    if (webSocket.isConnected) {
      toast.success('Real-time updates connected', {
        description: 'Live task and server status updates are now active',
        duration: 3000,
      })
    } else if (!webSocket.isConnecting && !webSocket.isConnected) {
      toast.error('Real-time updates disconnected', {
        description: 'Attempting to reconnect...',
        duration: 3000,
      })
    }
  }, [webSocket.isConnected, webSocket.isConnecting])

  // Show reconnection attempts
  useEffect(() => {
    if (webSocket.reconnectAttempts > 0) {
      toast.info(`Reconnecting... (attempt ${webSocket.reconnectAttempts})`, {
        duration: 2000,
      })
    }
  }, [webSocket.reconnectAttempts])

  return <>{children}</>
}