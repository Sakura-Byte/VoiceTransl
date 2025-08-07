import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic, Settings, Save } from 'lucide-react'
import { useTranscriptionConfig } from '@/hooks/api'

export default function TranscriptionSettingsPage() {
  const { data: config, isLoading } = useTranscriptionConfig()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transcription Settings</h1>
          <p className="text-muted-foreground">
            Configure audio and video transcription parameters
          </p>
        </div>
        <Button className="gap-2">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Configuration Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Whisper Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <p className="text-xs text-muted-foreground">
                    Auto-detection: {(config?.data as any)?.auto_language ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Processing Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Suppress Repetitions</label>
                <p className="text-xs text-muted-foreground">
                  Status: {config?.data?.suppress_repetitions ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Alignment Backend</label>
                <p className="text-xs text-muted-foreground">
                  Current: {config?.data?.alignment_backend || 'local'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Output Format</label>
                <p className="text-xs text-muted-foreground">
                  Default: {(config?.data as any)?.output_format || 'srt'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Advanced settings panel</p>
            <p className="text-xs text-gray-500">
              Detailed configuration options will be available here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}