import { useEffect, useRef, useState, useCallback } from 'react'
import {
  ScreenReaderAnnouncer,
  FocusManager,
  KeyboardKeys,
  handleArrowKeyNavigation,
  prefersReducedMotion,
  prefersHighContrast,
  generateId
} from '@/utils/accessibility'

// Screen Reader Hook
export function useScreenReader() {
  const announcer = useRef(ScreenReaderAnnouncer.getInstance())
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announcer.current.announce(message, priority)
  }, [])
  
  return { announce }
}

// Focus Management Hook
export function useFocusManagement() {
  const focusManager = useRef(new FocusManager())
  
  const trapFocus = useCallback((container: HTMLElement) => {
    return focusManager.current.trapFocus(container)
  }, [])
  
  const saveFocus = useCallback(() => {
    focusManager.current.saveFocus()
  }, [])
  
  const restoreFocus = useCallback(() => {
    focusManager.current.restoreFocus()
  }, [])
  
  return { trapFocus, saveFocus, restoreFocus }
}

// Keyboard Navigation Hook
export function useKeyboardNavigation(
  items: HTMLElement[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    wrap?: boolean
    onSelect?: (index: number) => void
  } = {}
) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const { orientation = 'both', wrap = true, onSelect } = options
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    handleArrowKeyNavigation(
      e,
      items,
      currentIndex,
      (index) => {
        setCurrentIndex(index)
        onSelect?.(index)
      },
      { orientation, wrap }
    )
  }, [items, currentIndex, orientation, wrap, onSelect])
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  return { currentIndex, setCurrentIndex }
}

// Unique ID Hook for ARIA
export function useId(prefix?: string): string {
  const [id] = useState(() => generateId(prefix))
  return id
}

// Accessibility Preferences Hook
export function useAccessibilityPreferences() {
  const [preferences, setPreferences] = useState({
    reducedMotion: prefersReducedMotion(),
    highContrast: prefersHighContrast(),
    largeText: false
  })
  
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastQuery = window.matchMedia('(prefers-contrast: high)')
    
    const updateMotion = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, reducedMotion: e.matches }))
    }
    
    const updateContrast = (e: MediaQueryListEvent) => {
      setPreferences(prev => ({ ...prev, highContrast: e.matches }))
    }
    
    motionQuery.addListener(updateMotion)
    contrastQuery.addListener(updateContrast)
    
    return () => {
      motionQuery.removeListener(updateMotion)
      contrastQuery.removeListener(updateContrast)
    }
  }, [])
  
  return preferences
}

// Live Region Hook
export function useLiveRegion(type: 'polite' | 'assertive' | 'off' = 'polite') {
  const ref = useRef<HTMLDivElement>(null)
  const [message, setMessage] = useState('')
  
  useEffect(() => {
    if (ref.current) {
      ref.current.setAttribute('aria-live', type)
      ref.current.setAttribute('aria-atomic', 'true')
      ref.current.style.position = 'absolute'
      ref.current.style.left = '-10000px'
      ref.current.style.width = '1px'
      ref.current.style.height = '1px'
      ref.current.style.overflow = 'hidden'
    }
  }, [type])
  
  const announce = useCallback((text: string) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 1000)
  }, [])
  
  return { ref, announce, message }
}

// Skip Navigation Hook
export function useSkipNavigation() {
  const skipRef = useRef<HTMLAnchorElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  
  const showSkipLink = useCallback(() => {
    setIsVisible(true)
  }, [])
  
  const hideSkipLink = useCallback(() => {
    setIsVisible(false)
  }, [])
  
  useEffect(() => {
    const skipElement = skipRef.current
    if (!skipElement) return
    
    const handleFocus = () => showSkipLink()
    const handleBlur = () => hideSkipLink()
    
    skipElement.addEventListener('focus', handleFocus)
    skipElement.addEventListener('blur', handleBlur)
    
    return () => {
      skipElement.removeEventListener('focus', handleFocus)
      skipElement.removeEventListener('blur', handleBlur)
    }
  }, [showSkipLink, hideSkipLink])
  
  return { skipRef, isVisible }
}

