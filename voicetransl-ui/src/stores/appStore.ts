import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { ServerStatus, Task, NotificationConfig } from '@/types'

// Connection state
interface ConnectionState {
  wsConnected: boolean
  wsReconnectAttempts: number
  lastConnectionError?: string
  setWsConnected: (connected: boolean) => void
  setReconnectAttempts: (attempts: number) => void
  setConnectionError: (error?: string) => void
}

// Server state
interface ServerState {
  serverStatus: ServerStatus | null
  lastStatusCheck: number
  setServerStatus: (status: ServerStatus | null) => void
  updateLastStatusCheck: () => void
}

// Task state
interface TaskState {
  activeTasks: Record<string, Task>
  recentTasks: Task[]
  setActiveTasks: (tasks: Record<string, Task>) => void
  addActiveTask: (task: Task) => void
  updateActiveTask: (taskId: string, updates: Partial<Task>) => void
  removeActiveTask: (taskId: string) => void
  addRecentTask: (task: Task) => void
  clearRecentTasks: () => void
}

// UI state
interface UIState {
  sidebarCollapsed: boolean
  theme: 'light' | 'dark' | 'system'
  notifications: NotificationConfig[]
  loading: boolean
  loadingMessage?: string
  setSidebarCollapsed: (collapsed: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  addNotification: (notification: NotificationConfig) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  setLoading: (loading: boolean, message?: string) => void
}

// File state
interface FileState {
  selectedFiles: File[]
  uploadProgress: Record<string, number>
  setSelectedFiles: (files: File[]) => void
  addSelectedFiles: (files: File[]) => void
  removeSelectedFile: (index: number) => void
  clearSelectedFiles: () => void
  setUploadProgress: (fileName: string, progress: number) => void
  clearUploadProgress: () => void
}

// Combined app state
export type AppState = ConnectionState & ServerState & TaskState & UIState & FileState

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Connection state
        wsConnected: false,
        wsReconnectAttempts: 0,
        lastConnectionError: undefined,
        setWsConnected: (connected: boolean) => {
          set({ wsConnected: connected }, false, 'setWsConnected')
        },
        setReconnectAttempts: (attempts: number) => {
          set({ wsReconnectAttempts: attempts }, false, 'setReconnectAttempts')
        },
        setConnectionError: (error?: string) => {
          set({ lastConnectionError: error }, false, 'setConnectionError')
        },

        // Server state
        serverStatus: null,
        lastStatusCheck: 0,
        setServerStatus: (status: ServerStatus | null) => {
          set({ serverStatus: status }, false, 'setServerStatus')
        },
        updateLastStatusCheck: () => {
          set({ lastStatusCheck: Date.now() }, false, 'updateLastStatusCheck')
        },

        // Task state
        activeTasks: {},
        recentTasks: [],
        setActiveTasks: (tasks: Record<string, Task>) => {
          set({ activeTasks: tasks }, false, 'setActiveTasks')
        },
        addActiveTask: (task: Task) => {
          set(
            state => ({
              activeTasks: {
                ...state.activeTasks,
                [task.id]: task,
              },
            }),
            false,
            'addActiveTask'
          )
        },
        updateActiveTask: (taskId: string, updates: Partial<Task>) => {
          set(
            state => ({
              activeTasks: {
                ...state.activeTasks,
                [taskId]: {
                  ...state.activeTasks[taskId],
                  ...updates,
                },
              },
            }),
            false,
            'updateActiveTask'
          )
        },
        removeActiveTask: (taskId: string) => {
          set(
            state => {
              const { [taskId]: removed, ...rest } = state.activeTasks
              return { activeTasks: rest }
            },
            false,
            'removeActiveTask'
          )
        },
        addRecentTask: (task: Task) => {
          set(
            state => ({
              recentTasks: [task, ...state.recentTasks.slice(0, 9)], // Keep last 10
            }),
            false,
            'addRecentTask'
          )
        },
        clearRecentTasks: () => {
          set({ recentTasks: [] }, false, 'clearRecentTasks')
        },

        // UI state
        sidebarCollapsed: false,
        theme: 'system',
        notifications: [],
        loading: false,
        loadingMessage: undefined,
        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed }, false, 'setSidebarCollapsed')
        },
        setTheme: (theme: 'light' | 'dark' | 'system') => {
          set({ theme }, false, 'setTheme')
        },
        addNotification: (notification: NotificationConfig) => {
          const id = Date.now().toString()
          const notificationWithId = { ...notification, id }
          set(
            state => ({
              notifications: [...state.notifications, notificationWithId],
            }),
            false,
            'addNotification'
          )

          // Auto remove after duration
          if (notification.duration && notification.duration > 0) {
            setTimeout(() => {
              get().removeNotification(id)
            }, notification.duration)
          }
        },
        removeNotification: (id: string) => {
          set(
            state => ({
              notifications: state.notifications.filter((n: any) => n.id !== id),
            }),
            false,
            'removeNotification'
          )
        },
        clearNotifications: () => {
          set({ notifications: [] }, false, 'clearNotifications')
        },
        setLoading: (loading: boolean, message?: string) => {
          set({ loading, loadingMessage: message }, false, 'setLoading')
        },

        // File state
        selectedFiles: [],
        uploadProgress: {},
        setSelectedFiles: (files: File[]) => {
          set({ selectedFiles: files }, false, 'setSelectedFiles')
        },
        addSelectedFiles: (files: File[]) => {
          set(
            state => ({
              selectedFiles: [...state.selectedFiles, ...files],
            }),
            false,
            'addSelectedFiles'
          )
        },
        removeSelectedFile: (index: number) => {
          set(
            state => ({
              selectedFiles: state.selectedFiles.filter((_, i) => i !== index),
            }),
            false,
            'removeSelectedFile'
          )
        },
        clearSelectedFiles: () => {
          set({ selectedFiles: [], uploadProgress: {} }, false, 'clearSelectedFiles')
        },
        setUploadProgress: (fileName: string, progress: number) => {
          set(
            state => ({
              uploadProgress: {
                ...state.uploadProgress,
                [fileName]: progress,
              },
            }),
            false,
            'setUploadProgress'
          )
        },
        clearUploadProgress: () => {
          set({ uploadProgress: {} }, false, 'clearUploadProgress')
        },
      }),
      {
        name: 'voicetransl-app-store',
        partialize: state => ({
          // Only persist UI preferences, not runtime state
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
        }),
      }
    ),
    {
      name: 'VoiceTransl App Store',
    }
  )
)

// Convenience selectors
export const useConnectionState = () =>
  useAppStore(state => ({
    wsConnected: state.wsConnected,
    wsReconnectAttempts: state.wsReconnectAttempts,
    lastConnectionError: state.lastConnectionError,
  }))

export const useServerStatus = () =>
  useAppStore(state => ({
    serverStatus: state.serverStatus,
    lastStatusCheck: state.lastStatusCheck,
  }))

export const useActiveTasks = () =>
  useAppStore(state => ({
    activeTasks: state.activeTasks,
    activeTaskCount: Object.keys(state.activeTasks).length,
  }))

export const useUIState = () =>
  useAppStore(state => ({
    sidebarCollapsed: state.sidebarCollapsed,
    theme: state.theme,
    loading: state.loading,
    loadingMessage: state.loadingMessage,
  }))

export const useNotifications = () =>
  useAppStore(state => ({
    notifications: state.notifications,
  }))

export const useFileState = () =>
  useAppStore(state => ({
    selectedFiles: state.selectedFiles,
    uploadProgress: state.uploadProgress,
    hasSelectedFiles: state.selectedFiles.length > 0,
  }))