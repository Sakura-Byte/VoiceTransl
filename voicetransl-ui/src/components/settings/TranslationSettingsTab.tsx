import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Globe, 
  Key, 
  Brain, 
  Sparkles,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'

interface TranslationSettingsTabProps {
  onSettingsChange?: () => void
}

const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' }
]

export default function TranslationSettingsTab({ onSettingsChange }: TranslationSettingsTabProps) {
  const [localSettings, setLocalSettings] = useState({
    primaryModel: 'sakura',
    sourceLanguage: 'ja',
    targetLanguage: 'en',
    useCache: true,
    contextAware: true,
    preserveFormatting: true,
    customPrompt: '',
    apiKey: '',
    maxTokens: 4000,
    temperature: 0.3,
    batchSize: 10
  })

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    onSettingsChange?.()
  }

  return (
    <div className="space-y-8 w-full">
      {/* Translation Engine */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Translation Engine
              </span>
              <Badge className="ml-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                AI Powered
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Primary Translation Model
              </Label>
              <Select 
                value={localSettings.primaryModel} 
                onValueChange={(value) => handleSettingChange('primaryModel', value)}
              >
                <SelectTrigger className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select translation model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sakura">Sakura - Japanese Specialist</SelectItem>
                  <SelectItem value="gpt4">GPT-4 - Universal</SelectItem>
                  <SelectItem value="gemini">Gemini Pro - Google</SelectItem>
                  <SelectItem value="deepseek">DeepSeek - Code-Aware</SelectItem>
                  <SelectItem value="moonshot">Moonshot - Long Context</SelectItem>
                  <SelectItem value="local">Local Model</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Each model excels in different translation scenarios
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Max Tokens per Request
              </Label>
              <Input
                type="number"
                value={localSettings.maxTokens}
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                min="1000"
                max="32000"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Higher values allow longer texts but cost more
              </p>
            </div>
          </div>

          {/* API Configuration */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-4 h-4 text-blue-600" />
              <Label className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                API Configuration
              </Label>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 min-w-0">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  API Key
                </Label>
                <Input
                  type="password"
                  value={localSettings.apiKey}
                  onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                  className="bg-white/70 dark:bg-black/70 text-sm"
                  placeholder="sk-... or your API key"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Temperature
                </Label>
                <Input
                  type="number"
                  value={localSettings.temperature}
                  onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                  className="bg-white/70 dark:bg-black/70 text-sm"
                  min="0"
                  max="2"
                  step="0.1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Configuration */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Language Configuration
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-6 lg:grid-cols-2 min-w-0">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Source Language
              </Label>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <span className="text-2xl">🇯🇵</span>
                <div>
                  <div className="font-medium text-sm">Japanese</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Fixed source language</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Target Language
              </Label>
              <Select 
                value={localSettings.targetLanguage} 
                onValueChange={(value) => handleSettingChange('targetLanguage', value)}
              >
                <SelectTrigger className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700">
                  <SelectValue placeholder="Select target language" />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Supported Languages Grid */}
          <div className="mt-6">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 block">
              Supported Languages ({supportedLanguages.length})
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {supportedLanguages.map((lang) => (
                <div 
                  key={lang.code}
                  className="flex items-center gap-2 p-3 rounded-lg bg-white/50 dark:bg-black/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all cursor-pointer"
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="text-sm font-medium">{lang.name}</span>
                  <CheckCircle2 className="w-3 h-3 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/10"></div>
        <CardHeader className="relative pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
              Advanced Options
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Translation Cache</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cache translations to improve speed and reduce costs
                </p>
              </div>
              <Switch
                checked={localSettings.useCache}
                onCheckedChange={(checked) => handleSettingChange('useCache', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Context Aware</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use surrounding context for better translations
                </p>
              </div>
              <Switch
                checked={localSettings.contextAware}
                onCheckedChange={(checked) => handleSettingChange('contextAware', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-black/50 backdrop-blur-sm">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Preserve Formatting</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Maintain original text formatting and structure
                </p>
              </div>
              <Switch
                checked={localSettings.preserveFormatting}
                onCheckedChange={(checked) => handleSettingChange('preserveFormatting', checked)}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Batch Size
              </Label>
              <Input
                type="number"
                value={localSettings.batchSize}
                onChange={(e) => handleSettingChange('batchSize', parseInt(e.target.value))}
                className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700"
                min="1"
                max="50"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Process translations in batches for efficiency
              </p>
            </div>
          </div>

          {/* Custom Translation Prompt */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Custom Translation Prompt
            </Label>
            <Textarea
              value={localSettings.customPrompt}
              onChange={(e) => handleSettingChange('customPrompt', e.target.value)}
              className="bg-white/50 dark:bg-black/50 backdrop-blur-sm border-gray-200 dark:border-gray-700 min-h-[100px] resize-none"
              placeholder="Add custom instructions for the translation model..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Provide specific instructions to improve translation quality for your use case
            </p>
          </div>

          {/* Performance Stats */}
          <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border border-green-200/50 dark:border-green-800/50">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-green-700 dark:text-green-300">
                Translation Performance
              </Label>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">96.8%</div>
                <div className="text-xs text-gray-500">Quality Score</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">1.2s</div>
                <div className="text-xs text-gray-500">Avg Speed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">12</div>
                <div className="text-xs text-gray-500">Languages</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">78%</div>
                <div className="text-xs text-gray-500">Cache Hit</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}