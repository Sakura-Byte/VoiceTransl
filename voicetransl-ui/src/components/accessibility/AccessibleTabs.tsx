import React, { useState, useRef, useCallback, useEffect, createContext, useContext, type KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { useScreenReader, useAccessibilityPreferences, useId } from '@/hooks/useAccessibility'
import { KeyboardKeys } from '@/utils/accessibility'

interface TabItem {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
  badge?: string | number
  ariaLabel?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface TabsContextValue {
  activeTab: string
  setActiveTab: (tabId: string) => void
  orientation: 'horizontal' | 'vertical'
  tabsId: string
  registerTab: (tabId: string) => void
  unregisterTab: (tabId: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tab components must be used within AccessibleTabs')
  }
  return context
}

interface AccessibleTabsProps {
  defaultTab?: string
  activeTab?: string
  onTabChange?: (tabId: string) => void
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
  ariaLabel?: string
}

export function AccessibleTabs({
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  orientation = 'horizontal',
  className,
  children
}: AccessibleTabsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || '')
  const [registeredTabs, setRegisteredTabs] = useState<string[]>([])
  const { announce } = useScreenReader()
  const tabsId = useId('tabs')
  const isControlled = controlledActiveTab !== undefined
  const activeTab = isControlled ? controlledActiveTab : internalActiveTab

  const registerTab = useCallback((tabId: string) => {
    setRegisteredTabs(prev => {
      if (!prev.includes(tabId)) {
        const newTabs = [...prev, tabId]
        // Set first tab as active if no active tab is set
        if (!activeTab && tabId === newTabs[0]) {
          const newActiveTab = newTabs[0]
          if (!isControlled) {
            setInternalActiveTab(newActiveTab)
          }
          onTabChange?.(newActiveTab)
        }
        return newTabs
      }
      return prev
    })
  }, [activeTab, isControlled, onTabChange])

  const unregisterTab = useCallback((tabId: string) => {
    setRegisteredTabs(prev => prev.filter(id => id !== tabId))
  }, [])

  const setActiveTab = useCallback((tabId: string) => {
    if (!isControlled) {
      setInternalActiveTab(tabId)
    }
    onTabChange?.(tabId)
    
    // Announce tab change to screen readers
    const tabIndex = registeredTabs.indexOf(tabId) + 1
    announce(`Tab ${tabIndex} of ${registeredTabs.length} selected`)
  }, [isControlled, onTabChange, registeredTabs, announce])

  const contextValue: TabsContextValue = {
    activeTab,
    setActiveTab,
    orientation,
    tabsId,
    registerTab,
    unregisterTab
  }

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

// Tab List Component
interface TabListProps {
  className?: string
  children: React.ReactNode
}

export function TabList({ className, children }: TabListProps) {
  const { orientation } = useTabsContext()
  const tabListRef = useRef<HTMLDivElement>(null)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tabs = tabRefs.current.filter(Boolean) as HTMLButtonElement[]
    
    switch (e.key) {
      case KeyboardKeys.ARROW_RIGHT:
        if (orientation === 'horizontal') {
          e.preventDefault()
          const nextIndex = (focusedIndex + 1) % tabs.length
          setFocusedIndex(nextIndex)
          tabs[nextIndex]?.focus()
        }
        break
      case KeyboardKeys.ARROW_LEFT:
        if (orientation === 'horizontal') {
          e.preventDefault()
          const prevIndex = focusedIndex === 0 ? tabs.length - 1 : focusedIndex - 1
          setFocusedIndex(prevIndex)
          tabs[prevIndex]?.focus()
        }
        break
      case KeyboardKeys.ARROW_DOWN:
        if (orientation === 'vertical') {
          e.preventDefault()
          const nextIndex = (focusedIndex + 1) % tabs.length
          setFocusedIndex(nextIndex)
          tabs[nextIndex]?.focus()
        }
        break
      case KeyboardKeys.ARROW_UP:
        if (orientation === 'vertical') {
          e.preventDefault()
          const prevIndex = focusedIndex === 0 ? tabs.length - 1 : focusedIndex - 1
          setFocusedIndex(prevIndex)
          tabs[prevIndex]?.focus()
        }
        break
      case KeyboardKeys.HOME:
        e.preventDefault()
        setFocusedIndex(0)
        tabs[0]?.focus()
        break
      case KeyboardKeys.END:
        e.preventDefault()
        const lastIndex = tabs.length - 1
        setFocusedIndex(lastIndex)
        tabs[lastIndex]?.focus()
        break
    }
  }, [orientation, focusedIndex])

  return (
    <div
      ref={tabListRef}
      className={cn(
        "flex border-b border-gray-200",
        orientation === 'vertical' ? "flex-col border-b-0 border-r" : "flex-row",
        className
      )}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            ref: (el: HTMLButtonElement) => {
              tabRefs.current[index] = el
            },
            tabIndex: index === focusedIndex ? 0 : -1,
            onFocus: () => setFocusedIndex(index)
          })
        }
        return child
      })}
    </div>
  )
}