// Roving Tabindex Hook for Complex Widgets
export function useRovingTabindex<T extends HTMLElement>(
  items: T[],
  defaultIndex = 0
) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex)
  
  useEffect(() => {
    items.forEach((item, index) => {
      if (item) {
        item.tabIndex = index === activeIndex ? 0 : -1
        if (index === activeIndex) {
          item.setAttribute('aria-selected', 'true')
        } else {
          item.removeAttribute('aria-selected')
        }
      }
    })
  }, [items, activeIndex])
  
  const moveToIndex = useCallback((index: number) => {
    if (index >= 0 && index < items.length) {
      setActiveIndex(index)
      items[index]?.focus()
    }
  }, [items])
  
  const moveToNext = useCallback(() => {
    const nextIndex = (activeIndex + 1) % items.length
    moveToIndex(nextIndex)
  }, [activeIndex, items.length, moveToIndex])
  
  const moveToPrevious = useCallback(() => {
    const prevIndex = activeIndex === 0 ? items.length - 1 : activeIndex - 1
    moveToIndex(prevIndex)
  }, [activeIndex, items.length, moveToIndex])
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case KeyboardKeys.ARROW_RIGHT:
      case KeyboardKeys.ARROW_DOWN:
        e.preventDefault()
        moveToNext()
        break
      case KeyboardKeys.ARROW_LEFT:
      case KeyboardKeys.ARROW_UP:
        e.preventDefault()
        moveToPrevious()
        break
      case KeyboardKeys.HOME:
        e.preventDefault()
        moveToIndex(0)
        break
      case KeyboardKeys.END:
        e.preventDefault()
        moveToIndex(items.length - 1)
        break
    }
  }, [moveToNext, moveToPrevious, moveToIndex, items.length])
  
  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown
  }
}

// Accessible Modal Hook
export function useAccessibleModal(isOpen: boolean) {
  const modalRef = useRef<HTMLDivElement>(null)
  const { trapFocus, saveFocus, restoreFocus } = useFocusManagement()
  const { announce } = useScreenReader()
  const [isInitialized, setIsInitialized] = useState(false)
  
  useEffect(() => {
    if (isOpen && modalRef.current && !isInitialized) {
      saveFocus()
      const cleanup = trapFocus(modalRef.current)
      announce('Dialog opened')
      setIsInitialized(true)
      
      return () => {
        cleanup?.()
        restoreFocus()
        announce('Dialog closed')
        setIsInitialized(false)
      }
    } else if (!isOpen && isInitialized) {
      restoreFocus()
      announce('Dialog closed')
      setIsInitialized(false)
    }
  }, [isOpen, trapFocus, saveFocus, restoreFocus, announce, isInitialized])
  
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === KeyboardKeys.ESCAPE && isOpen) {
      e.preventDefault()
      // Let parent component handle closing
    }
  }, [isOpen])
  
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, handleEscapeKey])
  
  return { modalRef }
}

// Form Accessibility Hook
export function useAccessibleForm() {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { announce } = useScreenReader()
  
  const addError = useCallback((fieldId: string, error: string) => {
    setErrors(prev => ({ ...prev, [fieldId]: error }))
    announce(`Error in ${fieldId}: ${error}`, 'assertive')
  }, [announce])
  
  const removeError = useCallback((fieldId: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldId]
      return newErrors
    })
  }, [])
  
  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])
  
  const getFieldProps = useCallback((fieldId: string, label: string) => {
    const errorId = `${fieldId}-error`
    const hasError = !!errors[fieldId]
    
    return {
      id: fieldId,
      'aria-label': label,
      'aria-describedby': hasError ? errorId : undefined,
      'aria-invalid': hasError,
      'data-error': errors[fieldId] || undefined
    }
  }, [errors])
  
  return {
    errors,
    addError,
    removeError,
    clearErrors,
    getFieldProps,
    hasErrors: Object.keys(errors).length > 0
  }
}

// Touch and Gesture Accessibility Hook
export function useAccessibleTouch() {
  const preferences = useAccessibilityPreferences()
  
  const getTouchProps = useCallback(() => {
    return {
      // Ensure minimum touch target size
      style: {
        minWidth: '44px',
        minHeight: '44px'
      },
      // Disable animations if user prefers reduced motion
      className: preferences.reducedMotion ? 'no-animations' : ''
    }
  }, [preferences.reducedMotion])
  
  return { getTouchProps }
}

// Status and Progress Accessibility Hook
export function useAccessibleStatus() {
  const { announce } = useScreenReader()
  
  const announceStatus = useCallback((status: string, isImportant = false) => {
    announce(status, isImportant ? 'assertive' : 'polite')
  }, [announce])
  
  const announceProgress = useCallback((current: number, total: number, label = 'Progress') => {
    const percentage = Math.round((current / total) * 100)
    announce(`${label}: ${percentage}% complete`)
  }, [announce])
  
  const announceError = useCallback((error: string) => {
    announce(`Error: ${error}`, 'assertive')
  }, [announce])
  
  const announceSuccess = useCallback((message: string) => {
    announce(`Success: ${message}`)
  }, [announce])
  
  return {
    announceStatus,
    announceProgress,
    announceError,
    announceSuccess
  }
}