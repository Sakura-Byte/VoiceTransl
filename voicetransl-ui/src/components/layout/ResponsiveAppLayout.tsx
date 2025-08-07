import type { ReactNode } from 'react'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { 
  SidebarProvider, 
  SidebarInset
} from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { 
  MobileBottomNav, 
  MobileHeader, 
  MobileStatusBar,
  MobileSlideUpPanel
} from '@/components/mobile/MobileComponents'
import { useIsMobile, useSafeArea } from '@/hooks/useMobile'
import { AccessibilityProvider } from '@/components/accessibility'
import { Button } from '@/components/ui/button'
import { Search, Bell, User } from 'lucide-react'

interface AppLayoutProps {
  children?: ReactNode
}

export function ResponsiveAppLayout({ children }: AppLayoutProps) {
  const { isMobile } = useIsMobile()
  const location = useLocation()
  const navigate = useNavigate()
  const safeArea = useSafeArea()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Extract current route for mobile navigation
  const getCurrentRoute = () => {
    const path = location.pathname
    if (path === '/') return 'dashboard'
    if (path.startsWith('/tasks')) return 'tasks'
    if (path.startsWith('/settings')) return 'settings'
    if (path.startsWith('/logs')) return 'logs'
    return 'dashboard'
  }

  const handleMobileNavigation = (route: string) => {
    if (route === 'upload') {
      // Handle upload action
      console.log('Upload clicked')
      return
    }
    
    const routes = {
      dashboard: '/',
      tasks: '/tasks',
      settings: '/settings',
      logs: '/logs'
    }
    
    navigate(routes[route as keyof typeof routes] || '/')
  }

  const getPageTitle = () => {
    const route = getCurrentRoute()
    const titles = {
      dashboard: 'VoiceTransl',
      tasks: 'Tasks',
      settings: 'Settings',
      logs: 'Logs'
    }
    return titles[route as keyof typeof titles] || 'VoiceTransl'
  }

  const getPageSubtitle = () => {
    const route = getCurrentRoute()
    const subtitles = {
      dashboard: 'AI Translation Suite',
      tasks: 'Processing Queue',
      settings: 'Configuration',
      logs: 'System Activity'
    }
    return subtitles[route as keyof typeof subtitles]
  }

  if (isMobile) {
    return (
      <AccessibilityProvider>
        <div 
          className="min-h-screen bg-gray-50 dark:bg-gray-900"
          style={{
            paddingTop: `${safeArea.top}px`,
            paddingBottom: `${safeArea.bottom + 80}px`, // 80px for bottom nav
            paddingLeft: `${safeArea.left}px`,
            paddingRight: `${safeArea.right}px`
          }}
        >
          <MobileStatusBar />
          
          <header role="banner">
            <MobileHeader
              title={getPageTitle()}
              subtitle={getPageSubtitle()}
              onMenuOpen={() => setIsMobileMenuOpen(true)}
              actions={
                <div className="flex items-center gap-2" role="toolbar" aria-label="Header actions">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 p-0"
                    aria-label="Search"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-9 w-9 p-0"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                </div>
              }
            />
          </header>

          <main 
            id="main-content"
            role="main" 
            className="flex-1 overflow-y-auto"
            aria-label={`${getPageTitle()} content`}
            tabIndex={-1}
          >
            <div className="px-4 py-6">
              {children || <Outlet />}
            </div>
          </main>

          <nav role="navigation" aria-label="Bottom navigation">
            <MobileBottomNav
              activeRoute={getCurrentRoute()}
              onNavigate={handleMobileNavigation}
            />
          </nav>

          <MobileSlideUpPanel
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            title="Menu"
          >
            <div className="space-y-4">
              <div 
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-2xl"
                role="region"
                aria-label="User profile"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Local User</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Premium Account</p>
                </div>
              </div>

              <nav role="navigation" aria-label="Mobile menu">
                <div className="space-y-2">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
                    { id: 'tasks', label: 'Tasks', icon: '⚡' },
                    { id: 'settings', label: 'Settings', icon: '⚙️' },
                    { id: 'logs', label: 'Logs', icon: '📋' },
                    { id: 'help', label: 'Help & Support', icon: '❓' },
                    { id: 'about', label: 'About', icon: 'ℹ️' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleMobileNavigation(item.id)
                        setIsMobileMenuOpen(false)
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label={`Navigate to ${item.label}`}
                    >
                      <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                    </button>
                  ))}
                </div>
              </nav>
            </div>
          </MobileSlideUpPanel>
        </div>
      </AccessibilityProvider>
    )
  }

  // Desktop layout
  return (
    <AccessibilityProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-surface-primary transition-colors-apple">
          <aside role="complementary" aria-label="Sidebar navigation">
            <AppSidebar />
          </aside>
          
          <SidebarInset className="flex-1 flex flex-col min-w-0">
            <header role="banner">
              <AppHeader />
            </header>
            
            <main 
              id="main-content"
              role="main" 
              className="flex-1 overflow-y-auto min-w-0"
              aria-label={`${getPageTitle()} content`}
              tabIndex={-1}
            >
              <div className="w-full h-full py-8 transition-all duration-300 ease-in-out">
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 min-h-0 w-full">
                    {children || <Outlet />}
                  </div>
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AccessibilityProvider>
  )
}

// Keep the original AppLayout for backwards compatibility
export function AppLayout({ children }: AppLayoutProps) {
  return <ResponsiveAppLayout>{children}</ResponsiveAppLayout>
}