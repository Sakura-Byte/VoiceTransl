import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { 
  AudioWaveform, 
  FileAudio,
  RefreshCw
} from 'lucide-react'
import { useTranscriptionConfig } from '@/hooks/api'

interface TranscriptionSettingsTabProps {
  onSettingsChange?: () => void
}

export default function TranscriptionSettingsTab({ onSettingsChange }: TranscriptionSettingsTabProps) {
  const { isLoading } = useTranscriptionConfig()
  const [localSettings, setLocalSettings] = useState({
    suppressRepetitions: true,
    alignmentBackend: 'local',
    outputFormat: 'srt',
    noiseReduction: true,
    voiceActivityDetection: true
  })

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    onSettingsChange?.()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full">

      {/* Audio Processing */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <AudioWaveform className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Audio Processing
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-blue-200 dark:border-blue-800">
                <span className="text-2xl">🇯🇵</span>
                <div className="flex-1">
                  <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">Source Language: Japanese</Label>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Configured for Japanese audio input
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Noise Reduction</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Remove background noise
                  </p>
                </div>
                <Switch
                  checked={localSettings.noiseReduction}
                  onCheckedChange={(checked) => handleSettingChange('noiseReduction', checked)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Voice Activity Detection</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Detect speech segments automatically
                  </p>
                </div>
                <Switch
                  checked={localSettings.voiceActivityDetection}
                  onCheckedChange={(checked) => handleSettingChange('voiceActivityDetection', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Suppress Repetitions</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Remove repetitive phrases
                  </p>
                </div>
                <Switch
                  checked={localSettings.suppressRepetitions}
                  onCheckedChange={(checked) => handleSettingChange('suppressRepetitions', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Settings */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <FileAudio className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Output Configuration
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Output Format
              </Label>
              <Select 
                value={localSettings.outputFormat} 
                onValueChange={(value) => handleSettingChange('outputFormat', value)}
              >
                <SelectTrigger className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select output format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="srt">SRT - SubRip Subtitle</SelectItem>
                  <SelectItem value="vtt">VTT - WebVTT Subtitle</SelectItem>
                  <SelectItem value="ass">ASS - Advanced SubStation</SelectItem>
                  <SelectItem value="txt">TXT - Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Alignment Backend
              </Label>
              <Select 
                value={localSettings.alignmentBackend} 
                onValueChange={(value) => handleSettingChange('alignmentBackend', value)}
              >
                <SelectTrigger className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select alignment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Qwen3</SelectItem>
                  <SelectItem value="openai">OpenAI API</SelectItem>
                  <SelectItem value="gemini">Gemini API</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                Current Performance
              </Label>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">99.2%</div>
                <div className="text-xs text-gray-500">Accuracy</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">2.3min</div>
                <div className="text-xs text-gray-500">Avg Time</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">GPU</div>
                <div className="text-xs text-gray-500">Acceleration</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}