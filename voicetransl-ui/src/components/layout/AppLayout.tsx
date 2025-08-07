import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { 
  SidebarProvider, 
  SidebarInset
} from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

interface AppLayoutProps {
  children?: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-surface-primary transition-colors-apple flex w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-y-auto w-full">
            {/* Full width container for responsive layout */}
            <div className="w-full py-8">
              <div className="min-h-[calc(100vh-8rem)]">
                {children || <Outlet />}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}