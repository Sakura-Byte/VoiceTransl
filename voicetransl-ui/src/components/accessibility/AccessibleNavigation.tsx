import { useRef, useCallback, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { 
  useRovingTabindex, 
  useScreenReader, 
  useAccessibilityPreferences 
} from '@/hooks/useAccessibility'
import { KeyboardKeys } from '@/utils/accessibility'

interface NavigationItem {
  id: string
  label: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
  ariaLabel?: string
}

interface AccessibleNavigationProps {
  items: NavigationItem[]
  className?: string
  vertical?: boolean
  label?: string
  onNavigate?: (item: NavigationItem) => void
}

export function AccessibleNavigation({
  items,
  className,
  vertical = false,
  label = "Main navigation",
  onNavigate
}: AccessibleNavigationProps) {
  const location = useLocation()
  const { announce } = useScreenReader()
  const preferences = useAccessibilityPreferences()
  const navRef = useRef<HTMLDivElement>(null)
  
  // Create refs for each navigation item
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  
  const { activeIndex, handleKeyDown } = useRovingTabindex(
    itemRefs.current.filter(Boolean) as HTMLElement[],
    0
  )

  const handleItemKeyDown = useCallback((e: React.KeyboardEvent, item: NavigationItem) => {
    switch (e.key) {
      case KeyboardKeys.ENTER:
      case KeyboardKeys.SPACE:
        e.preventDefault()
        if (!item.disabled) {
          onNavigate?.(item)
          announce(`Navigating to ${item.label}`)
        }
        break
      case KeyboardKeys.ARROW_DOWN:
      case KeyboardKeys.ARROW_UP:
        if (vertical) {
          handleKeyDown(e.nativeEvent)
        }
        break
      case KeyboardKeys.ARROW_LEFT:
      case KeyboardKeys.ARROW_RIGHT:
        if (!vertical) {
          handleKeyDown(e.nativeEvent)
        }
        break
      case KeyboardKeys.HOME:
      case KeyboardKeys.END:
        handleKeyDown(e.nativeEvent)
        break
    }
  }, [vertical, handleKeyDown, onNavigate, announce])

  const isCurrentPage = useCallback((href: string) => {
    return location.pathname === href
  }, [location.pathname])

  return (
    <nav
      ref={navRef}
      className={cn("focus-within:outline-none", className)}
      role="navigation"
      aria-label={label}
      id="navigation"
    >
      <ul
        className={cn(
          "flex",
          vertical ? "flex-col space-y-1" : "flex-row space-x-1"
        )}
        role="menubar"
        aria-orientation={vertical ? "vertical" : "horizontal"}
      >
        {items.map((item, index) => {
          const isCurrent = isCurrentPage(item.href)
          const isDisabled = item.disabled
          const tabIndex = activeIndex === index ? 0 : -1
          
          return (
            <li key={item.id} role="none">
              <Link
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                to={item.href}
                className={cn(
                  "group inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  preferences.reducedMotion && "transition-none",
                  isCurrent 
                    ? "bg-blue-100 text-blue-900 aria-current" 
                    : "text-gray-700 hover:text-gray-900 hover:bg-gray-50",
                  isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
                  vertical ? "w-full justify-start" : ""
                )}
                role="menuitem"
                aria-current={isCurrent ? "page" : undefined}
                aria-disabled={isDisabled}
                aria-label={item.ariaLabel || `${item.label}${isCurrent ? ' (current page)' : ''}`}
                tabIndex={isDisabled ? -1 : tabIndex}
                onKeyDown={(e) => handleItemKeyDown(e, item)}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault()
                    return
                  }
                  
                  onNavigate?.(item)
                  announce(`Navigated to ${item.label}`)
                }}
              >
                {item.icon && (
                  <item.icon 
                    className={cn(
                      "flex-shrink-0 w-5 h-5",
                      vertical ? "mr-3" : "mr-2",
                      isCurrent ? "text-blue-600" : "text-gray-400 group-hover:text-gray-500"
                    )}
                    aria-hidden="true"
                  />
                )}
                
                <span className={vertical ? "flex-1" : ""}>{item.label}</span>
                
                {item.badge && (
                  <span
                    className={cn(
                      "ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full",
                      isCurrent 
                        ? "bg-blue-200 text-blue-800" 
                        : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                    )}
                    aria-label={`${item.badge} items`}
                  >
                    {item.badge}
                  </span>
                )}
                
                {isCurrent && (
                  <span className="sr-only"> (current page)</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
      
      {/* Navigation instructions for screen readers */}
      <div className="sr-only" aria-live="polite">
        Use arrow keys to navigate between menu items. Press Enter or Space to activate.
      </div>
    </nav>
  )
}

// Accessible Mobile Navigation
interface AccessibleMobileNavigationProps {
  items: NavigationItem[]
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function AccessibleMobileNavigation({
  items,
  isOpen,
  onClose,
  className
}: AccessibleMobileNavigationProps) {
  const { announce } = useScreenReader()
  const preferences = useAccessibilityPreferences()
  const navRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLAnchorElement>(null)
  
  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && firstItemRef.current) {
      firstItemRef.current.focus()
      announce("Mobile navigation opened")
    } else if (!isOpen) {
      announce("Mobile navigation closed")
    }
  }, [isOpen, announce])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === KeyboardKeys.ESCAPE) {
      onClose()
    }
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile navigation"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      
      {/* Navigation Panel */}
      <nav
        ref={navRef}
        className={cn(
          "fixed top-0 left-0 bottom-0 flex flex-col w-full max-w-xs bg-white shadow-xl",
          preferences.reducedMotion ? "transform-none" : "animate-in slide-in-from-left duration-200",
          className
        )}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        
        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4">
          <AccessibleNavigation
            items={items}
            vertical={true}
            label="Mobile navigation menu"
            className="w-full"
            onNavigate={(item) => {
              announce(`Navigating to ${item.label}`)
              onClose()
            }}
          />
        </div>
      </nav>
    </div>
  )
}

// Breadcrumb Navigation with Accessibility
interface BreadcrumbItem {
  id: string
  label: string
  href?: string
  isCurrent?: boolean
}

interface AccessibleBreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: string
  className?: string
}

export function AccessibleBreadcrumb({
  items,
  separator = '/',
  className
}: AccessibleBreadcrumbProps) {
  return (
    <nav 
      className={cn("flex", className)} 
      aria-label="Breadcrumb"
      role="navigation"
    >
      <ol className="flex items-center space-x-2" role="list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isCurrent = item.isCurrent || isLast
          
          return (
            <li key={item.id} className="flex items-center" role="listitem">
              {item.href && !isCurrent ? (
                <Link
                  to={item.href}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:rounded"
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    "text-sm font-medium",
                    isCurrent ? "text-gray-900" : "text-gray-500"
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              
              {!isLast && (
                <span 
                  className="mx-2 text-gray-400 select-none" 
                  aria-hidden="true"
                >
                  {separator}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}