// Performance monitoring and optimization utilities

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  routeChangeTime: number
  bundleSize: number
}

class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {}
  private startTime: number = performance.now()

  // Measure initial load time
  measureLoadTime(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        this.metrics.loadTime = performance.now() - this.startTime
        this.logMetrics('Initial Load')
      })
    }
  }

  // Measure route change performance
  measureRouteChange(routeName: string): void {
    const startTime = performance.now()
    
    // Use requestIdleCallback or setTimeout as fallback
    const callback = () => {
      this.metrics.routeChangeTime = performance.now() - startTime
      this.logMetrics(`Route Change: ${routeName}`)
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback)
    } else {
      setTimeout(callback, 0)
    }
  }

  // Measure component render time
  measureRender(componentName: string, renderFn: () => void): void {
    const startTime = performance.now()
    renderFn()
    this.metrics.renderTime = performance.now() - startTime
    this.logMetrics(`Render: ${componentName}`)
  }

  private logMetrics(operation: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Performance [${operation}]:`, {
        ...this.metrics,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Get performance navigation timing
  getNavigationTiming(): Record<string, number> | null {
    if (typeof window === 'undefined' || !window.performance.timing) {
      return null
    }

    const timing = window.performance.timing
    return {
      DNS: timing.domainLookupEnd - timing.domainLookupStart,
      Connection: timing.connectEnd - timing.connectStart,
      Request: timing.responseStart - timing.requestStart,
      Response: timing.responseEnd - timing.responseStart,
      DOM: timing.domContentLoadedEventEnd - timing.domLoading,
      Load: timing.loadEventEnd - timing.loadEventStart,
      Total: timing.loadEventEnd - timing.navigationStart
    }
  }

  // Report core web vitals
  reportWebVitals(): void {
    if (typeof window === 'undefined') return

    // First Contentful Paint
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          console.log('🎨 First Contentful Paint:', entry.startTime, 'ms')
        }
      }
    }).observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      console.log('📏 Largest Contentful Paint:', lastEntry.startTime, 'ms')
    }).observe({ entryTypes: ['largest-contentful-paint'] })

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsValue = 0
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }
      console.log('📐 Cumulative Layout Shift:', clsValue)
    }).observe({ entryTypes: ['layout-shift'] })
  }
}

// Memory usage monitoring
export const getMemoryUsage = (): Record<string, number> | null => {
  if (typeof window === 'undefined' || !(performance as any).memory) {
    return null
  }

  const memory = (performance as any).memory
  return {
    used: Math.round(memory.usedJSHeapSize / 1048576), // MB
    total: Math.round(memory.totalJSHeapSize / 1048576), // MB
    limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
  }
}

// Bundle size estimation (approximate)
export const estimateBundleSize = (): Promise<number> => {
  return new Promise((resolve) => {
    // Estimate based on script tags
    const scripts = document.querySelectorAll('script[src]')
    let totalSize = 0

    scripts.forEach((script) => {
      const src = (script as HTMLScriptElement).src
      if (src && src.includes('/assets/')) {
        // Rough estimation based on typical compression ratios
        totalSize += 50000 // Approximate 50KB per chunk
      }
    })

    resolve(totalSize)
  })
}

// Image optimization helper
export const optimizeImage = (
  src: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: 'webp' | 'avif' | 'jpg' | 'png'
  } = {}
): string => {
  const { width, height, quality = 80, format = 'webp' } = options
  
  // In a real implementation, this would use a service like Cloudinary or similar
  // For now, return the original src with potential query parameters
  const params = new URLSearchParams()
  if (width) params.set('w', width.toString())
  if (height) params.set('h', height.toString())
  if (quality !== 80) params.set('q', quality.toString())
  if (format !== 'webp') params.set('f', format)
  
  return params.toString() ? `${src}?${params.toString()}` : src
}

// Create performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Initialize performance monitoring
export const initializePerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    performanceMonitor.measureLoadTime()
    performanceMonitor.reportWebVitals()
    
    // Log navigation timing after load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performanceMonitor.getNavigationTiming()
        if (timing) {
          console.log('⏱️  Navigation Timing:', timing)
        }
        
        const memory = getMemoryUsage()
        if (memory) {
          console.log('🧠 Memory Usage:', memory)
        }
      }, 1000)
    })
  }
}