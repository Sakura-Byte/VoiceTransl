import { useState } from 'react'
import { 
  Play, 
  Square, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  FileAudio, 
  Languages, 
  Mic,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useActiveTasks, useTaskHistory, useTaskMutations } from '@/hooks/api'
import type { Task } from '@/types'

interface TaskProgressProps {
  className?: string
  showHistory?: boolean
  maxItems?: number
}

export function TaskProgress({ className, showHistory = true, maxItems = 10 }: TaskProgressProps) {
  const { data: activeTasks, isLoading: activeLoading } = useActiveTasks()
  const { data: taskHistory, isLoading: historyLoading } = useTaskHistory(maxItems)
  const { cancelTask, isCancelling } = useTaskMutations()
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  // Get task icon based on type
  const getTaskIcon = (task: Task) => {
    const iconProps = { className: "h-4 w-4" }
    
    switch (task.type) {
      case 'transcription':
        return <Mic {...iconProps} />
      case 'translation':
        return <Languages {...iconProps} />
      case 'workflow':
        return <Play {...iconProps} />
      case 'config':
        return <AlertCircle {...iconProps} />
      default:
        return <FileAudio {...iconProps} />
    }
  }

  // Get premium status display with sophisticated styling
  const getStatusDisplay = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'text-warning-600 dark:text-warning-400',
          bgColor: 'bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-900',
          ringColor: 'ring-warning-200 dark:ring-warning-800',
          variant: 'secondary' as const,
          label: 'Pending'
        }
      case 'running':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          color: 'text-brand-600 dark:text-brand-400',
          bgColor: 'bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900',
          ringColor: 'ring-brand-200 dark:ring-brand-800',
          variant: 'default' as const,
          label: 'Running'
        }
      case 'completed':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'text-success-600 dark:text-success-400',
          bgColor: 'bg-gradient-to-br from-success-100 to-success-200 dark:from-success-800 dark:to-success-900',
          ringColor: 'ring-success-200 dark:ring-success-800',
          variant: 'default' as const,
          label: 'Completed'
        }
      case 'failed':
        return {
          icon: <XCircle className="h-4 w-4" />,
          color: 'text-error-600 dark:text-error-400',
          bgColor: 'bg-gradient-to-br from-error-100 to-error-200 dark:from-error-800 dark:to-error-900',
          ringColor: 'ring-error-200 dark:ring-error-800',
          variant: 'destructive' as const,
          label: 'Failed'
        }
      case 'cancelled':
        return {
          icon: <Square className="h-4 w-4" />,
          color: 'text-neutral-600 dark:text-neutral-400',
          bgColor: 'bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900',
          ringColor: 'ring-neutral-200 dark:ring-neutral-800',
          variant: 'secondary' as const,
          label: 'Cancelled'
        }
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'text-neutral-600 dark:text-neutral-400',
          bgColor: 'bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900',
          ringColor: 'ring-neutral-200 dark:ring-neutral-800',
          variant: 'secondary' as const,
          label: 'Unknown'
        }
    }
  }

  // Format task duration
  const formatDuration = (createdAt: string, updatedAt?: string) => {
    const start = new Date(createdAt).getTime()
    const end = updatedAt ? new Date(updatedAt).getTime() : new Date().getTime()
    const duration = Math.max(0, end - start)
    
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  // Get task type display name
  const getTaskTypeDisplay = (type: Task['type']) => {
    switch (type) {
      case 'transcription': return 'Transcription'
      case 'translation': return 'Translation'
      case 'workflow': return 'Full Workflow'
      case 'config': return 'Configuration'
      default: return String(type).charAt(0).toUpperCase() + String(type).slice(1)
    }
  }

  // Handle task cancellation
  const handleCancelTask = async (taskId: string) => {
    try {
      await cancelTask(taskId)
    } catch (error) {
      console.error('Failed to cancel task:', error)
    }
  }

  // Premium task item component
  const TaskItem = ({ task, isActive = false }: { task: Task; isActive?: boolean }) => {
    const statusDisplay = getStatusDisplay(task.status)
    const isExpanded = expandedTask === task.id
    
    return (
      <div className={cn(
        "group relative overflow-hidden border-0 rounded-2xl p-5 transition-apple shadow-apple-sm hover:shadow-apple-md",
        "bg-gradient-to-r from-surface-elevated to-surface-elevated",
        isActive && [
          "bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900",
          "ring-1 ring-brand-200 dark:ring-brand-800"
        ],
        !isActive && "hover:from-surface-secondary hover:to-surface-tertiary"
      )}>
        {/* Premium status indicator line */}
        <div className={cn(
          "absolute left-0 top-0 w-1 h-full transition-apple",
          task.status === 'running' && "bg-gradient-to-b from-brand-400 to-brand-600",
          task.status === 'completed' && "bg-gradient-to-b from-success-400 to-success-600", 
          task.status === 'failed' && "bg-gradient-to-b from-error-400 to-error-600",
          task.status === 'pending' && "bg-gradient-to-b from-warning-400 to-warning-600",
          task.status === 'cancelled' && "bg-gradient-to-b from-neutral-400 to-neutral-600"
        )} />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            {/* Premium Task Icon */}
            <div className={cn(
              "relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-apple-sm backdrop-blur-sm border border-white/20",
              statusDisplay.bgColor
            )}>
              <div className={statusDisplay.color}>
                {getTaskIcon(task)}
              </div>
              {task.status === 'running' && (
                <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-brand-400/20 to-brand-600/20 animate-pulse" />
              )}
            </div>
            
            {/* Premium Task Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center space-x-3">
                <p className="text-body font-semibold text-text-primary truncate">
                  {task.id}
                </p>
                <Badge 
                  className={cn(
                    "px-3 py-1 rounded-full font-medium text-xs border-0 shadow-sm",
                    task.status === 'running' && "bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300",
                    task.status === 'completed' && "bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300",
                    task.status === 'failed' && "bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300",
                    task.status === 'pending' && "bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300",
                    task.status === 'cancelled' && "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                  )}
                >
                  {statusDisplay.label}
                </Badge>
              </div>
              
              <div className="flex items-center space-x-4 text-body-sm text-text-tertiary">
                <span className="font-medium">{getTaskTypeDisplay(task.type)}</span>
                <span className="w-1 h-1 rounded-full bg-text-tertiary"></span>
                <span className="font-mono">{formatDuration(task.created_at, task.updated_at)}</span>
              </div>
              
              {task.message && (
                <p className="text-body-sm text-text-secondary truncate font-medium">
                  {task.message}
                </p>
              )}
            </div>
          </div>
          
          {/* Premium Progress and Actions */}
          <div className="flex items-center space-x-4">
            {/* Premium Progress */}
            {isActive && task.status === 'running' && (
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end space-y-1">
                  <Progress 
                    value={task.progress} 
                    className="w-24 h-2 bg-surface-tertiary shadow-inner rounded-full"
                  />
                  <span className="text-body-sm text-brand-600 dark:text-brand-400 font-semibold font-mono">
                    {task.progress}%
                  </span>
                </div>
              </div>
            )}
            
            {/* Premium Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 w-9 p-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-surface-tertiary"
                >
                  <MoreHorizontal className="h-4 w-4 text-text-tertiary" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-48 p-2 border-border-primary shadow-apple-lg bg-surface-elevated"
              >
                <DropdownMenuItem 
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                  className="rounded-lg p-3 cursor-pointer transition-colors-apple hover:bg-surface-secondary"
                >
                  {isExpanded ? 'Hide Details' : 'Show Details'}
                </DropdownMenuItem>
                {isActive && task.status === 'running' && (
                  <DropdownMenuItem 
                    onClick={() => handleCancelTask(task.id)}
                    disabled={isCancelling}
                    className="rounded-lg p-3 cursor-pointer transition-colors-apple hover:bg-error-50 dark:hover:bg-error-950 text-error-600 dark:text-error-400"
                  >
                    Cancel Task
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Premium Expanded Details */}
        {isExpanded && (
          <div className="mt-6 pt-5 border-t border-border-secondary space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-body-sm font-medium text-text-tertiary">Created</p>
                <p className="text-body font-mono text-text-primary bg-surface-secondary px-3 py-2 rounded-lg">
                  {new Date(task.created_at).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-body-sm font-medium text-text-tertiary">Last Updated</p>
                <p className="text-body font-mono text-text-primary bg-surface-secondary px-3 py-2 rounded-lg">
                  {new Date(task.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
            
            {task.result !== undefined && task.result !== null && (
              <div className="space-y-3">
                <p className="text-body-sm font-medium text-text-tertiary">Result</p>
                <pre className="text-body-sm bg-surface-secondary p-4 rounded-xl overflow-x-auto border border-border-primary font-mono text-text-primary">
                  {typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Premium Active Tasks Section */}
      <Card className="border-0 bg-surface-elevated shadow-apple-lg overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 shadow-apple-sm">
                <Play className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <CardTitle className="text-heading-md text-text-primary">
                  Active Tasks
                </CardTitle>
                <p className="text-body-sm text-text-tertiary mt-1">
                  Currently processing files
                </p>
              </div>
            </div>
            
            {activeTasks && Object.keys(activeTasks).length > 0 && (
              <Badge className="ml-auto px-3 py-1.5 rounded-full font-semibold bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 border-0">
                {Object.keys(activeTasks).length} active
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {activeLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 flex items-center justify-center shadow-apple-md mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
              </div>
              <p className="text-body text-text-secondary font-medium">Loading active tasks...</p>
            </div>
          ) : !activeTasks || Object.keys(activeTasks).length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-surface-secondary to-surface-tertiary flex items-center justify-center shadow-apple-md">
                <Play className="h-10 w-10 text-text-tertiary" />
              </div>
              <div className="space-y-2">
                <p className="text-heading-sm text-text-primary">No active tasks</p>
                <p className="text-body text-text-tertiary max-w-sm mx-auto">
                  Tasks will appear here when you start processing files
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-4 pr-4">
                {Object.values(activeTasks).map((task, index) => (
                  <div 
                    key={task.id}
                    style={{ animationDelay: `${index * 100}ms` }}
                    className="animate-in slide-in-from-left-5 duration-500"
                  >
                    <TaskItem task={task as any} isActive={true} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Premium Task History Section */}
      {showHistory && (
        <Card className="border-0 bg-surface-elevated shadow-apple-lg overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 shadow-apple-sm">
                  <Clock className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div>
                  <CardTitle className="text-heading-md text-text-primary">
                    Recent History
                  </CardTitle>
                  <p className="text-body-sm text-text-tertiary mt-1">
                    Previously completed tasks
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center shadow-apple-md mb-4">
                  <Loader2 className="h-8 w-8 animate-spin text-neutral-600 dark:text-neutral-400" />
                </div>
                <p className="text-body text-text-secondary font-medium">Loading task history...</p>
              </div>
            ) : !taskHistory || !Array.isArray(taskHistory.data) || taskHistory.data.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-surface-secondary to-surface-tertiary flex items-center justify-center shadow-apple-md">
                  <Clock className="h-10 w-10 text-text-tertiary" />
                </div>
                <div className="space-y-2">
                  <p className="text-heading-sm text-text-primary">No task history</p>
                  <p className="text-body text-text-tertiary max-w-sm mx-auto">
                    Completed tasks will appear here after processing
                  </p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-4 pr-4">
                  {taskHistory.data.map((task: any, index: number) => (
                    <div 
                      key={task.id}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className="animate-in slide-in-from-left-3 duration-300"
                    >
                      <TaskItem task={task} isActive={false} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}