import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  Activity, 
  Server, 
  Clock, 
  Zap, 
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Cpu,
  Globe,
  Headphones,
  Languages,
  Mic,
  Shield,
  Star,
  Wand2,
  ListTodo
} from 'lucide-react'
import { useServerStatus, useActiveTasks } from '@/hooks/api'
import { FileUpload, TaskProgress } from '@/components/features'

export default function DashboardPage() {
  const { data: serverStatus } = useServerStatus()
  const { data: activeTasks } = useActiveTasks()
  
  const activeTaskCount = activeTasks ? Object.keys(activeTasks).length : 0
  const isServerHealthy = serverStatus?.healthy ?? false

  return (
    <div className="w-full h-full flex flex-col min-h-0">
      {/* Premium Glassmorphism Hero Section - Flexible */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-brand-100 dark:from-brand-950 dark:via-neutral-900 dark:to-brand-900 border border-white/20 shadow-2xl mb-8 transition-all duration-300 ease-in-out">
        {/* Background Effects - Responsive */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-48 h-48 lg:w-96 lg:h-96 bg-gradient-radial from-brand-200/30 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-40 h-40 lg:w-80 lg:h-80 bg-gradient-radial from-success-200/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] lg:w-[600px] lg:h-[400px] bg-gradient-conic from-brand-100/20 via-transparent to-brand-200/20 rounded-full blur-2xl"></div>
        </div>
        
        {/* Content - Fully Flexible */}
        <div className="relative px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16 transition-all duration-300 ease-in-out">
          <div className="w-full h-full flex flex-col justify-center items-center">
            {/* Centered Hero Layout */}
            <div className="text-center space-y-12">
              {/* Premium VoiceTransl Hero with Large Logo */}
              <div className="space-y-8">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-white/30 shadow-apple-md">
                    <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-success-200/50"></div>
                    <span className="text-body font-semibold text-success-600 dark:text-success-400 uppercase tracking-wider">
                      System Ready
                    </span>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-900 shadow-apple-sm">
                      <Star className="h-3 w-3 text-warning-600 dark:text-warning-400 fill-current" />
                      <span className="text-caption font-bold text-warning-700 dark:text-warning-300">PRO</span>
                    </div>
                  </div>
                </div>
                
                {/* Large Gradient VoiceTransl Logo */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur-2xl opacity-30 scale-110"></div>
                    <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl flex items-center justify-center border-4 border-white/20">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-3xl"></div>
                      <Mic className="w-12 h-12 text-white relative z-10" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 sm:space-y-6">
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent tracking-tight drop-shadow-lg transition-all duration-300 ease-in-out">
                    VoiceTransl
                  </h1>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-700 dark:text-gray-300 transition-all duration-300 ease-in-out">
                    AI Translation Suite
                  </p>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 leading-relaxed font-medium px-4 sm:px-8 lg:px-12 xl:px-16 transition-all duration-300 ease-in-out">
                    Transform your media with AI-powered transcription and translation. 
                    Professional-grade accuracy meets intuitive design.
                  </p>
                </div>
              </div>
              
              {/* Premium CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <Button 
                  size="lg" 
                  className="group relative px-8 py-4 font-bold text-white bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl border-0 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out"></div>
                  <div className="relative flex items-center gap-3 z-10">
                    <Upload className="h-5 w-5" />
                    <span className="font-bold">Start Processing</span>
                    <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300 ease-out" />
                  </div>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="px-6 py-4 font-medium bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-md hover:shadow-lg transition-all duration-300 ease-in-out rounded-xl"
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  View Examples
                </Button>
              </div>
              
              {/* Premium Quick Stats - Responsive */}
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8 pt-4 px-4 transition-all duration-300 ease-in-out">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-apple-sm">
                    <CheckCircle2 className="h-5 w-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-body font-bold text-text-primary">24 Files</p>
                    <p className="text-caption text-text-tertiary">Processed Today</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-apple-sm">
                    <Clock className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="text-body font-bold text-text-primary">2.3min</p>
                    <p className="text-caption text-text-tertiary">Avg. Processing</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-apple-sm">
                    <Globe className="h-5 w-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-body font-bold text-text-primary">12 Languages</p>
                    <p className="text-caption text-text-tertiary">Supported</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium System Status Dashboard - Flexible Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 mb-6 sm:mb-8 transition-all duration-300 ease-in-out">
        {/* Server Health Card */}
        <Card className="group relative overflow-hidden border-0 bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-success-50/50 to-transparent dark:from-success-950/30"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-success-100 to-success-200 dark:from-success-800 dark:to-success-900 shadow-md">
                <Server className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <Badge className="px-3 py-1 rounded-full border-0 bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300 font-semibold shadow-sm">
                {isServerHealthy ? 'Healthy' : 'Offline'}
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 font-display">
                  Server Status
                </h3>
                <p className="text-success-600 dark:text-success-400 font-semibold">
                  {isServerHealthy ? 'Online & Ready' : 'Connection Issues'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">
                  {serverStatus?.url || 'http://localhost:8080'}
                </p>
              </div>
              
              {serverStatus?.response_time_ms && (
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-text-tertiary">Response Time</span>
                  <span className="font-mono font-bold text-success-600 dark:text-success-400">
                    {serverStatus.response_time_ms}ms
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Active Tasks Card */}
        <Card className="group relative overflow-hidden border-0 bg-white dark:bg-neutral-900 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 to-transparent dark:from-brand-950/30"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 shadow-md">
                <ListTodo className="h-6 w-6" />
              </div>
              {activeTaskCount > 0 && (
                <Badge className="px-3 py-1 rounded-full border-0 bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300 font-semibold shadow-sm animate-pulse">
                  Active
                </Badge>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-heading-sm font-bold text-text-primary mb-1">Processing Queue</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-display-sm font-bold text-brand-600 dark:text-brand-400">
                    {activeTaskCount}
                  </span>
                  <span className="text-body text-text-tertiary">active tasks</span>
                </div>
              </div>
              
              {activeTaskCount > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-text-tertiary">Queue Progress</span>
                    <span className="font-mono font-bold text-brand-600 dark:text-brand-400">75%</span>
                  </div>
                  <Progress value={75} className="h-2 bg-surface-tertiary rounded-full" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Performance Metrics Card */}
        <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-lg hover:shadow-apple-xl transition-all-apple rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-warning-50/50 to-transparent dark:from-warning-950/30"></div>
          <CardContent className="relative p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-900 shadow-apple-md">
                <BarChart3 className="h-6 w-6 text-warning-600 dark:text-warning-400" />
              </div>
              <Badge className="px-3 py-1 rounded-full border-0 bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300 font-semibold shadow-apple-sm">
                Optimized
              </Badge>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-heading-sm font-bold text-text-primary mb-1">Performance</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-display-sm font-bold text-warning-600 dark:text-warning-400">
                    98%
                  </span>
                  <span className="text-body text-text-tertiary">efficiency</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-body-sm">
                <div className="text-center p-2 rounded-lg bg-surface-secondary">
                  <p className="font-bold text-text-primary">2.1s</p>
                  <p className="text-text-tertiary">Avg Time</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-surface-secondary">
                  <p className="font-bold text-text-primary">99.2%</p>
                  <p className="text-text-tertiary">Accuracy</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Features Showcase - Responsive Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6 sm:mb-8 transition-all duration-300 ease-in-out">
        <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-lg hover:shadow-apple-xl transition-all-apple rounded-2xl hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-blue-100/30 dark:from-blue-950/30 dark:to-blue-900/20"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 shadow-apple-md">
                <Mic className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Badge className="px-2 py-1 rounded-md border-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-caption font-bold">
                AI
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-heading-sm font-bold text-text-primary">Transcription</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                Advanced AI speech recognition with 99.2% accuracy
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
                <span className="text-caption font-semibold text-success-600 dark:text-success-400">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-lg hover:shadow-apple-xl transition-all-apple rounded-2xl hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-purple-100/30 dark:from-purple-950/30 dark:to-purple-900/20"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900 shadow-apple-md">
                <Languages className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <Badge className="px-2 py-1 rounded-md border-0 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 text-caption font-bold">
                12+
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-heading-sm font-bold text-text-primary">Translation</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                Professional translation in 12+ languages
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
                <span className="text-caption font-semibold text-success-600 dark:text-success-400">Ready</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-lg hover:shadow-apple-xl transition-all-apple rounded-2xl hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/30 dark:to-emerald-900/20"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-900 shadow-apple-md">
                <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <Badge className="px-2 py-1 rounded-md border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-caption font-bold">
                100%
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-heading-sm font-bold text-text-primary">Privacy</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                Complete offline processing, your data stays local
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
                <span className="text-caption font-semibold text-success-600 dark:text-success-400">Secure</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-lg hover:shadow-apple-xl transition-all-apple rounded-2xl hover:-translate-y-1">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-orange-100/30 dark:from-orange-950/30 dark:to-orange-900/20"></div>
          <CardContent className="relative p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-800 dark:to-orange-900 shadow-apple-md">
                <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <Badge className="px-2 py-1 rounded-md border-0 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-caption font-bold">
                Fast
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-heading-sm font-bold text-text-primary">Speed</h3>
              <p className="text-body-sm text-text-secondary leading-relaxed">
                Lightning-fast processing with GPU acceleration
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
                <span className="text-caption font-semibold text-success-600 dark:text-success-400">2.3min avg</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Premium Main Workflow Area - Flexible */}
      <div className="space-y-6 sm:space-y-8 flex-1 min-h-0">
        {/* File Upload Hero Section - Responsive */}
        <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-xl rounded-2xl sm:rounded-3xl transition-all duration-300 ease-in-out">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-50/30 to-transparent dark:from-brand-950/20"></div>
          <CardContent className="relative p-4 sm:p-6 lg:p-8 transition-all duration-300 ease-in-out">
            <div className="text-center mb-6 sm:mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-brand shadow-apple-lg transition-all duration-300 ease-in-out">
                  <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary mb-2 transition-all duration-300 ease-in-out">Ready to Transform Your Media?</h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed px-4 sm:px-8 lg:px-12 transition-all duration-300 ease-in-out">
                Drag and drop your audio or video files to start the AI-powered transcription and translation process.
                Support for MP3, MP4, WAV, and more.
              </p>
            </div>
            
            <FileUpload 
              onFilesSelected={(files) => {
                console.log('Files selected:', files)
                // TODO: Handle file selection - start processing workflow
              }}
              multiple={true}
              maxFiles={10}
            />
          </CardContent>
        </Card>
        
        {/* Recent Activity & Task Progress - Flexible Grid */}
        <div className="grid gap-4 sm:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2 transition-all duration-300 ease-in-out">
          {/* Task Progress */}
          <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-lg rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-success-50/20 to-transparent dark:from-success-950/10"></div>
            <CardHeader className="relative border-b border-border-secondary/50 pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-success-100 to-success-200 dark:from-success-800 dark:to-success-900 shadow-apple-md">
                    <Activity className="h-6 w-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <CardTitle className="text-heading-md font-bold text-text-primary">
                      Task Management
                    </CardTitle>
                    <p className="text-body text-text-secondary mt-1">
                      Monitor and control your processing pipeline
                    </p>
                  </div>
                </div>
                
                {activeTaskCount > 0 && (
                  <Badge className="px-3 py-1.5 rounded-full border-0 bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300 font-bold animate-pulse">
                    {activeTaskCount} Active
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="relative p-6">
              <TaskProgress 
                showHistory={true}
                maxItems={3}
                className="space-y-4"
              />
            </CardContent>
          </Card>
          
          {/* Quick Actions & Settings */}
          <Card className="group relative overflow-hidden border-0 bg-surface-elevated shadow-apple-lg rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50/20 to-transparent dark:from-brand-950/10"></div>
            <CardHeader className="relative border-b border-border-secondary/50 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-brand shadow-apple-md">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-heading-md font-bold text-text-primary">
                    Quick Actions
                  </CardTitle>
                  <p className="text-body text-text-secondary mt-1">
                    Access frequently used features and settings
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="relative p-4 sm:p-6 transition-all duration-300 ease-in-out">
              <div className="grid gap-3 sm:gap-4 transition-all duration-300 ease-in-out">
                <Button 
                  className="group justify-start p-4 h-auto bg-gradient-to-r from-surface-secondary to-surface-tertiary hover:from-brand-50 hover:to-brand-100 dark:hover:from-brand-950 dark:hover:to-brand-900 text-text-primary border border-border-primary hover:border-brand-200 dark:hover:border-brand-800 rounded-xl shadow-apple-sm hover:shadow-apple-md transition-all-apple"
                  variant="outline"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900">
                      <Headphones className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">Audio Settings</p>
                      <p className="text-body-sm text-text-tertiary">Configure transcription models</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-text-tertiary group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors-apple" />
                  </div>
                </Button>
                
                <Button 
                  className="group justify-start p-4 h-auto bg-gradient-to-r from-surface-secondary to-surface-tertiary hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-950 dark:hover:to-purple-900 text-text-primary border border-border-primary hover:border-purple-200 dark:hover:border-purple-800 rounded-xl shadow-apple-sm hover:shadow-apple-md transition-all-apple"
                  variant="outline"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900">
                      <Languages className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">Translation Setup</p>
                      <p className="text-body-sm text-text-tertiary">Manage language preferences</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-text-tertiary group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors-apple" />
                  </div>
                </Button>
                
                <Button 
                  className="group justify-start p-4 h-auto bg-gradient-to-r from-surface-secondary to-surface-tertiary hover:from-emerald-50 hover:to-emerald-100 dark:hover:from-emerald-950 dark:hover:to-emerald-900 text-text-primary border border-border-primary hover:border-emerald-200 dark:hover:border-emerald-800 rounded-xl shadow-apple-sm hover:shadow-apple-md transition-all-apple"
                  variant="outline"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-900">
                      <Cpu className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">Server Control</p>
                      <p className="text-body-sm text-text-tertiary">Monitor system performance</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-text-tertiary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors-apple" />
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}