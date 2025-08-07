import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle, XCircle, ListOrdered, Activity } from 'lucide-react'
import { useActiveTasks, useTaskHistory } from '@/hooks/api'
import { ProcessingQueueEmpty, RecentHistoryEmpty } from '@/components/empty-states'
import { cn } from '@/lib/utils'

export default function TasksPage() {
  const { data: activeTasks } = useActiveTasks()
  const { data: taskHistory } = useTaskHistory(10)
  
  const activeTaskCount = activeTasks ? Object.keys(activeTasks).length : 0

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      {/* Premium Page Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950 dark:via-neutral-900 dark:to-brand-900 border border-white/20 dark:border-gray-800/20 shadow-xl mb-8">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/4 w-32 h-32 lg:w-64 lg:h-64 bg-gradient-radial from-brand-200/20 to-transparent rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-1/4 w-24 h-24 lg:w-48 lg:h-48 bg-gradient-radial from-success-200/15 to-transparent rounded-full blur-2xl"></div>
        </div>
        
        <div className="relative px-6 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                Tasks
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                Monitor active tasks and view processing history
              </p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-white/30 dark:border-gray-700/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  {activeTaskCount} Active Tasks
                </span>
              </div>
              
              <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success-600 dark:text-success-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  System Operational
                </span>
              </div>
            </div>

            {activeTaskCount > 0 && (
              <Badge className="px-3 py-1.5 bg-gradient-to-r from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-900 text-warning-700 dark:text-warning-300 border-0 font-semibold animate-pulse">
                Processing
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Premium Task Content Grid */}
      <div className="flex-1 min-h-0 space-y-8">
        {/* Active Tasks */}
        <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10"></div>
          <CardHeader className="relative pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                <ListOrdered className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Active Tasks
                </span>
                <Badge className="ml-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
                  {activeTaskCount}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {activeTaskCount === 0 ? (
              <ProcessingQueueEmpty />
            ) : (
              <div className="space-y-4">
                {Object.entries(activeTasks || {}).map(([taskId, task]) => (
                  <div 
                    key={taskId} 
                    className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{task.id}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{task.message}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-gradient-to-r from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 text-brand-700 dark:text-brand-300 border-0">
                        {task.status}
                      </Badge>
                      <div className="text-right">
                        <span className="text-sm font-bold text-brand-600 dark:text-brand-400">{task.progress}%</span>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Progress</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task History */}
        <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10"></div>
          <CardHeader className="relative pb-4">
            <CardTitle className="flex items-center gap-3 text-xl font-bold">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Recent History
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              {!taskHistory || !Array.isArray(taskHistory.data) || taskHistory.data.length === 0 ? (
                <RecentHistoryEmpty />
              ) : (
                <div className="space-y-3">
                  {taskHistory.data.map((task: any, index: number) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          task.status === 'completed' 
                            ? "bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900"
                            : "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-800 dark:to-red-900"
                        )}>
                          {task.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{task.id}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{task.message}</p>
                        </div>
                      </div>
                      <Badge 
                        className={cn(
                          "border-0 font-semibold",
                          task.status === 'completed' 
                            ? 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gradient-to-r from-red-100 to-red-200 dark:from-red-800 dark:to-red-900 text-red-700 dark:text-red-300'
                        )}
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}