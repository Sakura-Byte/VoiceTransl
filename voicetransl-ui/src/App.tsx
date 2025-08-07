import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useEffect } from 'react'
import { QueryProvider } from '@/lib/react-query'
import { AppLayout } from '@/components/layout'
import { Toaster } from '@/components/ui/sonner'
import { WebSocketProvider } from '@/components/WebSocketProvider'
import { ErrorBoundary, handleBoundaryError } from '@/components/ErrorBoundary'
import { ThemeProvider, useThemeTransition } from '@/components/ThemeProvider'
import { initializePreloader } from '@/lib/preloader'
import { initializePerformanceMonitoring } from '@/lib/performance'

// Lazy load page components for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TasksPage = lazy(() => import('@/pages/TasksPage'))
const LogsPage = lazy(() => import('@/pages/LogsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))

// Premium loading component for Suspense fallback
const PageLoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-200 border-t-brand-600"></div>
      <p className="text-body-sm text-text-tertiary animate-pulse">Loading...</p>
    </div>
  </div>
)

// App content component that uses theme
function AppContent() {
  // Initialize performance optimizations and theme transitions
  useEffect(() => {
    initializePreloader()
    initializePerformanceMonitoring()
  }, [])

  // Enable smooth theme transitions
  useThemeTransition()

  return (
    <ErrorBoundary 
      onError={handleBoundaryError}
      showDetails={process.env.NODE_ENV === 'development'}
    >
      <QueryProvider>
        <WebSocketProvider>
          <Router>
            <ErrorBoundary onError={handleBoundaryError}>
              <AppLayout>
                <Suspense fallback={<PageLoadingSpinner />}>
                  <Routes>
                    {/* Main Routes */}
                    <Route path="/" element={
                      <ErrorBoundary onError={handleBoundaryError}>
                        <DashboardPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/tasks" element={
                      <ErrorBoundary onError={handleBoundaryError}>
                        <TasksPage />
                      </ErrorBoundary>
                    } />
                    <Route path="/logs" element={
                      <ErrorBoundary onError={handleBoundaryError}>
                        <LogsPage />
                      </ErrorBoundary>
                    } />
                    
                    {/* Premium Settings Route */}
                    <Route path="/settings/*" element={
                      <ErrorBoundary onError={handleBoundaryError}>
                        <SettingsPage />
                      </ErrorBoundary>
                    } />
                    
                    {/* Catch-all fallback */}
                    <Route path="*" element={
                      <ErrorBoundary onError={handleBoundaryError}>
                        <DashboardPage />
                      </ErrorBoundary>
                    } />
                  </Routes>
                </Suspense>
              </AppLayout>
            </ErrorBoundary>
            
            {/* Premium Toast Notifications */}
            <Toaster 
              position="bottom-right"
              expand={true}
              richColors
              closeButton
              className="font-body"
              toastOptions={{
                className: 'bg-surface-elevated border-border-primary shadow-apple-lg text-text-primary',
              }}
            />
          </Router>
        </WebSocketProvider>
      </QueryProvider>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="voicetransl-theme">
      <AppContent />
    </ThemeProvider>
  )
}

export default App
