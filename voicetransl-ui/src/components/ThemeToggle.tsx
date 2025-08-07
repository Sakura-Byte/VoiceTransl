import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useTheme } from './ThemeProvider'
import { cn } from '@/lib/utils'

const themeOptions = [
  {
    value: 'light' as const,
    label: 'Light',
    icon: Sun,
    description: 'Light theme'
  },
  {
    value: 'dark' as const,
    label: 'Dark', 
    icon: Moon,
    description: 'Dark theme'
  },
  {
    value: 'system' as const,
    label: 'System',
    icon: Monitor,
    description: 'Follow system preference'
  }
]

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown'
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function ThemeToggle({ 
  variant = 'dropdown', 
  size = 'default',
  className 
}: ThemeToggleProps) {
  const { theme, setTheme, toggleTheme } = useTheme()

  const currentThemeIcon = themeOptions.find(option => option.value === theme)?.icon || Sun
  const CurrentIcon = currentThemeIcon

  if (variant === 'button') {
    return (
      <Button
        variant="ghost"
        size={size}
        onClick={toggleTheme}
        className={cn(
          'rounded-xl transition-colors-apple hover:bg-surface-tertiary',
          size === 'sm' ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0',
          className
        )}
        title={`Current theme: ${theme}. Click to cycle through themes.`}
      >
        <CurrentIcon className={cn(
          'text-text-secondary transition-colors-apple',
          size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
        )} />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          className={cn(
            'rounded-xl transition-colors-apple hover:bg-surface-tertiary',
            size === 'sm' ? 'h-8 w-8 p-0' : 'h-9 w-9 p-0',
            className
          )}
        >
          <CurrentIcon className={cn(
            'text-text-secondary transition-colors-apple',
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
          )} />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 p-2 border-border-primary shadow-apple-lg bg-surface-elevated"
      >
        {themeOptions.map((option) => {
          const Icon = option.icon
          const isSelected = theme === option.value
          
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex items-center gap-3 rounded-lg p-3 cursor-pointer transition-colors-apple',
                isSelected 
                  ? 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300' 
                  : 'hover:bg-surface-secondary'
              )}
            >
              <Icon className={cn(
                'h-4 w-4',
                isSelected ? 'text-brand-600 dark:text-brand-400' : 'text-text-tertiary'
              )} />
              <div className="flex flex-col">
                <span className={cn(
                  'text-body font-medium',
                  isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-text-primary'
                )}>
                  {option.label}
                </span>
                <span className="text-body-sm text-text-tertiary">
                  {option.description}
                </span>
              </div>
              {isSelected && (
                <div className="ml-auto w-2 h-2 rounded-full bg-brand-500" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ThemeToggle