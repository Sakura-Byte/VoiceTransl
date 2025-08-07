// Performance monitoring utilities

interface PerformanceMetrics {
  name: string
  duration: number
  timestamp: number
  type: 'api' | 'component' | 'route' | 'build'
  metadata?: Record<string, unknown>
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private observers: PerformanceObserver[] = []
  
  constructor() {
    if (import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true') {
      this.initializePerformanceObservers()
    }
  }

  private initializePerformanceObservers() {
    try {
      // Navigation timing observer
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordMetric({
              name: 'page_load',
              duration: navEntry.loadEventEnd - navEntry.loadEventStart,
              timestamp: Date.now(),
              type: 'route',
              metadata: {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                firstPaint: navEntry.responseEnd - navEntry.responseStart,
                transferSize: navEntry.transferSize,
                encodedBodySize: navEntry.encodedBodySize,
              }
            })
          }
        })
      })
      navObserver.observe({ type: 'navigation', buffered: true })
      this.observers.push(navObserver)

      // Resource timing observer
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'resource' && entry.name.includes('api')) {
            this.recordMetric({
              name: 'api_request',
              duration: entry.duration,
              timestamp: Date.now(),
              type: 'api',
              metadata: {
                url: entry.name,
                transferSize: (entry as PerformanceResourceTiming).transferSize,
                encodedBodySize: (entry as PerformanceResourceTiming).encodedBodySize,
              }
            })
          }
        })
      })
      resourceObserver.observe({ type: 'resource', buffered: true })
      this.observers.push(resourceObserver)

      // Measure observer for custom metrics
      const measureObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            duration: entry.duration,
            timestamp: Date.now(),
            type: 'component',
          })
        })
      })
      measureObserver.observe({ type: 'measure', buffered: true })
      this.observers.push(measureObserver)

    } catch (error) {
      console.warn('Performance monitoring not supported:', error)
    }
  }

  // Manual performance tracking
  startTimer(name: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        type: 'component',
      })
    }
  }

  // Mark performance points
  mark(name: string, metadata?: Record<string, unknown>) {
    try {
      performance.mark(name)
      if (metadata) {
        this.recordMetric({
          name,
          duration: 0,
          timestamp: Date.now(),
          type: 'component',
          metadata,
        })
      }
    } catch (error) {
      console.warn('Performance.mark not supported:', error)
    }
  }

  // Measure between marks
  measure(name: string, startMark: string, endMark?: string) {
    try {
      performance.measure(name, startMark, endMark)
    } catch (error) {
      console.warn('Performance.measure failed:', error)
    }
  }

  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }

    // Log in development
    if (import.meta.env.DEV) {
      console.log('📊 Performance Metric:', metric)
    }
  }

  // Get performance summary
  getMetrics(type?: PerformanceMetrics['type'], limit = 50): PerformanceMetrics[] {
    const filteredMetrics = type 
      ? this.metrics.filter(m => m.type === type)
      : this.metrics
    
    return filteredMetrics
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)
  }

  // Get performance insights
  getInsights(): Record<string, unknown> {
    const apiMetrics = this.getMetrics('api')
    const componentMetrics = this.getMetrics('component')
    const routeMetrics = this.getMetrics('route')

    return {
      api: {
        count: apiMetrics.length,
        averageDuration: apiMetrics.length > 0 
          ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length 
          : 0,
        slowestRequests: apiMetrics
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
          .map(m => ({ name: m.name, duration: m.duration })),
      },
      components: {
        count: componentMetrics.length,
        averageDuration: componentMetrics.length > 0
          ? componentMetrics.reduce((sum, m) => sum + m.duration, 0) / componentMetrics.length
          : 0,
        slowestComponents: componentMetrics
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
          .map(m => ({ name: m.name, duration: m.duration })),
      },
      routes: {
        count: routeMetrics.length,
        averageLoadTime: routeMetrics.length > 0
          ? routeMetrics.reduce((sum, m) => sum + m.duration, 0) / routeMetrics.length
          : 0,
      },
      memory: this.getMemoryInfo(),
    }
  }

  private getMemoryInfo(): Record<string, unknown> {
    try {
      const memory = (performance as any).memory
      if (memory) {
        return {
          usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024), // MB
        }
      }
    } catch (error) {
      // Memory API not available
    }
    return {}
  }

  // Export metrics for external analysis
  exportMetrics(): string {
    const insights = this.getInsights()
    const allMetrics = this.getMetrics(undefined, 1000)
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      buildInfo: {
        version: import.meta.env.__APP_VERSION__,
        buildTime: import.meta.env.__BUILD_TIME__,
        environment: import.meta.env.MODE,
      },
      insights,
      metrics: allMetrics,
    }, null, 2)
  }

  // Cleanup observers
  cleanup() {
    this.observers.forEach(observer => {
      try {
        observer.disconnect()
      } catch (error) {
        console.warn('Failed to disconnect performance observer:', error)
      }
    })
    this.observers = []
    this.metrics = []
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const endTimer = performanceMonitor.startTimer(`${componentName}_render`)
  
  return {
    markRender: () => {
      endTimer()
    },
    
    markInteraction: (interactionName: string) => {
      performanceMonitor.mark(`${componentName}_${interactionName}`)
    },
    
    measureInteraction: (interactionName: string, startMark?: string) => {
      const measureName = `${componentName}_${interactionName}_duration`
      const startMarkName = startMark || `${componentName}_${interactionName}`
      performanceMonitor.measure(measureName, startMarkName)
    }
  }
}

// Utility functions
export function measureAsync<T>(
  name: string,
  asyncFn: () => Promise<T>
): Promise<T> {
  const endTimer = performanceMonitor.startTimer(name)
  
  return asyncFn().finally(() => {
    endTimer()
  })
}

export function measureSync<T>(
  name: string,
  syncFn: () => T
): T {
  const endTimer = performanceMonitor.startTimer(name)
  
  try {
    return syncFn()
  } finally {
    endTimer()
  }
}