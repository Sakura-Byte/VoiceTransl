import type { WebSocketMessage } from '@/types'

export type WebSocketEventType =
  | 'connection'
  | 'disconnection'
  | 'reconnection'
  | 'error'
  | 'message'
  | 'task_progress'
  | 'server_status'
  | 'log_update'

export type WebSocketHandler = (data?: unknown) => void

export interface WebSocketConfig {
  url?: string
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  debug?: boolean
}

export class WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number
  private maxReconnectAttempts: number
  private pingInterval: number
  private debug: boolean

  private reconnectAttempts = 0
  private reconnectTimeout: NodeJS.Timeout | null = null
  private pingTimeout: NodeJS.Timeout | null = null
  private isConnecting = false
  private shouldReconnect = true

  private handlers = new Map<WebSocketEventType, Set<WebSocketHandler>>()
  private messageHandlers = new Map<string, Set<WebSocketHandler>>()

  constructor(config: WebSocketConfig = {}) {
    // Use environment variables for configuration
    const defaultUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'
    const defaultDebug = import.meta.env.DEV
    
    this.url = config.url || defaultUrl
    this.reconnectInterval = config.reconnectInterval || 3000
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10
    this.pingInterval = config.pingInterval || 30000
    this.debug = config.debug ?? defaultDebug

    this.log('WebSocketService initialized', { config })
  }

  // ==================== CONNECTION MANAGEMENT ====================

  connect(clientId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.log('Already connected')
        resolve()
        return
      }

      if (this.isConnecting) {
        this.log('Connection already in progress')
        resolve()
        return
      }

      this.isConnecting = true
      this.shouldReconnect = true

      try {
        const wsUrl = clientId ? `${this.url}?client_id=${clientId}` : this.url
        this.log('Connecting to WebSocket', { url: wsUrl })

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          this.log('WebSocket connected')
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.startPing()
          this.emit('connection', { connected: true })
          resolve()
        }

        this.ws.onclose = event => {
          this.log('WebSocket closed', { code: event.code, reason: event.reason })
          this.isConnecting = false
          this.stopPing()
          this.emit('disconnection', { connected: false, code: event.code, reason: event.reason })

          if (this.shouldReconnect) {
            this.scheduleReconnect()
          }
        }

        this.ws.onerror = error => {
          this.log('WebSocket error', error)
          this.isConnecting = false
          this.emit('error', error)
          reject(error)
        }

        this.ws.onmessage = event => {
          this.handleMessage(event)
        }
      } catch (error) {
        this.log('Failed to create WebSocket connection', error)
        this.isConnecting = false
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.log('Disconnecting WebSocket')
    this.shouldReconnect = false
    this.clearReconnectTimeout()
    this.stopPing()

    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect')
      this.ws = null
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Max reconnect attempts reached')
      this.emit('error', { message: 'Max reconnect attempts reached' })
      return
    }

    this.clearReconnectTimeout()

    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts), 30000)
    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts + 1} in ${delay}ms`)

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      this.log(`Reconnect attempt ${this.reconnectAttempts}`)
      this.emit('reconnection', { attempt: this.reconnectAttempts })
      this.connect().catch(error => {
        this.log('Reconnect failed', error)
      })
    }, delay)
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  // ==================== PING/PONG MANAGEMENT ====================

  private startPing(): void {
    this.stopPing()
    this.pingTimeout = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }))
      }
    }, this.pingInterval)
  }

  private stopPing(): void {
    if (this.pingTimeout) {
      clearInterval(this.pingTimeout)
      this.pingTimeout = null
    }
  }

  // ==================== MESSAGE HANDLING ====================

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data)
      this.log('Received message', message)

      // Emit generic message event
      this.emit('message', message)

      // Handle specific message types
      if (message.type === 'pong') {
        // Handle pong response
        return
      }

      // Emit specific message type events
      const handlers = this.messageHandlers.get(message.type)
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(message.data)
          } catch (error) {
            this.log('Error in message handler', error)
          }
        })
      }

      // Handle built-in message types
      switch (message.type) {
        case 'task_progress':
          this.emit('task_progress', message.data)
          break
        case 'server_status':
          this.emit('server_status', message.data)
          break
        case 'log_update':
          this.emit('log_update', message.data)
          break
      }
    } catch (error) {
      this.log('Failed to parse WebSocket message', error)
    }
  }

  send(message: Record<string, unknown>): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
        this.log('Sent message', message)
        return true
      } catch (error) {
        this.log('Failed to send message', error)
        return false
      }
    }
    this.log('Cannot send message - WebSocket not connected')
    return false
  }

  // ==================== EVENT SUBSCRIPTION ====================

  on(eventType: WebSocketEventType, handler: WebSocketHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set())
    }
    this.handlers.get(eventType)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler)
    }
  }

  off(eventType: WebSocketEventType, handler: WebSocketHandler): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.handlers.delete(eventType)
      }
    }
  }

  onMessage(messageType: string, handler: WebSocketHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set())
    }
    this.messageHandlers.get(messageType)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.offMessage(messageType, handler)
    }
  }

  offMessage(messageType: string, handler: WebSocketHandler): void {
    const handlers = this.messageHandlers.get(messageType)
    if (handlers) {
      handlers.delete(handler)
      if (handlers.size === 0) {
        this.messageHandlers.delete(messageType)
      }
    }
  }

  private emit(eventType: WebSocketEventType, data?: unknown): void {
    const handlers = this.handlers.get(eventType)
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data)
        } catch (error) {
          this.log('Error in event handler', error)
        }
      })
    }
  }

  // ==================== SUBSCRIPTION HELPERS ====================

  subscribeToTaskProgress(handler: WebSocketHandler): () => void {
    return this.onMessage('task_progress', handler)
  }

  subscribeToServerStatus(handler: WebSocketHandler): () => void {
    return this.onMessage('server_status', handler)
  }

  subscribeToLogUpdates(handler: WebSocketHandler): () => void {
    return this.onMessage('log_update', handler)
  }

  // ==================== STATUS & UTILITIES ====================

  getConnectionState(): WebSocket['readyState'] | -1 {
    return this.ws?.readyState ?? -1
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  getConnectionInfo(): {
    connected: boolean
    connecting: boolean
    reconnectAttempts: number
    shouldReconnect: boolean
    url: string
  } {
    return {
      connected: this.isConnected(),
      connecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      shouldReconnect: this.shouldReconnect,
      url: this.url,
    }
  }

  updateConfig(config: Partial<WebSocketConfig>): void {
    if (config.url) this.url = config.url
    if (config.reconnectInterval) this.reconnectInterval = config.reconnectInterval
    if (config.maxReconnectAttempts) this.maxReconnectAttempts = config.maxReconnectAttempts
    if (config.pingInterval) this.pingInterval = config.pingInterval
    if (config.debug !== undefined) this.debug = config.debug

    this.log('Config updated', config)
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[WebSocketService] ${message}`, data || '')
    }
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    this.log('Destroying WebSocketService')
    this.disconnect()
    this.handlers.clear()
    this.messageHandlers.clear()
  }
}

// Create and export a default instance with environment-based configuration
export const websocketService = new WebSocketService({
  url: import.meta.env.VITE_WS_URL,
  debug: import.meta.env.DEV,
  reconnectInterval: 3000,
  maxReconnectAttempts: import.meta.env.PROD ? 5 : 10, // Fewer attempts in production
  pingInterval: 30000,
})

// Auto-connect in browser environment (not during SSR)
if (typeof window !== 'undefined') {
  // Connect after a short delay to allow app initialization
  setTimeout(() => {
    websocketService.connect().catch(error => {
      console.warn('Initial WebSocket connection failed:', error)
    })
  }, 2000)
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    websocketService.disconnect()
  })
}

export default websocketService