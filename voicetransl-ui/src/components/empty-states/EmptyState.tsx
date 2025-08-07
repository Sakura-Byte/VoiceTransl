import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  FileX,
  Search,
  Inbox,
  Settings,
  Wifi,
  AlertCircle,
  Play,
  RefreshCw,
  FolderOpen,
  Clock,
  CheckCircle2,
  Zap,
  Globe,
  Heart,
  Star,
  Sparkles
} from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'ghost'
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  className?: string
  variant?: 'default' | 'minimal' | 'illustration' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: {
    container: 'p-6',
    icon: 'w-12 h-12',
    title: 'text-lg',
    description: 'text-sm'
  },
  md: {
    container: 'p-8',
    icon: 'w-16 h-16',
    title: 'text-xl',
    description: 'text-base'
  },
  lg: {
    container: 'p-12',
    icon: 'w-20 h-20',
    title: 'text-2xl',
    description: 'text-lg'
  }
}

export function EmptyState({
  icon: Icon = FileX,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
  size = 'md'
}: EmptyStateProps) {
  const sizeStyle = sizeClasses[size]

  return (
    <Card className={cn(
      "border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl",
      sizeStyle.container,
      className
    )}>
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Premium Icon with Animation */}
        <div className="relative">
          {variant === 'gradient' && (
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-full blur-2xl scale-150 animate-pulse-premium"></div>
          )}
          <div className={cn(
            "flex items-center justify-center rounded-full transition-all duration-500",
            sizeStyle.icon,
            variant === 'gradient' 
              ? "bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-2xl animate-glow"
              : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:scale-110 transition-transform-apple"
          )}>
            <Icon className={cn(
              "transition-all duration-300",
              size === 'sm' ? 'w-6 h-6' : size === 'md' ? 'w-8 h-8' : 'w-10 h-10'
            )} />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 max-w-md">
          <h3 className={cn(
            "font-bold text-gray-900 dark:text-gray-100 tracking-tight",
            sizeStyle.title
          )}>
            {title}
          </h3>
          {description && (
            <p className={cn(
              "text-gray-600 dark:text-gray-400 leading-relaxed font-medium",
              sizeStyle.description
            )}>
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            {action && (
              <Button
                onClick={action.onClick}
                variant={action.variant || 'default'}
                size={size === 'lg' ? 'lg' : 'default'}
                className={cn(
                  "transition-all-apple font-semibold",
                  action.variant === 'default' && "bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 shadow-lg hover:shadow-xl"
                )}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant="ghost"
                size={size === 'lg' ? 'lg' : 'default'}
                className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors-apple"
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// Specific Empty State Components
export function NoTasksEmpty({ onCreateTask }: { onCreateTask?: () => void }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No Tasks Yet"
      description="Start processing your first audio or video file to see tasks appear here."
      action={{
        label: 'Upload Files',
        onClick: onCreateTask || (() => {}),
        variant: 'default'
      }}
      secondaryAction={{
        label: 'Learn More',
        onClick: () => console.log('Learn more clicked')
      }}
      variant="gradient"
      size="lg"
    />
  )
}

export function NoSearchResults({ query, onClear }: { query: string; onClear?: () => void }) {
  return (
    <EmptyState
      icon={Search}
      title="No Results Found"
      description={`No items match "${query}". Try adjusting your search terms or filters.`}
      action={{
        label: 'Clear Search',
        onClick: onClear || (() => {}),
        variant: 'outline'
      }}
      size="md"
    />
  )
}

export function OfflineEmpty({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={Wifi}
      title="No Connection"
      description="Check your internet connection and try again. Your data will be saved locally until reconnected."
      action={{
        label: 'Retry Connection',
        onClick: onRetry || (() => {}),
        variant: 'default'
      }}
      variant="gradient"
      size="md"
    />
  )
}

export function ErrorEmpty({ 
  title = "Something went wrong", 
  description = "An unexpected error occurred. Please try again or contact support if the problem persists.",
  onRetry 
}: { 
  title?: string
  description?: string
  onRetry?: () => void 
}) {
  return (
    <EmptyState
      icon={AlertCircle}
      title={title}
      description={description}
      action={{
        label: 'Try Again',
        onClick: onRetry || (() => {}),
        variant: 'default'
      }}
      secondaryAction={{
        label: 'Contact Support',
        onClick: () => console.log('Contact support clicked')
      }}
      size="md"
    />
  )
}

export function EmptyFileList({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No Files Uploaded"
      description="Drag and drop your audio or video files here, or click the button below to browse and select files."
      action={{
        label: 'Browse Files',
        onClick: onUpload || (() => {}),
        variant: 'default'
      }}
      variant="gradient"
      size="lg"
      className="border-2 border-dashed border-brand-300 dark:border-brand-700 bg-gradient-to-br from-brand-50/50 to-purple-50/30 dark:from-brand-950/30 dark:to-purple-950/20"
    />
  )
}

export function ProcessingQueueEmpty() {
  return (
    <EmptyState
      icon={Clock}
      title="Queue is Clear"
      description="All processing tasks have been completed successfully. Ready for new uploads."
      variant="minimal"
      size="md"
    />
  )
}

export function RecentHistoryEmpty() {
  return (
    <EmptyState
      icon={CheckCircle2}
      title="No Recent Activity"
      description="Completed tasks and processing history will appear here after your first successful operations."
      variant="minimal"
      size="md"
    />
  )
}

export function SettingsEmpty({ onConfigure }: { onConfigure?: () => void }) {
  return (
    <EmptyState
      icon={Settings}
      title="Default Configuration"
      description="You're using the default settings. Customize your experience by configuring transcription and translation options."
      action={{
        label: 'Configure Settings',
        onClick: onConfigure || (() => {}),
        variant: 'outline'
      }}
      size="md"
    />
  )
}

// Premium Loading States with Empty State Design
export function LoadingEmpty({ title = "Loading...", description }: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={RefreshCw}
      title={title}
      description={description}
      size="md"
      className="animate-pulse-premium"
    />
  )
}

// Illustration-style Empty States
export function WelcomeEmpty({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <div className="relative overflow-hidden">
      <Card className="border-0 bg-gradient-to-br from-brand-50 via-white to-purple-50 dark:from-brand-950 dark:via-gray-900 dark:to-purple-950 backdrop-blur-xl shadow-2xl p-12">
        {/* Premium Background Animation */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-conic from-brand-100/30 via-transparent to-purple-100/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-conic from-purple-100/30 via-transparent to-brand-100/30 rounded-full blur-3xl animate-float"></div>
        </div>

        <div className="relative flex flex-col items-center text-center space-y-8 max-w-2xl mx-auto">
          {/* Hero Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-full blur-2xl scale-150 animate-pulse-premium"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-brand-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl animate-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-3xl"></div>
              <Sparkles className="w-12 h-12 text-white relative z-10" />
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-brand-600 via-purple-600 to-brand-700 bg-clip-text text-transparent tracking-tight">
                Welcome to VoiceTransl
              </h1>
              <p className="text-xl font-bold bg-gradient-to-r from-gray-700 to-gray-600 dark:from-gray-300 dark:to-gray-400 bg-clip-text text-transparent">
                AI-Powered Translation Suite
              </p>
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-medium max-w-lg mx-auto">
              Transform your audio and video content with cutting-edge AI transcription and translation technology. 
              Professional results in minutes, not hours.
            </p>
          </div>

          {/* Premium Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
            <div className="flex flex-col items-center space-y-3 p-4 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-gray-100">Lightning Fast</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Process hours of content in minutes</p>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-3 p-4 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-gray-100">12+ Languages</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Professional translation quality</p>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-3 p-4 rounded-2xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-gray-100">Privacy First</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Your data stays completely private</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            onClick={onGetStarted || (() => {})}
            size="lg"
            className="px-8 py-4 text-lg font-bold bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-700 hover:to-purple-700 shadow-2xl hover:shadow-brand-500/25 transition-all duration-300 rounded-2xl border-0 group"
          >
            <div className="flex items-center gap-3">
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
              <span>Get Started</span>
              <Star className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </Button>
        </div>
      </Card>
    </div>
  )
}