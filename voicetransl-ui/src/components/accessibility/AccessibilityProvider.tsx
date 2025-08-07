import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSkipNavigation, useLiveRegion, useAccessibilityPreferences, useAccessibleModal } from '@/hooks/useAccessibility'

interface AccessibilityProviderProps {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const { skipRef, isVisible } = useSkipNavigation()
  const { ref: liveRegionRef, message } = useLiveRegion('polite')
  const preferences = useAccessibilityPreferences()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Apply accessibility preferences to document
    const root = document.documentElement
    
    if (preferences.reducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
    
    if (preferences.highContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
  }, [preferences])

  if (!isClient) return <>{children}</>

  return (
    <>
      {/* Skip Navigation Links */}
      <div className="sr-only-focusable">
        <a
          ref={skipRef}
          href="#main-content"
          className={cn(
            "fixed top-4 left-4 z-[9999] px-4 py-2 bg-blue-600 text-white rounded-lg font-medium",
            "transform -translate-y-full transition-transform duration-200",
            "focus:translate-y-0",
            isVisible && "translate-y-0"
          )}
          onClick={(e) => {
            e.preventDefault()
            const mainContent = document.getElementById('main-content')
            if (mainContent) {
              mainContent.focus()
              mainContent.scrollIntoView()
            }
          }}
        >
          Skip to main content
        </a>
        
        <a
          href="#navigation"
          className="fixed top-4 left-32 z-[9999] px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transform -translate-y-full transition-transform duration-200 focus:translate-y-0"
          onClick={(e) => {
            e.preventDefault()
            const navigation = document.getElementById('navigation')
            if (navigation) {
              navigation.focus()
              navigation.scrollIntoView()
            }
          }}
        >
          Skip to navigation
        </a>
      </div>

      {/* Live Region for Screen Reader Announcements */}
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true">
        {message}
      </div>

      {/* Main Application */}
      <div className="accessibility-app">
        {children}
      </div>

      {/* Global Accessibility Styles */}
      <style>{`
        /* Screen Reader Only Content */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .sr-only-focusable:focus,
        .sr-only-focusable:active {
          position: static;
          width: auto;
          height: auto;
          padding: inherit;
          margin: inherit;
          overflow: visible;
          clip: auto;
          white-space: inherit;
        }

        /* Reduced Motion Preferences */
        .reduce-motion *,
        .reduce-motion *::before,
        .reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }

        /* High Contrast Mode */
        .high-contrast {
          filter: contrast(150%);
        }

        .high-contrast * {
          text-shadow: none !important;
          box-shadow: none !important;
        }

        /* Focus Indicators */
        .focus-visible {
          outline: 2px solid rgb(59, 130, 246);
          outline-offset: 2px;
          border-radius: 4px;
        }

        /* Touch Target Sizing */
        @media (hover: none) and (pointer: coarse) {
          button,
          a,
          input,
          select,
          textarea,
          [role="button"],
          [tabindex] {
            min-height: 44px;
            min-width: 44px;
          }
        }

        /* Text Scaling Support */
        @media (min-resolution: 1dppx) {
          html {
            font-size: 16px;
          }
        }

        /* Support for Windows High Contrast Mode */
        @media (prefers-contrast: high) {
          .accessibility-app {
            forced-color-adjust: none;
          }
        }

        /* Focus trap styles */
        .focus-trap-active {
          isolation: isolate;
        }

        /* Keyboard navigation indicators */
        .keyboard-navigation-active *:focus {
          outline: 2px solid rgb(59, 130, 246);
          outline-offset: 2px;
        }

        /* Error states for accessibility */
        [aria-invalid="true"] {
          border-color: rgb(239, 68, 68) !important;
        }

        /* Loading states for accessibility */
        [aria-busy="true"] {
          cursor: wait;
        }

        /* Disabled state styling */
        [aria-disabled="true"] {
          opacity: 0.6;
          cursor: not-allowed;
          pointer-events: none;
        }
      `}</style>
    </>
  )
}

// Enhanced Button Component with Full Accessibility
interface AccessibleButtonProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  id?: string
  autoFocus?: boolean
}

export function AccessibleButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  type = 'button',
  className,
  ariaLabel,
  ariaDescribedBy,
  id,
  autoFocus = false
}: AccessibleButtonProps) {
  const preferences = useAccessibilityPreferences()

  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
  
  const variantClasses = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white focus-visible:ring-blue-500",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-900 focus-visible:ring-gray-500",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-700 focus-visible:ring-gray-500",
    destructive: "bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-500"
  }
  
  const sizeClasses = {
    sm: "px-3 py-2 text-sm min-h-[40px]",
    md: "px-4 py-2 text-base min-h-[44px]",
    lg: "px-6 py-3 text-lg min-h-[48px]"
  }

  const animationClass = preferences.reducedMotion ? 'transition-none' : 'transition-all duration-200'

  return (
    <button
      id={id}
      type={type}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        animationClass,
        disabled && "opacity-50 cursor-not-allowed",
        loading && "cursor-wait",
        className
      )}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled}
      aria-busy={loading}
      autoFocus={autoFocus}
    >
      {loading && (
        <span className="mr-2" aria-hidden="true">
          <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
        </span>
      )}
      {children}
      {loading && <span className="sr-only">Loading</span>}
    </button>
  )
}

// Enhanced Modal Component with Full Accessibility
interface AccessibleModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className,
  closeOnOverlayClick = true,
  closeOnEscape = true
}: AccessibleModalProps) {
  const { modalRef } = useAccessibleModal(isOpen)
  const preferences = useAccessibilityPreferences()
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, onClose, closeOnEscape])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  }

  const animationClass = preferences.reducedMotion 
    ? 'opacity-100 scale-100' 
    : 'animate-in fade-in-0 zoom-in-95 duration-200'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* Modal Content */}
      <div
        ref={modalRef}
        className={cn(
          "relative bg-white rounded-xl shadow-2xl mx-4 w-full",
          sizeClasses[size],
          animationClass,
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          <AccessibleButton
            variant="ghost"
            size="sm"
            onClick={onClose}
            ariaLabel="Close dialog"
            className="h-8 w-8 p-0"
          >
            <span aria-hidden="true">×</span>
          </AccessibleButton>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

// Enhanced Form Input with Accessibility
interface AccessibleInputProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helpText?: string
  className?: string
}

export function AccessibleInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error,
  helpText,
  className
}: AccessibleInputProps) {
  const errorId = `${id}-error`
  const helpId = `${id}-help`
  const hasError = !!error
  
  return (
    <div className="space-y-2">
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={cn(
          error && errorId,
          helpText && helpId
        )}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          hasError && "border-red-500 focus:ring-red-500",
          disabled && "opacity-50 cursor-not-allowed bg-gray-50",
          className
        )}
      />
      
      {helpText && (
        <p id={helpId} className="text-sm text-gray-600">
          {helpText}
        </p>
      )}
      
      {error && (
        <p 
          id={errorId} 
          className="text-sm text-red-600" 
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}