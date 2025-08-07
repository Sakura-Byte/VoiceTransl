import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  X,
  ChevronDown,
  Menu,
  Home,
  Activity,
  Settings,
  FileText,
  Search,
  Plus
} from 'lucide-react'

// Mobile Navigation Bottom Bar
interface MobileBottomNavProps {
  activeRoute: string
  onNavigate: (route: string) => void
}

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: Activity },
  { id: 'upload', label: 'Upload', icon: Plus, isPrimary: true },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'logs', label: 'Logs', icon: FileText }
]

export function MobileBottomNav({ activeRoute, onNavigate }: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = activeRoute === item.id
          const Icon = item.icon
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-2xl transition-all duration-300",
                "min-h-[48px] min-w-[48px]", // Touch target size
                item.isPrimary
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg scale-110"
                  : isActive
                  ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Icon className={cn(
                "transition-transform duration-200",
                item.isPrimary ? "w-6 h-6" : "w-5 h-5",
                isActive && !item.isPrimary && "scale-110"
              )} />
              <span className={cn(
                "text-xs font-medium",
                item.isPrimary ? "hidden" : "block"
              )}>
                {item.label}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

// Mobile Header with Menu
interface MobileHeaderProps {
  title: string
  subtitle?: string
  onMenuOpen: () => void
  actions?: React.ReactNode
}

export function MobileHeader({ title, subtitle, onMenuOpen, actions }: MobileHeaderProps) {
  return (
    <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 safe-area-pt">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onMenuOpen}
            className="h-10 w-10 p-0 rounded-xl"
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 ml-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// Mobile Slide Up Panel
interface MobileSlideUpPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  height?: 'half' | 'full' | 'auto'
}

export function MobileSlideUpPanel({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  height = 'auto' 
}: MobileSlideUpPanelProps) {
  const [startY, setStartY] = useState<number | null>(null)
  const [currentY, setCurrentY] = useState<number | null>(null)

  const heightClasses = {
    half: 'max-h-[50vh]',
    full: 'max-h-[90vh]',
    auto: 'max-h-[80vh]'
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null) return
    setCurrentY(e.touches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (startY === null || currentY === null) return
    
    const deltaY = currentY - startY
    if (deltaY > 100) { // Swipe down threshold
      onClose()
    }
    
    setStartY(null)
    setCurrentY(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl transform transition-transform duration-300",
        heightClasses[height],
        isOpen ? "translate-y-0" : "translate-y-full"
      )}>
        {/* Handle */}
        <div 
          className="flex justify-center py-3 cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-xl"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Mobile Card with Touch Optimization
interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onTap?: () => void
  isPressable?: boolean
}

export function MobileCard({ children, className, onTap, isPressable = false }: MobileCardProps) {
  const [isPressed, setIsPressed] = useState(false)

  return (
    <Card
      className={cn(
        "border-0 bg-white dark:bg-gray-900 shadow-lg transition-all duration-200",
        isPressable && "active:scale-[0.98] active:shadow-md",
        isPressed && "scale-[0.98] shadow-md",
        className
      )}
      onClick={onTap}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
    >
      {children}
    </Card>
  )
}

// Mobile-Optimized Button
interface MobileTouchButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
  disabled?: boolean
}

export function MobileTouchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  disabled = false
}: MobileTouchButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm min-h-[40px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  }

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg',
    secondary: 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
  }

  return (
    <button
      className={cn(
        "font-semibold rounded-2xl transition-all duration-200 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "w-full",
        isPressed && "scale-[0.96]",
        className
      )}
      onClick={onClick}
      onTouchStart={() => !disabled && setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      onTouchCancel={() => setIsPressed(false)}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

// Mobile Status Bar
export function MobileStatusBar() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 safe-area-pt">
      <p className="text-sm font-medium">No internet connection</p>
    </div>
  )
}

// Mobile-Optimized Search Bar
interface MobileSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onFocus?: () => void
  onBlur?: () => void
}

export function MobileSearch({ 
  value, 
  onChange, 
  placeholder = "Search...",
  onFocus,
  onBlur 
}: MobileSearchProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={onFocus}
        onBlur={onBlur}
        className="w-full h-12 pl-12 pr-4 bg-gray-100 dark:bg-gray-800 border-0 rounded-2xl text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 transition-all duration-200"
      />
    </div>
  )
}

// Mobile Pull to Refresh
interface MobilePullToRefreshProps {
  children: React.ReactNode
  onRefresh: () => Promise<void>
}

export function MobilePullToRefresh({ children, onRefresh }: MobilePullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [startY, setStartY] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === null || window.scrollY > 0) return
    
    const currentY = e.touches[0].clientY
    const distance = Math.max(0, currentY - startY)
    setPullDistance(Math.min(distance, 100))
  }

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    
    setPullDistance(0)
    setStartY(null)
  }

  return (
    <div 
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950 z-10 transition-all duration-200"
          style={{ 
            height: `${pullDistance}px`,
            transform: `translateY(-${100 - pullDistance}%)`
          }}
        >
          <div className={cn(
            "flex items-center gap-2 text-blue-600 dark:text-blue-400 transition-opacity duration-200",
            pullDistance > 60 ? "opacity-100" : "opacity-50"
          )}>
            <ChevronDown className={cn(
              "w-5 h-5 transition-transform duration-200",
              pullDistance > 60 && "rotate-180"
            )} />
            <span className="text-sm font-medium">
              {pullDistance > 60 ? "Release to refresh" : "Pull to refresh"}
            </span>
          </div>
        </div>
      )}
      
      {/* Loading indicator */}
      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-center bg-blue-50 dark:bg-blue-950 z-10">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Refreshing...</span>
          </div>
        </div>
      )}
      
      <div style={{ paddingTop: isRefreshing ? '64px' : '0px' }}>
        {children}
      </div>
    </div>
  )
}