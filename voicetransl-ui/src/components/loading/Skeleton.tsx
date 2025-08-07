import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'rounded' | 'circular' | 'card' | 'text' | 'button' | 'avatar' | 'badge'
  animate?: boolean
  children?: React.ReactNode
}

const variantStyles = {
  default: '',
  rounded: 'rounded-lg',
  circular: 'rounded-full',
  card: 'rounded-2xl',
  text: 'rounded-md h-4',
  button: 'rounded-xl h-10 px-6',
  avatar: 'rounded-full aspect-square',
  badge: 'rounded-full h-6 px-3'
}

export function Skeleton({ 
  className, 
  variant = 'default',
  animate = true,
  children,
  ...props 
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-gray-200/60 via-gray-100/80 to-gray-200/60 dark:from-gray-800/60 dark:via-gray-700/80 dark:to-gray-800/60",
        "relative overflow-hidden backdrop-blur-sm",
        animate && "animate-shimmer bg-[length:400%_100%]",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
      {animate && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10 animate-shimmer-overlay" />
      )}
    </div>
  )
}

// Premium Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-6", className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2 h-3" />
        </div>
        <Skeleton variant="badge" />
      </div>
      
      <div className="space-y-3">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-5/6" />
        <Skeleton variant="text" className="w-4/5" />
      </div>
      
      <div className="flex items-center gap-3 pt-2">
        <Skeleton variant="button" className="flex-1" />
        <Skeleton variant="button" className="w-24" />
      </div>
    </div>
  )
}

// Settings Card Skeleton
export function SettingsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6 p-6", className)}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-10 h-10" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-48" />
          <Skeleton variant="text" className="w-32 h-3" />
        </div>
      </div>
      
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="rounded" className="w-full h-10" />
          <Skeleton variant="text" className="w-3/4 h-2" />
        </div>
        <div className="space-y-3">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="rounded" className="w-full h-10" />
          <Skeleton variant="text" className="w-2/3 h-2" />
        </div>
      </div>
      
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-black/30">
          <div className="space-y-2">
            <Skeleton variant="text" className="w-32" />
            <Skeleton variant="text" className="w-20 h-2" />
          </div>
          <Skeleton variant="rounded" className="w-11 h-6" />
        </div>
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/30 dark:bg-black/30">
          <div className="space-y-2">
            <Skeleton variant="text" className="w-28" />
            <Skeleton variant="text" className="w-24 h-2" />
          </div>
          <Skeleton variant="rounded" className="w-11 h-6" />
        </div>
      </div>
    </div>
  )
}

// Dashboard Stats Skeleton
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4 p-6", className)}>
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-16 h-8" />
        <Skeleton variant="text" className="w-20 h-3" />
      </div>
      <Skeleton variant="rounded" className="w-full h-2" />
    </div>
  )
}

// Task List Item Skeleton
export function TaskItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4", className)}>
      <Skeleton variant="circular" className="w-10 h-10" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-3/4" />
        <Skeleton variant="text" className="w-1/2 h-3" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="badge" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
    </div>
  )
}

// Navigation Skeleton
export function NavigationSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2 p-4", className)}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <Skeleton variant="circular" className="w-6 h-6" />
          <Skeleton variant="text" className="w-20" />
        </div>
      ))}
    </div>
  )
}

// Form Field Skeleton
export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton variant="text" className="w-24 h-4" />
      <Skeleton variant="rounded" className="w-full h-10" />
      <Skeleton variant="text" className="w-3/4 h-3" />
    </div>
  )
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 p-4", className)} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {[...Array(columns)].map((_, i) => (
        <Skeleton key={i} variant="text" className="w-full" />
      ))}
    </div>
  )
}

// Loading Page Skeleton
export function PageSkeleton() {
  return (
    <div className="space-y-8 p-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-48 h-8" />
          <Skeleton variant="text" className="w-64 h-5" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="button" className="w-24" />
          <Skeleton variant="button" className="w-32" />
        </div>
      </div>
      
      {/* Content Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl rounded-2xl" />
          <CardSkeleton className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl rounded-2xl" />
        </div>
        <div className="space-y-6">
          <StatsCardSkeleton className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl rounded-2xl" />
          <StatsCardSkeleton className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl rounded-2xl" />
        </div>
      </div>
    </div>
  )
}