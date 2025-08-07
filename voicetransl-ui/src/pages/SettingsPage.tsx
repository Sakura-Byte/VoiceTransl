import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AccessibleTabs, TabList, Tab, TabPanels, TabPanel } from '@/components/accessibility/AccessibleTabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Mic, 
  Languages, 
  Server, 
  Sliders, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  Shield,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'
import TranscriptionSettingsTab from '@/components/settings/TranscriptionSettingsTab'
import TranslationSettingsTab from '@/components/settings/TranslationSettingsTab'
import ServerSettingsTab from '@/components/settings/ServerSettingsTab'
import AdvancedSettingsTab from '@/components/settings/AdvancedSettingsTab'

const settingsTabs = [
  {
    id: 'transcription',
    label: 'Transcription',
    icon: Mic,
    description: 'Audio & Video Processing',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    id: 'translation',
    label: 'Translation',
    icon: Languages,
    description: 'Language Models & APIs',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'server',
    label: 'Server',
    icon: Server,
    description: 'Connection & Performance',
    color: 'from-purple-500 to-violet-500'
  },
  {
    id: 'advanced',
    label: 'Advanced',
    icon: Sliders,
    description: 'Expert Configuration',
    color: 'from-amber-500 to-orange-500'
  }
]

export default function SettingsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [hasChanges, setHasChanges] = useState(false)
  
  // Extract tab from URL path
  const getTabFromPath = () => {
    const path = location.pathname.replace('/settings/', '') || location.pathname.replace('/settings', '')
    const validTabs = settingsTabs.map(tab => tab.id)
    return validTabs.includes(path) ? path : 'transcription'
  }
  
  const [activeTab, setActiveTab] = useState(getTabFromPath())
  
  // Update tab when URL changes
  useEffect(() => {
    const newTab = getTabFromPath()
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [location.pathname])
  
  // Handle tab change and update URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    navigate(`/settings/${tab}`)
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-gradient-to-br from-gray-50 via-blue-50/50 to-indigo-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-indigo-950/10">
      {/* Premium Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-conic from-blue-100/20 via-transparent to-purple-100/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-conic from-green-100/20 via-transparent to-blue-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full flex-1 px-6 py-8 flex flex-col">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-gray-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                    Settings
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-gray-400 font-medium">
                    Configure your VoiceTransl experience
                  </p>
                </div>
              </div>
            </div>

            {/* Premium Action Bar */}
            <div className="flex items-center gap-3">
              {hasChanges && (
                <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
                  <AlertCircle className="w-3 h-3" />
                  Unsaved changes
                </Badge>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2 font-medium"
                onClick={() => setHasChanges(false)}
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              
              <Button 
                size="sm"
                className={cn(
                  "gap-2 font-bold transition-all duration-300",
                  hasChanges 
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl" 
                    : "bg-gradient-to-r from-gray-600 to-gray-700"
                )}
                disabled={!hasChanges}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </div>

          {/* Status Bar */}
          <Card className="border-0 bg-white/60 dark:bg-black/20 backdrop-blur-sm shadow-lg">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      All Systems Operational
                    </span>
                  </div>
                  
                  <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Configuration Valid
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Performance: Optimal</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    <span>Security: Enabled</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Premium Tabbed Interface */}
        <AccessibleTabs activeTab={activeTab} onTabChange={handleTabChange} className="w-full space-y-8 flex-1 flex flex-col">
          {/* Custom Tab Navigation */}
          <div className="relative">
            <Card className="border-0 bg-white/70 dark:bg-black/30 backdrop-blur-xl shadow-2xl">
              <TabList className="grid w-full grid-cols-4 bg-transparent p-2 h-auto">
                {settingsTabs.map((tab) => (
                  <Tab
                    key={tab.id}
                    id={tab.id}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-xl transition-all duration-300 font-semibold",
                      "aria-selected:bg-white dark:aria-selected:bg-gray-800",
                      "aria-selected:shadow-xl aria-selected:scale-105",
                      "hover:bg-white/50 dark:hover:bg-gray-800/50",
                      "focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none !border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                      activeTab === tab.id 
                        ? `bg-gradient-to-br ${tab.color} shadow-lg text-white`
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    )}>
                      <tab.icon className="w-6 h-6" />
                    </div>
                    
                    <div className="text-center space-y-1">
                      <div className="text-sm font-bold">{tab.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {tab.description}
                      </div>
                    </div>
                  </Tab>
                ))}
              </TabList>
            </Card>
          </div>

          {/* Tab Content - Flex container to fill width */}
          <div className="w-full flex-1 flex flex-col">
            <TabPanels className="w-full flex-1 flex flex-col">
              <TabPanel id="transcription" className="w-full flex-1 flex flex-col">
                <TranscriptionSettingsTab onSettingsChange={() => setHasChanges(true)} />
              </TabPanel>

              <TabPanel id="translation" className="w-full flex-1 flex flex-col">
                <TranslationSettingsTab onSettingsChange={() => setHasChanges(true)} />
              </TabPanel>

              <TabPanel id="server" className="w-full flex-1 flex flex-col">
                <ServerSettingsTab onSettingsChange={() => setHasChanges(true)} />
              </TabPanel>

              <TabPanel id="advanced" className="w-full flex-1 flex flex-col">
                <AdvancedSettingsTab onSettingsChange={() => setHasChanges(true)} />
              </TabPanel>
            </TabPanels>
          </div>
        </AccessibleTabs>
      </div>
    </div>
  )
}