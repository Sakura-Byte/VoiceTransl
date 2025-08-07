import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'
type ActualTheme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  actualTheme: ActualTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'voicetransl-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme
    }
    return defaultTheme
  })

  const [actualTheme, setActualTheme] = useState<ActualTheme>('light')

  useEffect(() => {
    const root = window.document.documentElement
    
    const updateTheme = () => {
      root.classList.remove('light', 'dark')
      
      let resolvedTheme: ActualTheme
      if (theme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
          ? 'dark' 
          : 'light'
      } else {
        resolvedTheme = theme
      }
      
      root.classList.add(resolvedTheme)
      setActualTheme(resolvedTheme)
      
      // Update meta theme-color for mobile browsers
      const metaTheme = document.querySelector('meta[name="theme-color"]')
      if (metaTheme) {
        metaTheme.setAttribute('content', 
          resolvedTheme === 'dark' 
            ? getComputedStyle(root).getPropertyValue('--surface-primary').trim() || '#171717'
            : getComputedStyle(root).getPropertyValue('--surface-primary').trim() || '#ffffff'
        )
      }
    }

    updateTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const handleSetTheme = (newTheme: Theme) => {
    localStorage.setItem(storageKey, newTheme)
    setTheme(newTheme)
  }

  const toggleTheme = () => {
    if (theme === 'light') {
      handleSetTheme('dark')
    } else if (theme === 'dark') {
      handleSetTheme('system')
    } else {
      handleSetTheme('light')
    }
  }

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme: handleSetTheme,
    toggleTheme,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Premium theme transition hook
export const useThemeTransition = () => {
  const { actualTheme } = useTheme()
  
  useEffect(() => {
    const root = document.documentElement
    
    // Add smooth transition for theme changes
    root.style.setProperty('--theme-transition', 'color 200ms var(--ease-apple), background-color 200ms var(--ease-apple), border-color 200ms var(--ease-apple)')
    
    const cleanup = () => {
      root.style.removeProperty('--theme-transition')
    }
    
    const timer = setTimeout(cleanup, 300)
    return () => {
      clearTimeout(timer)
      cleanup()
    }
  }, [actualTheme])
  
  return actualTheme
}