// Tab Component
interface TabProps {
  id: string
  disabled?: boolean
  className?: string
  children: React.ReactNode
  badge?: string | number
  icon?: React.ComponentType<{ className?: string }>
  ariaLabel?: string
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(
  ({ id, disabled = false, className, children, badge, icon: Icon, ariaLabel }, ref) => {
    const { activeTab, setActiveTab, tabsId, registerTab, unregisterTab, orientation } = useTabsContext()
    const preferences = useAccessibilityPreferences()
    const isActive = activeTab === id

    useEffect(() => {
      registerTab(id)
      return () => unregisterTab(id)
    }, [id, registerTab, unregisterTab])

    const handleClick = () => {
      if (!disabled) {
        setActiveTab(id)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === KeyboardKeys.ENTER || e.key === KeyboardKeys.SPACE) {
        e.preventDefault()
        if (!disabled) {
          setActiveTab(id)
        }
      }
    }

    return (
      <button
        ref={ref}
        id={`${tabsId}-tab-${id}`}
        className={cn(
          "relative px-4 py-2 font-medium text-sm transition-all duration-200",
          "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none",
          preferences.reducedMotion && "transition-none",
          orientation === 'vertical' ? "text-left w-full border-b border-gray-200" : "border-r border-gray-200 last:border-r-0",
          isActive
            ? "text-blue-600 bg-blue-50 border-b-2 border-blue-600"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        role="tab"
        aria-selected={isActive}
        aria-controls={`${tabsId}-panel-${id}`}
        aria-disabled={disabled}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
          <span>{children}</span>
          {badge && (
            <span
              className={cn(
                "inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full",
                isActive
                  ? "bg-blue-200 text-blue-800"
                  : "bg-gray-200 text-gray-700"
              )}
              aria-label={`${badge} items`}
            >
              {badge}
            </span>
          )}
        </div>
        
        {/* Active tab indicator */}
        {isActive && (
          <div
            className={cn(
              "absolute bg-blue-600",
              orientation === 'vertical'
                ? "right-0 top-0 bottom-0 w-0.5"
                : "bottom-0 left-0 right-0 h-0.5"
            )}
            aria-hidden="true"
          />
        )}
      </button>
    )
  }
)

Tab.displayName = 'Tab'

// Tab Panels Container
interface TabPanelsProps {
  className?: string
  children: React.ReactNode
}

export function TabPanels({ className, children }: TabPanelsProps) {
  return (
    <div className={cn("mt-4", className)}>
      {children}
    </div>
  )
}

// Tab Panel Component
interface TabPanelProps {
  id: string
  className?: string
  children: React.ReactNode
  lazy?: boolean
}

export function TabPanel({ id, className, children, lazy = false }: TabPanelProps) {
  const { activeTab, tabsId } = useTabsContext()
  const preferences = useAccessibilityPreferences()
  const isActive = activeTab === id
  const [hasBeenActive, setHasBeenActive] = useState(!lazy || isActive)

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true)
    }
  }, [isActive, hasBeenActive])

  // Don't render content for lazy panels that haven't been active yet
  if (lazy && !hasBeenActive) {
    return null
  }

  return (
    <div
      id={`${tabsId}-panel-${id}`}
      className={cn(
        "w-full", preferences.reducedMotion ? "" : "transition-opacity duration-200",
        isActive ? "opacity-100" : "opacity-0 hidden",
        className
      )}
      role="tabpanel"
      aria-labelledby={`${tabsId}-tab-${id}`}
      tabIndex={0}
      hidden={!isActive}
    >
      {children}
    </div>
  )
}

// Compound Component with Predefined Tabs
interface SimpleTabsProps {
  tabs: TabItem[]
  defaultTab?: string
  activeTab?: string
  onTabChange?: (tabId: string) => void
  orientation?: 'horizontal' | 'vertical'
  variant?: 'default' | 'pills' | 'underline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  lazy?: boolean
  ariaLabel?: string
}

export function SimpleTabs({
  tabs,
  defaultTab,
  activeTab,
  onTabChange,
  orientation = 'horizontal',
  variant = 'default',
  size = 'md',
  className,
  lazy = false,
  ariaLabel = "Tab navigation"
}: SimpleTabsProps) {
  return (
    <AccessibleTabs
      defaultTab={defaultTab || tabs[0]?.id}
      activeTab={activeTab}
      onTabChange={onTabChange}
      orientation={orientation}
      variant={variant}
      size={size}
      className={className}
      ariaLabel={ariaLabel}
    >
      <TabList>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            id={tab.id}
            disabled={tab.disabled}
            badge={tab.badge}
            icon={tab.icon}
            ariaLabel={tab.ariaLabel}
          >
            {tab.label}
          </Tab>
        ))}
      </TabList>
      
      <TabPanels>
        {tabs.map((tab) => (
          <TabPanel key={tab.id} id={tab.id} lazy={lazy}>
            {tab.content}
          </TabPanel>
        ))}
      </TabPanels>
    </AccessibleTabs>
  )
}

// Tab Keyboard Navigation Instructions
export function TabKeyboardInstructions({ className }: { className?: string }) {
  return (
    <div className={cn("sr-only", className)} role="region" aria-label="Keyboard navigation instructions">
      <p>Use left and right arrow keys to navigate between tabs. Press Enter or Space to activate a tab.</p>
    </div>
  )
}