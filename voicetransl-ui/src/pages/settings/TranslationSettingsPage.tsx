import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Languages, Settings, Save } from 'lucide-react'
import { useTranslationConfig } from '@/hooks/api'

export default function TranslationSettingsPage() {
  const { data: config, isLoading } = useTranslationConfig()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Translation Settings</h1>
          <p className="text-muted-foreground">
            Configure translation services and language options
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
              <Languages className="h-5 w-5" />
              Translation Service
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
                  <label className="text-sm font-medium">Translator</label>
                  <p className="text-xs text-muted-foreground">
                    Current: {config?.data?.translator || 'openai'}
                  </p>
                  <Badge variant="secondary" className="mt-1">
                    {config?.data?.translator || 'openai'}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium">Target Language</label>
                  <p className="text-xs text-muted-foreground">
                    Default: {(config?.data as any)?.target_language || 'en'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Model</label>
                  <p className="text-xs text-muted-foreground">
                    Current: {(config?.data as any)?.model || 'gpt-3.5-turbo'}
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
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">API Endpoint</label>
                <p className="text-xs text-muted-foreground">
                  {(config?.data as any)?.api_endpoint || 'https://api.openai.com/v1'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">API Key</label>
                <p className="text-xs text-muted-foreground">
                  {(config?.data as any)?.api_key ? '••••••••••••' : 'Not configured'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Max Tokens</label>
                <p className="text-xs text-muted-foreground">
                  Limit: {(config?.data as any)?.max_tokens || '4000'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dictionary Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Dictionary and Prompts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Languages className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Dictionary management</p>
            <p className="text-xs text-gray-500">
              Custom dictionaries and translation prompts configuration
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}