import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { 
  Wifi, 
  Activity, 
  HardDrive, 
  Cpu, 
  MemoryStick,
  Network,
  Gauge,
  Shield,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServerSettingsTabProps {
  onSettingsChange?: () => void
}

export default function ServerSettingsTab({ onSettingsChange }: ServerSettingsTabProps) {
  const [localSettings, setLocalSettings] = useState({
    serverUrl: 'http://localhost:8080',
    timeout: 30000,
    retries: 3,
    enableSSL: false,
    autoReconnect: true,
    maxConnections: 10,
    cacheDuration: 3600,
    logLevel: 'info',
    enableMetrics: true,
    cpuLimit: [80],
    memoryLimit: [85],
    diskSpaceAlert: [90]
  })

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    onSettingsChange?.()
  }

  // Mock server status
  const serverStatus = {
    connected: true,
    uptime: '2d 14h 32m',
    version: '2.1.0',
    cpu: 34,
    memory: 58,
    disk: 23,
    network: 'High Speed',
    activeConnections: 3
  }

  return (
    <div className="space-y-8 w-full">
      {/* Server Status */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-indigo-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Server Status
              </span>
              <Badge className={cn(
                "ml-3 border-0",
                serverStatus.connected 
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white" 
                  : "bg-gradient-to-r from-red-500 to-rose-500 text-white"
              )}>
                {serverStatus.connected ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <div>
                    <Label className="text-sm font-semibold">Connection Status</Label>
                    <p className="text-xs text-gray-500">Active and stable</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-600">Connected</div>
                  <div className="text-xs text-gray-500">Uptime: {serverStatus.uptime}</div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Network className="w-5 h-5 text-blue-500" />
                  <div>
                    <Label className="text-sm font-semibold">Network Quality</Label>
                    <p className="text-xs text-gray-500">Latency: 12ms</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">{serverStatus.network}</div>
                  <div className="text-xs text-gray-500">{serverStatus.activeConnections} connections</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* System Resources */}
              <div className="p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <Label className="text-sm font-semibold mb-3 block">System Resources</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-orange-500" />
                      <span className="text-xs font-medium">CPU Usage</span>
                    </div>
                    <span className="text-xs font-bold">{serverStatus.cpu}%</span>
                  </div>
                  <Progress value={serverStatus.cpu} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MemoryStick className="w-4 h-4 text-purple-500" />
                      <span className="text-xs font-medium">Memory</span>
                    </div>
                    <span className="text-xs font-bold">{serverStatus.memory}%</span>
                  </div>
                  <Progress value={serverStatus.memory} className="h-2" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-green-500" />
                      <span className="text-xs font-medium">Disk Usage</span>
                    </div>
                    <span className="text-xs font-bold">{serverStatus.disk}%</span>
                  </div>
                  <Progress value={serverStatus.disk} className="h-2" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button variant="outline" size="sm" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Status
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Gauge className="w-4 h-4" />
              Run Diagnostics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection Settings */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Connection Configuration
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Server URL
              </Label>
              <Input
                value={localSettings.serverUrl}
                onChange={(e) => handleSettingChange('serverUrl', e.target.value)}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                placeholder="http://localhost:8080"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                API server endpoint URL
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Connection Timeout (ms)
              </Label>
              <Input
                type="number"
                value={localSettings.timeout}
                onChange={(e) => handleSettingChange('timeout', parseInt(e.target.value))}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                min="5000"
                max="300000"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Request timeout duration
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Retry Attempts
              </Label>
              <Input
                type="number"
                value={localSettings.retries}
                onChange={(e) => handleSettingChange('retries', parseInt(e.target.value))}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                min="0"
                max="10"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Number of retry attempts on failure
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Max Concurrent Connections
              </Label>
              <Input
                type="number"
                value={localSettings.maxConnections}
                onChange={(e) => handleSettingChange('maxConnections', parseInt(e.target.value))}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                min="1"
                max="50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Maximum simultaneous connections
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 min-w-0">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" />
                  <Label className="text-sm font-semibold">Enable SSL/TLS</Label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Secure connection encryption
                </p>
              </div>
              <Switch
                checked={localSettings.enableSSL}
                onCheckedChange={(checked) => handleSettingChange('enableSSL', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Auto-Reconnect</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically reconnect on disconnect
                </p>
              </div>
              <Switch
                checked={localSettings.autoReconnect}
                onCheckedChange={(checked) => handleSettingChange('autoReconnect', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance & Monitoring */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Performance & Monitoring
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="space-y-6">
            {/* Resource Limits */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                CPU Usage Alert Threshold: {localSettings.cpuLimit[0]}%
              </Label>
              <Slider
                value={localSettings.cpuLimit}
                onValueChange={(value) => handleSettingChange('cpuLimit', value)}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Alert when CPU usage exceeds this threshold
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Memory Usage Alert Threshold: {localSettings.memoryLimit[0]}%
              </Label>
              <Slider
                value={localSettings.memoryLimit}
                onValueChange={(value) => handleSettingChange('memoryLimit', value)}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Alert when memory usage exceeds this threshold
              </p>
            </div>

            <div className="space-y-4">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Disk Space Alert Threshold: {localSettings.diskSpaceAlert[0]}%
              </Label>
              <Slider
                value={localSettings.diskSpaceAlert}
                onValueChange={(value) => handleSettingChange('diskSpaceAlert', value)}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Alert when disk usage exceeds this threshold
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 min-w-0">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Cache Duration (seconds)
              </Label>
              <Input
                type="number"
                value={localSettings.cacheDuration}
                onChange={(e) => handleSettingChange('cacheDuration', parseInt(e.target.value))}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                min="60"
                max="86400"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                How long to cache server responses
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-500" />
                  <Label className="text-sm font-semibold">Enable Metrics</Label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Collect performance metrics
                </p>
              </div>
              <Switch
                checked={localSettings.enableMetrics}
                onCheckedChange={(checked) => handleSettingChange('enableMetrics', checked)}
              />
            </div>
          </div>

          {/* Current Performance Metrics */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Real-time Metrics
              </Label>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">12ms</div>
                <div className="text-xs text-gray-500">Avg Latency</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">99.9%</div>
                <div className="text-xs text-gray-500">Uptime</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">1.2GB</div>
                <div className="text-xs text-gray-500">Memory Used</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">3/10</div>
                <div className="text-xs text-gray-500">Connections</div>
              </div>
            </div>
          </div>

          {/* Alert Status */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-green-50 dark:bg-green-950/50 border border-green-200/50 dark:border-green-800/50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <Label className="text-sm font-semibold text-green-700 dark:text-green-300">
                  System Health: Optimal
                </Label>
                <p className="text-xs text-green-600 dark:text-green-400">
                  All systems operating within normal parameters
                </p>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200">
              No Alerts
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}