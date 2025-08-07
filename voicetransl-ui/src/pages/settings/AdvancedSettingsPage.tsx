import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wrench, Database, MessageSquare, Download, Upload, Save } from 'lucide-react'
import { useDictionaries, usePromptsConfig } from '@/hooks/api'

export default function AdvancedSettingsPage() {
  const { data: dictionaries } = useDictionaries()
  const { data: prompts } = usePromptsConfig()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Settings</h1>
          <p className="text-muted-foreground">
            Configure dictionaries, prompts, and advanced options
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
              <Database className="h-5 w-5" />
              Dictionaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Pre-translation Dictionary</label>
                <p className="text-xs text-muted-foreground">
                  Entries: {dictionaries?.data?.pre_translation?.length || 0}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {dictionaries?.data?.pre_translation?.length || 0} entries
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Upload className="h-3 w-3 mr-1" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">GPT Dictionary</label>
                <p className="text-xs text-muted-foreground">
                  Entries: {dictionaries?.data?.gpt_dictionary?.length || 0}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {dictionaries?.data?.gpt_dictionary?.length || 0} entries
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Upload className="h-3 w-3 mr-1" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Post-processing Dictionary</label>
                <p className="text-xs text-muted-foreground">
                  Entries: {(dictionaries?.data as any)?.post_processing?.length || 0}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    {(dictionaries?.data as any)?.post_processing?.length || 0} entries
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Upload className="h-3 w-3 mr-1" />
                    Import
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-3 w-3 mr-1" />
                    Export
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Custom Prompts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Translation Prompt</label>
                <p className="text-xs text-muted-foreground">
                  Custom translation instructions
                </p>
                <Badge variant={(prompts?.data as any)?.translation_prompt ? 'default' : 'secondary'} className="mt-1">
                  {(prompts?.data as any)?.translation_prompt ? 'Configured' : 'Default'}
                </Badge>
              </div>
              
              <div>
                <label className="text-sm font-medium">System Prompt</label>
                <p className="text-xs text-muted-foreground">
                  System-level instructions
                </p>
                <Badge variant={prompts?.data?.system_prompt ? 'default' : 'secondary'} className="mt-1">
                  {prompts?.data?.system_prompt ? 'Configured' : 'Default'}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium">Extra Prompt</label>
                <p className="text-xs text-muted-foreground">
                  Additional context and instructions
                </p>
                <Badge variant={prompts?.data?.extra_prompt ? 'default' : 'secondary'} className="mt-1">
                  {prompts?.data?.extra_prompt ? 'Configured' : 'Default'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Configuration Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center space-y-2">
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Export Config
              </Button>
              <p className="text-xs text-muted-foreground">
                Download current configuration
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Import Config
              </Button>
              <p className="text-xs text-muted-foreground">
                Upload configuration file
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <Button variant="outline" className="w-full">
                <Wrench className="h-4 w-4 mr-2" />
                Reset to Default
              </Button>
              <p className="text-xs text-muted-foreground">
                Restore default settings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">Debug panel</p>
            <p className="text-xs text-gray-500">
              System information and debugging tools
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}