/**
 * Premium Accessibility Utilities
 * WCAG 2.1 AA compliance helpers and premium accessibility features
 */

// Screen Reader Announcements
export class ScreenReaderAnnouncer {
  private static instance: ScreenReaderAnnouncer
  private announceElement: HTMLElement
  
  private constructor() {
    this.announceElement = this.createAnnounceElement()
  }
  
  static getInstance(): ScreenReaderAnnouncer {
    if (!ScreenReaderAnnouncer.instance) {
      ScreenReaderAnnouncer.instance = new ScreenReaderAnnouncer()
    }
    return ScreenReaderAnnouncer.instance
  }
  
  private createAnnounceElement(): HTMLElement {
    const element = document.createElement('div')
    element.setAttribute('aria-live', 'polite')
    element.setAttribute('aria-atomic', 'true')
    element.style.position = 'absolute'
    element.style.left = '-10000px'
    element.style.width = '1px'
    element.style.height = '1px'
    element.style.overflow = 'hidden'
    document.body.appendChild(element)
    return element
  }
  
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    this.announceElement.setAttribute('aria-live', priority)
    this.announceElement.textContent = message
    
    // Clear after announcement to ensure it can be repeated
    setTimeout(() => {
      this.announceElement.textContent = ''
    }, 1000)
  }
}

// Focus Management
export class FocusManager {
  private focusStack: HTMLElement[] = []
  
  trapFocus(container: HTMLElement) {
    const focusableElements = this.getFocusableElements(container)
    if (focusableElements.length === 0) return
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
    
    container.addEventListener('keydown', handleKeyDown)
    firstElement.focus()
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }
  
  saveFocus() {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement) {
      this.focusStack.push(activeElement)
    }
  }
  
  restoreFocus() {
    const lastFocused = this.focusStack.pop()
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus()
    }
  }
  
  private getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      'a[href]:not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([disabled]):not([aria-hidden="true"])'
    ]
    
    return Array.from(
      container.querySelectorAll<HTMLElement>(selectors.join(', '))
    ).filter(element => {
      return element.offsetWidth > 0 && element.offsetHeight > 0
    })
  }
}

// Keyboard Navigation Helpers
export const KeyboardKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab'
} as const

export type KeyboardKey = typeof KeyboardKeys[keyof typeof KeyboardKeys]

export function handleArrowKeyNavigation(
  e: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void,
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both'
    wrap?: boolean
  } = {}
) {
  const { orientation = 'both', wrap = true } = options
  
  let nextIndex = currentIndex
  
  switch (e.key) {
    case KeyboardKeys.ARROW_UP:
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault()
        nextIndex = currentIndex - 1
      }
      break
    case KeyboardKeys.ARROW_DOWN:
      if (orientation === 'vertical' || orientation === 'both') {
        e.preventDefault()
        nextIndex = currentIndex + 1
      }
      break
    case KeyboardKeys.ARROW_LEFT:
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault()
        nextIndex = currentIndex - 1
      }
      break
    case KeyboardKeys.ARROW_RIGHT:
      if (orientation === 'horizontal' || orientation === 'both') {
        e.preventDefault()
        nextIndex = currentIndex + 1
      }
      break
    case KeyboardKeys.HOME:
      e.preventDefault()
      nextIndex = 0
      break
    case KeyboardKeys.END:
      e.preventDefault()
      nextIndex = items.length - 1
      break
  }
  
  // Handle wrapping
  if (wrap) {
    if (nextIndex < 0) nextIndex = items.length - 1
    if (nextIndex >= items.length) nextIndex = 0
  } else {
    nextIndex = Math.max(0, Math.min(nextIndex, items.length - 1))
  }
  
  if (nextIndex !== currentIndex) {
    onSelect(nextIndex)
    items[nextIndex]?.focus()
  }
}

// Color Contrast Utilities
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (color: string): number => {
    // Convert color to RGB
    const rgb = hexToRgb(color)
    if (!rgb) return 0
    
    // Calculate relative luminance
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(channel => {
      const normalized = channel / 255
      return normalized <= 0.03928 
        ? normalized / 12.92 
        : Math.pow((normalized + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  
  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  
  return (lighter + 0.05) / (darker + 0.05)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// Motion Preferences
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function respectMotionPreference(animations: {
  normal: string
  reduced: string
}): string {
  return prefersReducedMotion() ? animations.reduced : animations.normal
}

// High Contrast Mode Detection
export function prefersHighContrast(): boolean {
  return window.matchMedia('(prefers-contrast: high)').matches
}

// Text Scaling Support
export function supportsTextZoom(): boolean {
  // Check if browser supports text zoom properly
  const testElement = document.createElement('div')
  testElement.style.fontSize = '1rem'
  testElement.style.position = 'absolute'
  testElement.style.visibility = 'hidden'
  document.body.appendChild(testElement)
  
  const baseSize = parseFloat(getComputedStyle(testElement).fontSize)
  document.body.removeChild(testElement)
  
  return baseSize >= 16 // Standard base font size
}

// Custom Hooks for Accessibility
export function useScreenReader() {
  const announcer = ScreenReaderAnnouncer.getInstance()
  
  return {
    announce: (message: string, priority?: 'polite' | 'assertive') => {
      announcer.announce(message, priority)
    }
  }
}

export function useFocusManagement() {
  const focusManager = new FocusManager()
  
  return {
    trapFocus: (container: HTMLElement) => focusManager.trapFocus(container),
    saveFocus: () => focusManager.saveFocus(),
    restoreFocus: () => focusManager.restoreFocus()
  }
}

// ARIA Utilities
export const AriaRoles = {
  BUTTON: 'button',
  DIALOG: 'dialog',
  MENU: 'menu',
  MENUITEM: 'menuitem',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist',
  REGION: 'region',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  BANNER: 'banner',
  CONTENTINFO: 'contentinfo',
  COMPLEMENTARY: 'complementary'
} as const

export function generateId(prefix: string = 'element'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

// Live Region Types
export const LiveRegionTypes = {
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
  OFF: 'off'
} as const

// Accessibility Testing Utilities
export function checkAccessibility(element: HTMLElement): {
  issues: string[]
  warnings: string[]
  score: number
} {
  const issues: string[] = []
  const warnings: string[] = []
  
  // Check for missing alt text on images
  const images = element.querySelectorAll('img')
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push('Image missing alt text or aria-label')
    }
  })
  
  // Check for missing labels on form elements
  const formElements = element.querySelectorAll('input, select, textarea')
  formElements.forEach(input => {
    const hasLabel = input.id && element.querySelector(`label[for="${input.id}"]`)
    const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby')
    
    if (!hasLabel && !hasAriaLabel) {
      issues.push('Form element missing label')
    }
  })
  
  // Check for keyboard accessibility
  const interactiveElements = element.querySelectorAll('button, a, input, select, textarea, [tabindex]')
  interactiveElements.forEach(el => {
    const tabIndex = el.getAttribute('tabindex')
    if (tabIndex === '-1' && el.tagName !== 'DIV') {
      warnings.push('Interactive element has tabindex="-1"')
    }
  })
  
  // Calculate basic accessibility score
  const totalChecks = images.length + formElements.length + interactiveElements.length
  const totalIssues = issues.length + warnings.length * 0.5
  const score = totalChecks > 0 ? Math.max(0, ((totalChecks - totalIssues) / totalChecks) * 100) : 100
  
  return { issues, warnings, score }
}