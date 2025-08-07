import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download, RefreshCw, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { useRecentLogs } from '@/hooks/api'

export default function LogsPage() {
  const { data: logs, refetch, isLoading } = useRecentLogs('log.txt', 100)

  return (
    <div className="w-full h-full flex flex-col space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activity and troubleshoot issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Log Controls */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Log Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Log Level Filters */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Filter by level:</span>
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Error
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Warning
              </Badge>
              <Badge variant="default" className="gap-1">
                <Info className="h-3 w-3" />
                Info
              </Badge>
            </div>

            {/* Log Content */}
            <div className="border rounded-lg bg-gray-50 p-4 flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-sm text-gray-600">Loading logs...</p>
                  </div>
                </div>
              ) : logs && logs.data && logs.data.length > 0 ? (
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {logs.data.map((log: any, index: number) => (
                    <div key={index} className="py-1 border-b border-gray-200 last:border-b-0">
                      <span className="text-gray-500">[{log.timestamp || new Date().toISOString()}]</span>{' '}
                      <span className={
                        log.level === 'error' ? 'text-red-600' :
                        log.level === 'warning' ? 'text-yellow-600' :
                        'text-gray-800'
                      }>
                        {log.message || log}
                      </span>
                    </div>
                  ))}
                </pre>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">No logs available</p>
                    <p className="text-xs text-gray-500">
                      System logs will appear here when available
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}