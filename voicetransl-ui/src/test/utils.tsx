import React from 'react'
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { vi, expect } from 'vitest'

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test utilities

// Create mock file for file upload tests
export const createMockFile = (
  name: string = 'test.mp3',
  type: string = 'audio/mpeg',
  size: number = 1024 * 1024 // 1MB
): File => {
  const file = new File(['mock file content'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

// Create mock FileList
export const createMockFileList = (files: File[]): FileList => {
  const fileList = {
    item: (index: number) => files[index] || null,
    length: files.length,
    ...files.reduce((acc, file, index) => ({ ...acc, [index]: file }), {}),
  }
  
  return fileList as FileList
}

// Mock drag event data
export const createMockDragEvent = (files: File[] = []): Partial<DragEvent> => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  dataTransfer: {
    files: createMockFileList(files),
    items: files.map(file => ({
      kind: 'file' as const,
      type: file.type,
      getAsFile: () => file,
    })) as unknown as DataTransferItemList,
    types: ['Files'],
    dropEffect: 'copy',
    effectAllowed: 'all',
    getData: vi.fn(),
    setData: vi.fn(),
    clearData: vi.fn(),
    setDragImage: vi.fn(),
  },
})

// Mock form event
export const createMockFormEvent = (formData: Record<string, any> = {}): Partial<React.FormEvent> => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  currentTarget: {
    elements: Object.entries(formData).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: { value }
    }), {}),
  } as any,
})

// Mock WebSocket for WebSocket tests
export const createMockWebSocket = () => {
  const mockWs = {
    send: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    readyState: WebSocket.CONNECTING,
    url: 'ws://localhost:8080/ws',
    protocol: '',
    extensions: '',
    binaryType: 'blob' as BinaryType,
    bufferedAmount: 0,
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    CONNECTING: WebSocket.CONNECTING,
    OPEN: WebSocket.OPEN,
    CLOSING: WebSocket.CLOSING,
    CLOSED: WebSocket.CLOSED,
  }
  
  return mockWs
}

// Simulate WebSocket message
export const simulateWebSocketMessage = (ws: any, data: any) => {
  const messageEvent = new MessageEvent('message', {
    data: JSON.stringify(data),
    origin: 'ws://localhost:8080',
  })
  
  if (ws.onmessage) {
    ws.onmessage(messageEvent)
  }
}

// Wait for async operations to complete
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock server status response
export const mockServerStatus = (overrides: Partial<any> = {}) => ({
  status: 'running',
  healthy: true,
  url: 'http://localhost:8080',
  port: 8080,
  response_time_ms: 45,
  message: 'Server is running normally',
  server_info: {
    host: 'localhost',
    port: 8080,
    url: 'http://localhost:8080',
    status: 'running',
    max_concurrent_tasks: 4,
    request_timeout: 300,
  },
  ...overrides,
})

// Mock task response
export const mockTask = (overrides: Partial<any> = {}) => ({
  task_id: 'test-task-id',
  status: 'processing',
  progress: 50,
  message: 'Processing...',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  result: null,
  error: null,
  ...overrides,
})

// Mock error for error boundary tests
export const throwError = (message: string = 'Test error') => {
  throw new Error(message)
}

// Mock component that throws an error
export const ErrorThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error from component')
  }
  return <div>No error</div>
}

// Mock ResizeObserver entry
export const createMockResizeObserverEntry = (contentRect: Partial<DOMRectReadOnly> = {}) => ({
  target: document.createElement('div'),
  contentRect: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    top: 0,
    right: 100,
    bottom: 100,
    left: 0,
    toJSON: vi.fn(),
    ...contentRect,
  } as DOMRectReadOnly,
  borderBoxSize: [],
  contentBoxSize: [],
  devicePixelContentBoxSize: [],
})

// Helper to test accessibility
export const checkAccessibility = async (container: HTMLElement) => {
  // Basic accessibility checks
  const buttons = container.querySelectorAll('button')
  buttons.forEach(button => {
    expect(button).toHaveAttribute('type')
  })

  const inputs = container.querySelectorAll('input')
  inputs.forEach(input => {
    if (input.type !== 'hidden') {
      expect(input).toHaveAccessibleName()
    }
  })

  const images = container.querySelectorAll('img')
  images.forEach(img => {
    expect(img).toHaveAttribute('alt')
  })
}

// Mock intersection observer entry
export const createMockIntersectionObserverEntry = (isIntersecting: boolean = true) => ({
  target: document.createElement('div'),
  isIntersecting,
  intersectionRatio: isIntersecting ? 1 : 0,
  intersectionRect: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    top: 0,
    right: 100,
    bottom: 100,
    left: 0,
  },
  boundingClientRect: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    top: 0,
    right: 100,
    bottom: 100,
    left: 0,
  },
  rootBounds: null,
  time: Date.now(),
})