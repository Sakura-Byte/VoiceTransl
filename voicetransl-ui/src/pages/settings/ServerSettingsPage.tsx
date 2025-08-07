import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Save } from 'lucide-react'
import { ServerStatus } from '@/components/features'

export default function ServerSettingsPage() {

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Server Settings</h1>
          <p className="text-muted-foreground">
            Manage API server configuration and status
          </p>
        </div>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Server Status */}
      <ServerStatus 
        showControls={true}
        showDetails={true}
        className="space-y-4"
      />

      {/* Configuration */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Network Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Host</label>
              <p className="text-xs text-muted-foreground">
                Configure server host address and binding
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Port</label>
              <p className="text-xs text-muted-foreground">
                Set server port for API access
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Max Concurrent Tasks</label>
              <p className="text-xs text-muted-foreground">
                Limit simultaneous processing tasks
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Request Timeout</label>
              <p className="text-xs text-muted-foreground">
                Maximum time for API requests
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Auto Restart</label>
              <p className="text-xs text-muted-foreground">
                Automatically restart on failure
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Log Level</label>
              <p className="text-xs text-muted-foreground">
                Set logging verbosity level
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}