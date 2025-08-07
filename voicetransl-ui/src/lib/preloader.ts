// Route preloading utility for performance optimization
// This helps preload critical routes in the background

interface PreloadableRoute {
  path: string
  loader: () => Promise<any>
}

const routes: PreloadableRoute[] = [
  {
    path: '/tasks',
    loader: () => import('@/pages/TasksPage')
  },
  {
    path: '/settings/transcription',
    loader: () => import('@/pages/settings/TranscriptionSettingsPage')
  },
  {
    path: '/settings/translation',
    loader: () => import('@/pages/settings/TranslationSettingsPage')
  },
  {
    path: '/settings/server',
    loader: () => import('@/pages/settings/ServerSettingsPage')
  }
]

class RoutePreloader {
  private preloadedRoutes = new Set<string>()
  
  async preloadRoute(path: string): Promise<void> {
    if (this.preloadedRoutes.has(path)) {
      return
    }
    
    const route = routes.find(r => r.path === path)
    if (route) {
      try {
        await route.loader()
        this.preloadedRoutes.add(path)
      } catch (error) {
        console.warn(`Failed to preload route ${path}:`, error)
      }
    }
  }
  
  async preloadCriticalRoutes(): Promise<void> {
    // Preload most commonly used routes
    const criticalRoutes = ['/tasks', '/settings/transcription']
    
    // Preload after a short delay to not interfere with initial load
    setTimeout(async () => {
      for (const path of criticalRoutes) {
        await this.preloadRoute(path)
      }
    }, 2000)
  }
  
  preloadOnHover(path: string): void {
    // Preload when user hovers over navigation links
    this.preloadRoute(path)
  }
}

export const routePreloader = new RoutePreloader()

// Initialize critical route preloading
export const initializePreloader = () => {
  routePreloader.preloadCriticalRoutes()
}