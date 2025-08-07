import { Bell, Search, User, Settings, Activity, LogOut, Wifi, WifiOff } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAppStore } from '@/stores/appStore'
import { useServerStatus } from '@/hooks/api'
import { useWebSocketIntegration } from '@/hooks/websocket'
import { cn } from '@/lib/utils'

// Server status indicator component
function ServerStatusBadge() {
  const { data: serverStatus, error, isLoading } = useServerStatus()
  
  if (isLoading) {
    return (
      <Badge variant="secondary" className="gap-2 px-3 py-1.5 rounded-xl font-medium transition-apple">
        <div className="w-2 h-2 rounded-full bg-neutral-400 animate-pulse" />
        <span className="text-body-sm">Connecting...</span>
      </Badge>
    )
  }
  
  if (error || !serverStatus) {
    return (
      <Badge variant="destructive" className="gap-2 px-3 py-1.5 rounded-xl font-medium transition-apple">
        <div className="w-2 h-2 rounded-full bg-error-500" />
        <span className="text-body-sm">Offline</span>
      </Badge>
    )
  }
  
  const isHealthy = serverStatus.healthy && serverStatus.status === 'running'
  
  return (
    <Badge 
      className={cn(
        'gap-2 px-3 py-1.5 rounded-xl font-medium transition-apple border-0',
        isHealthy 
          ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900 dark:text-success-300' 
          : 'bg-warning-100 text-warning-700 hover:bg-warning-200 dark:bg-warning-900 dark:text-warning-300'
      )}
    >
      <div 
        className={cn(
          'w-2 h-2 rounded-full animate-pulse',
          isHealthy ? 'bg-success-500' : 'bg-warning-500'
        )}
      />
      <span className="text-body-sm">
        {serverStatus.status === 'running' ? 'Online' : 'Starting...'}
      </span>
    </Badge>
  )
}

// WebSocket status indicator component
function WebSocketStatusBadge() {
  const webSocket = useWebSocketIntegration()
  
  if (webSocket.isConnecting) {
    return (
      <Badge variant="secondary" className="gap-2 px-3 py-1.5 rounded-xl font-medium transition-apple">
        <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
        <span className="text-body-sm">Connecting...</span>
      </Badge>
    )
  }
  
  if (!webSocket.isConnected) {
    return (
      <Badge className="gap-2 px-3 py-1.5 rounded-xl font-medium transition-apple border-0 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400">
        <WifiOff className="h-3 w-3 text-error-500" />
        <span className="text-body-sm">Offline</span>
      </Badge>
    )
  }
  
  return (
    <Badge className="gap-2 px-3 py-1.5 rounded-xl font-medium transition-apple border-0 bg-brand-100 text-brand-700 hover:bg-brand-200 dark:bg-brand-900 dark:text-brand-300">
      <Wifi className="h-3 w-3 text-brand-500" />
      <span className="text-body-sm">Live</span>
    </Badge>
  )
}

// Notification indicator
function NotificationButton() {
  const notifications = useAppStore((state) => state.notifications)
  const unreadCount = notifications.length // For now, treat all notifications as unread
  
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="relative h-9 w-9 p-0 rounded-xl hover:bg-surface-tertiary transition-colors-apple"
    >
      <Bell className="h-4 w-4 text-text-secondary" />
      {unreadCount > 0 && (
        <Badge className="absolute -right-1 -top-1 h-5 w-5 text-xs p-0 flex items-center justify-center border-2 border-surface-primary bg-error-500 text-white rounded-full shadow-apple-sm">
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
      <span className="sr-only">
        {unreadCount > 0 ? `${unreadCount} unread notifications` : 'No notifications'}
      </span>
    </Button>
  )
}

// Active tasks indicator
function ActiveTasksIndicator() {
  const activeTasks = useAppStore((state) => state.activeTasks)
  const activeTaskCount = Object.keys(activeTasks).length
  
  if (activeTaskCount === 0) return null
  
  return (
    <Link to="/tasks">
      <Badge className="gap-2 px-3 py-1.5 rounded-xl font-medium transition-apple border-0 bg-warning-100 text-warning-700 hover:bg-warning-200 dark:bg-warning-900 dark:text-warning-300 cursor-pointer">
        <Activity className="h-3 w-3 animate-pulse" />
        <span className="text-body-sm">{activeTaskCount} active task{activeTaskCount !== 1 ? 's' : ''}</span>
      </Badge>
    </Link>
  )
}

// User menu dropdown
function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-xl p-0 hover:bg-surface-tertiary transition-colors-apple">
          <Avatar className="h-8 w-8 shadow-apple-sm">
            <AvatarFallback className="bg-gradient-brand text-white text-sm font-semibold">
              VT
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 p-2 border-border-primary shadow-apple-lg bg-surface-elevated" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-2">
            <p className="text-body font-semibold text-text-primary">VoiceTransl Pro</p>
            <p className="text-body-sm text-text-tertiary">
              Local Instance • Premium
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border-secondary" />
        <DropdownMenuItem asChild className="rounded-lg p-3 cursor-pointer transition-colors-apple hover:bg-surface-secondary">
          <Link to="/profile">
            <User className="mr-3 h-4 w-4 text-text-tertiary" />
            <span className="text-body font-medium">Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg p-3 cursor-pointer transition-colors-apple hover:bg-surface-secondary">
          <Link to="/settings">
            <Settings className="mr-3 h-4 w-4 text-text-tertiary" />
            <span className="text-body font-medium">Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg p-3 cursor-pointer transition-colors-apple hover:bg-surface-secondary">
          <Link to="/logs">
            <Activity className="mr-3 h-4 w-4 text-text-tertiary" />
            <span className="text-body font-medium">Activity Log</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border-secondary" />
        <DropdownMenuItem className="rounded-lg p-3 cursor-pointer transition-colors-apple hover:bg-error-50 dark:hover:bg-error-950 text-error-600 dark:text-error-400">
          <LogOut className="mr-3 h-4 w-4" />
          <span className="text-body font-medium">Restart Application</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Main header component
export function AppHeader() {
  return (
    <header className="sticky top-0 z-fixed w-full border-b border-border-primary/50 bg-surface-overlay backdrop-blur-xl supports-[backdrop-filter]:bg-surface-overlay shadow-apple-sm">
      <div className="flex h-16 items-center gap-6 px-6">
        {/* Mobile sidebar trigger */}
        <SidebarTrigger className="-ml-1 transition-colors-apple hover:bg-surface-secondary" />
        <Separator orientation="vertical" className="h-6 bg-border-secondary" />
        
        {/* Left section - Premium status indicators */}
        <div className="flex items-center gap-3">
          <ServerStatusBadge />
          <WebSocketStatusBadge />
          <ActiveTasksIndicator />
        </div>
        
        {/* Center section - Premium search */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-brand transition-colors-apple" />
            <Input
              placeholder="Search tasks, files, settings..."
              className="pl-10 h-10 bg-surface-secondary border-border-secondary focus:border-brand-300 focus:ring-brand-200 transition-apple text-body font-medium"
            />
          </div>
        </div>
        
        {/* Right section - Premium controls */}
        <div className="flex items-center gap-1 ml-auto">
          {/* Search button for mobile */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 md:hidden rounded-xl hover:bg-surface-tertiary transition-colors-apple"
          >
            <Search className="h-4 w-4" />
            <span className="sr-only">Search</span>
          </Button>
          
          {/* Theme toggle */}
          <ThemeToggle variant="dropdown" size="sm" />
          
          {/* Notifications */}
          <NotificationButton />
          
          {/* User menu */}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}