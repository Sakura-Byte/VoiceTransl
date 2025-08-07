import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Code, 
  Terminal, 
  Database, 
  FileText, 
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  Settings,
  Zap,
  RefreshCw
} from 'lucide-react'

interface AdvancedSettingsTabProps {
  onSettingsChange?: () => void
}

export default function AdvancedSettingsTab({ onSettingsChange }: AdvancedSettingsTabProps) {
  const [localSettings, setLocalSettings] = useState({
    debugMode: false,
    verboseLogging: false,
    developerMode: false,
    enableExperimental: false,
    logLevel: 'info',
    maxLogSize: '100MB',
    backupEnabled: true,
    backupInterval: 'daily',
    customConfig: '',
    apiRateLimit: 100,
    modelOffloadingStrategy: 'immediate_offload'
  })

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    onSettingsChange?.()
  }

  const handleExportConfig = () => {
    const config = JSON.stringify(localSettings, null, 2)
    const blob = new Blob([config], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'voicetransl-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearCache = () => {
    // Clear cache logic would go here
    console.log('Clearing cache...')
  }

  const handleResetSettings = () => {
    setLocalSettings({
      debugMode: false,
      verboseLogging: false,
      developerMode: false,
      enableExperimental: false,
      logLevel: 'info',
      maxLogSize: '100MB',
      backupEnabled: true,
      backupInterval: 'daily',
      customConfig: '',
      apiRateLimit: 100,
      modelOffloadingStrategy: 'immediate_offload'
    })
    onSettingsChange?.()
  }

  return (
    <div className="space-y-8 w-full">
      {/* Developer Options */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Code className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Developer Options
              </span>
              <Badge className="ml-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                Expert Only
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-4 lg:grid-cols-2 min-w-0">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm font-semibold">Debug Mode</Label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable detailed debugging output
                </p>
              </div>
              <Switch
                checked={localSettings.debugMode}
                onCheckedChange={(checked) => handleSettingChange('debugMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Verbose Logging</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Log all operations and API calls
                </p>
              </div>
              <Switch
                checked={localSettings.verboseLogging}
                onCheckedChange={(checked) => handleSettingChange('verboseLogging', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Developer Mode</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Show advanced developer tools
                </p>
              </div>
              <Switch
                checked={localSettings.developerMode}
                onCheckedChange={(checked) => handleSettingChange('developerMode', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 backdrop-blur-sm border border-amber-200 dark:border-amber-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <Label className="text-sm font-semibold">Experimental Features</Label>
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Use at your own risk - may be unstable
                </p>
              </div>
              <Switch
                checked={localSettings.enableExperimental}
                onCheckedChange={(checked) => handleSettingChange('enableExperimental', checked)}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Log Level
              </Label>
              <Select 
                value={localSettings.logLevel} 
                onValueChange={(value) => handleSettingChange('logLevel', value)}
              >
                <SelectTrigger className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error - Critical issues only</SelectItem>
                  <SelectItem value="warn">Warning - Issues and warnings</SelectItem>
                  <SelectItem value="info">Info - General information</SelectItem>
                  <SelectItem value="debug">Debug - Detailed debugging</SelectItem>
                  <SelectItem value="trace">Trace - All operations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                API Rate Limit (requests/minute)
              </Label>
              <Input
                type="number"
                value={localSettings.apiRateLimit}
                onChange={(e) => handleSettingChange('apiRateLimit', parseInt(e.target.value))}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                min="10"
                max="1000"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System & Performance */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              System & Performance
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Model Offloading Strategy
              </Label>
              <Select 
                value={localSettings.modelOffloadingStrategy} 
                onValueChange={(value) => handleSettingChange('modelOffloadingStrategy', value)}
              >
                <SelectTrigger className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select offloading strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate_offload">Immediate Offload - Unload when unused</SelectItem>
                  <SelectItem value="keep_in_vram">Keep All in VRAM - Excessive VRAM usage</SelectItem>
                  <SelectItem value="offload_on_low_vram">Offload Previous - When VRAM insufficient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Max Log File Size
              </Label>
              <Select 
                value={localSettings.maxLogSize} 
                onValueChange={(value) => handleSettingChange('maxLogSize', value)}
              >
                <SelectTrigger className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select max log size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10MB">10 MB</SelectItem>
                  <SelectItem value="50MB">50 MB</SelectItem>
                  <SelectItem value="100MB">100 MB</SelectItem>
                  <SelectItem value="500MB">500 MB</SelectItem>
                  <SelectItem value="1GB">1 GB</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={handleClearCache}
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <Database className="w-4 h-4" />
              Clear Cache
            </Button>
            
            <Button 
              onClick={handleExportConfig}
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export Config
            </Button>
            
            <Button 
              onClick={handleResetSettings}
              variant="outline" 
              size="sm" 
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
            >
              <RefreshCw className="w-4 h-4" />
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>


      {/* Custom Configuration */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 via-transparent to-slate-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 flex items-center justify-center shadow-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-gray-600 to-slate-600 bg-clip-text text-transparent">
              Custom Configuration
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Custom JSON Configuration
            </Label>
            <Textarea
              value={localSettings.customConfig}
              onChange={(e) => handleSettingChange('customConfig', e.target.value)}
              className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700 min-h-[200px] font-mono text-sm"
              placeholder='{\n  "example": "custom configuration",\n  "advanced": {\n    "setting": true\n  }\n}'
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Advanced users can override default settings with custom JSON configuration
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <Label className="text-sm font-semibold text-amber-700 dark:text-amber-300 block mb-1">
                  Warning: Advanced Configuration
                </Label>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Modifying these settings requires technical knowledge. Invalid JSON or incorrect configuration 
                  may cause system instability or prevent the application from starting properly.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <Settings className="w-4 h-4" />
              Validate Config
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Config
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
            >
              <Trash2 className="w-4 h-4" />
              Clear Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}