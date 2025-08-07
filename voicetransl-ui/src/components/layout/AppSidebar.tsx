import { useLocation, Link } from 'react-router-dom'
import { AudioWaveform, Settings, FileAudio, Activity, ScrollText, Server, Languages, Wrench, User, ChevronRight, MoreHorizontal, Crown, Sparkles, Circle } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useActiveTasks, useServerStatus } from '@/hooks/api'
import { useWebSocketIntegration } from '@/hooks/websocket'

// Main navigation items
const navigationItems = [
  {
    title: 'Dashboard',
    url: '/',
    icon: AudioWaveform,
    description: 'File upload and task overview',
  },
  {
    title: 'Tasks',
    url: '/tasks',
    icon: Activity,
    description: 'Task progress and history',
  },
  {
    title: 'Settings',
    icon: Settings,
    description: 'Configuration and preferences',
    items: [
      {
        title: 'Transcription',
        url: '/settings/transcription',
        icon: FileAudio,
        description: 'Audio transcription settings',
      },
      {
        title: 'Translation',
        url: '/settings/translation',
        icon: Languages,
        description: 'Translation configuration',
      },
      {
        title: 'Server',
        url: '/settings/server',
        icon: Server,
        description: 'API server settings',
      },
      {
        title: 'Advanced',
        url: '/settings/advanced',
        icon: Wrench,
        description: 'Advanced configuration',
      },
    ],
  },
  {
    title: 'Logs',
    url: '/logs',
    icon: ScrollText,
    description: 'Server logs and monitoring',
  },
]

export function AppSidebar() {
  const location = useLocation()
  const { data: activeTasks } = useActiveTasks()
  const { data: serverStatus } = useServerStatus()
  const webSocket = useWebSocketIntegration()

  const activeTaskCount = activeTasks ? Object.keys(activeTasks).length : 0
  const isServerHealthy = serverStatus?.healthy ?? false

  return (
    <Sidebar 
      collapsible="icon"
      className="group border-r border-border-primary/50 bg-surface-elevated/80 backdrop-blur-xl shadow-apple-lg transition-all duration-350 ease-out"
    >
      {/* Premium Header with Brand */}
      <SidebarHeader className="border-b border-border-secondary/50 bg-gradient-to-br from-surface-primary to-surface-secondary">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg"
              asChild
              className="group hover:bg-gradient-to-r hover:from-brand-50 hover:to-brand-100 dark:hover:from-brand-950 dark:hover:to-brand-900 transition-all duration-300 ease-out rounded-xl p-3 shadow-apple-sm hover:shadow-apple-md"
            >
              <Link to="/">
                {/* Premium Logo with Gradient - responsive sizing */}
                <div className="relative flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-brand shadow-apple-md overflow-hidden group-data-[state=collapsed]:mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                  <AudioWaveform className="size-5 text-white relative z-10" />
                  <div className="absolute inset-0 rounded-xl ring-1 ring-white/20"></div>
                </div>
                
                {/* Premium Brand Typography - hidden when collapsed */}
                <div className="grid flex-1 text-left leading-tight ml-1 group-data-[state=collapsed]:hidden">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-heading-sm font-bold text-text-primary tracking-tight">
                      VoiceTransl
                    </span>
                    <div className="flex items-center">
                      <Crown className="h-3 w-3 text-warning-500" />
                      <span className="text-caption font-semibold text-warning-600 dark:text-warning-400 ml-0.5">
                        PRO
                      </span>
                    </div>
                  </div>
                  <span className="truncate text-body-sm text-text-tertiary font-medium">
                    AI Translation Suite
                  </span>
                </div>
                
                {/* Premium Status Indicators - minimal when collapsed */}
                <div className="flex items-center gap-1.5 group-data-[state=collapsed]:hidden">
                  {/* Connection Status */}
                  <div className={cn(
                    "relative w-2 h-2 rounded-full transition-apple",
                    webSocket.isConnected ? "bg-success-500 shadow-success-200/50" : "bg-error-500 shadow-error-200/50"
                  )}>
                    {webSocket.isConnected && (
                      <div className="absolute inset-0 rounded-full bg-success-400 animate-ping"></div>
                    )}
                  </div>
                  
                  {/* Server Health */}
                  {!isServerHealthy && (
                    <Badge className="h-5 px-1.5 text-caption font-medium border-0 bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-300 rounded-md shadow-apple-sm">
                      Offline
                    </Badge>
                  )}
                  
                  {/* Active Tasks */}
                  {activeTaskCount > 0 && (
                    <Badge className="h-5 px-1.5 text-caption font-semibold border-0 bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-300 rounded-md shadow-apple-sm animate-pulse">
                      {activeTaskCount}
                    </Badge>
                  )}
                </div>
                
                {/* Collapsed state indicator - only visible when collapsed */}
                <div className="hidden group-data-[state=collapsed]:flex absolute -bottom-1 -right-1">
                  <div className={cn(
                    "w-3 h-3 rounded-full border-2 border-surface-primary transition-apple",
                    webSocket.isConnected ? "bg-success-500" : "bg-error-500"
                  )}></div>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Premium Navigation Content */}
      <SidebarContent className="px-3 py-4 space-y-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-caption font-semibold text-text-tertiary uppercase tracking-wider mb-3 group-data-[collapsible=icon]:hidden transition-all duration-300 ease-out">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url
                const isSettingsExpanded = 
                  item.title === 'Settings' && location.pathname.startsWith('/settings')
                const isSettingsActive = location.pathname.startsWith('/settings')

                return (
                  <SidebarMenuItem key={item.title}>
                    {item.items ? (
                      <Collapsible
                        asChild
                        defaultOpen={isSettingsExpanded}
                        className="group/collapsible"
                      >
                        <>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton 
                              tooltip={item.title}
                              className={cn(
                                "group relative w-full rounded-xl p-3 transition-apple hover:shadow-apple-sm",
                                "hover:bg-gradient-to-r hover:from-surface-secondary hover:to-surface-tertiary",
                                "data-[state=open]:bg-gradient-to-r data-[state=open]:from-surface-secondary data-[state=open]:to-surface-tertiary",
                                "group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:items-center group-data-[state=collapsed]:p-2",
                                isSettingsActive && [
                                  "bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900",
                                  "text-brand-700 dark:text-brand-300",
                                  "shadow-apple-sm ring-1 ring-brand-200 dark:ring-brand-800"
                                ]
                              )}
                            >
                              {/* Premium Icon - responsive centering for collapsed state */}
                              <div className={cn(
                                "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out",
                                "group-data-[state=collapsed]:w-8 group-data-[state=collapsed]:h-8",
                                isSettingsActive
                                  ? "bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 text-brand-600 dark:text-brand-400 shadow-apple-sm"
                                  : "text-text-tertiary group-hover:text-text-primary"
                              )}>
                                {item.icon && <item.icon className="h-4 w-4" />}
                              </div>
                              
                              <span className={cn(
                                "font-medium transition-apple group-data-[state=collapsed]:hidden",
                                isSettingsActive ? "text-brand-700 dark:text-brand-300" : "text-text-primary"
                              )}>
                                {item.title}
                              </span>
                              
                              <ChevronRight className={cn(
                                "ml-auto h-4 w-4 transition-apple duration-300 group-data-[state=collapsed]:hidden",
                                "group-data-[state=open]/collapsible:rotate-90",
                                isSettingsActive ? "text-brand-600 dark:text-brand-400" : "text-text-tertiary"
                              )} />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="mt-1 group-data-[state=collapsed]:hidden">
                            <SidebarMenuSub className="ml-3 space-y-1 border-l border-border-secondary/50 pl-3">
                              {item.items.map((subItem) => {
                                const isSubActive = location.pathname === subItem.url
                                return (
                                  <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                      asChild
                                      className={cn(
                                        "group relative w-full rounded-lg p-2.5 transition-apple hover:shadow-apple-sm",
                                        "hover:bg-gradient-to-r hover:from-surface-secondary hover:to-surface-tertiary",
                                        isSubActive && [
                                          "bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900",
                                          "text-brand-700 dark:text-brand-300",
                                          "shadow-apple-sm ring-1 ring-brand-200 dark:ring-brand-800"
                                        ]
                                      )}
                                    >
                                      <Link to={subItem.url}>
                                        {/* Premium Sub-Icon */}
                                        <div className={cn(
                                          "w-5 h-5 rounded-md flex items-center justify-center transition-apple",
                                          isSubActive
                                            ? "bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 text-brand-600 dark:text-brand-400 shadow-apple-sm"
                                            : "text-text-tertiary group-hover:text-text-primary"
                                        )}>
                                          {subItem.icon && <subItem.icon className="h-3 w-3" />}
                                        </div>
                                        
                                        <span className={cn(
                                          "text-body-sm font-medium transition-apple",
                                          isSubActive ? "text-brand-700 dark:text-brand-300" : "text-text-secondary"
                                        )}>
                                          {subItem.title}
                                        </span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                )
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    ) : (
                      <SidebarMenuButton
                        tooltip={item.title}
                        asChild
                        className={cn(
                          "group relative w-full rounded-xl p-3 transition-apple hover:shadow-apple-sm",
                          "hover:bg-gradient-to-r hover:from-surface-secondary hover:to-surface-tertiary",
                          "group-data-[state=collapsed]:flex group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:items-center group-data-[state=collapsed]:p-2",
                          isActive && [
                            "bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-950 dark:to-brand-900",
                            "text-brand-700 dark:text-brand-300",
                            "shadow-apple-sm ring-1 ring-brand-200 dark:ring-brand-800"
                          ]
                        )}
                      >
                        <Link to={item.url || '#'}>
                          {/* Premium Icon - responsive centering for collapsed state */}
                          <div className={cn(
                            "w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300 ease-in-out",
                            "group-data-[state=collapsed]:w-8 group-data-[state=collapsed]:h-8",
                            isActive
                              ? "bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-800 dark:to-brand-900 text-brand-600 dark:text-brand-400 shadow-apple-sm"
                              : "text-text-tertiary group-hover:text-text-primary"
                          )}>
                            {item.icon && <item.icon className="h-4 w-4" />}
                          </div>
                          
                          <span className={cn(
                            "font-medium transition-apple group-data-[state=collapsed]:hidden",
                            isActive ? "text-brand-700 dark:text-brand-300" : "text-text-primary"
                          )}>
                            {item.title}
                          </span>
                          
                          {/* Premium Task Badge */}
                          {item.title === 'Tasks' && activeTaskCount > 0 && (
                            <Badge className="ml-auto h-5 px-1.5 text-caption border-0 bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300 rounded-md shadow-apple-sm animate-pulse font-semibold group-data-[state=collapsed]:hidden">
                              {activeTaskCount}
                            </Badge>
                          )}
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Premium Footer */}
      <SidebarFooter className="border-t border-border-secondary/50 bg-gradient-to-br from-surface-primary to-surface-secondary p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="sm"
              tooltip="Local User Account"
              className={cn(
                "group relative w-full rounded-xl p-3 transition-apple hover:shadow-apple-sm",
                "hover:bg-gradient-to-r hover:from-surface-secondary hover:to-surface-tertiary",
                "data-[state=open]:bg-gradient-to-r data-[state=open]:from-surface-secondary data-[state=open]:to-surface-tertiary",
                "group-data-[state=collapsed]:justify-center group-data-[state=collapsed]:p-2"
              )}
            >
              {/* Premium User Avatar */}
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 flex items-center justify-center shadow-apple-sm border border-border-primary group-data-[state=collapsed]:relative">
                <User className="h-4 w-4 text-text-tertiary" />
                {/* Status indicator for collapsed state */}
                <div className="hidden group-data-[state=collapsed]:block absolute -bottom-0.5 -right-0.5">
                  <Circle className="h-2 w-2 fill-success-500 text-success-500" />
                </div>
              </div>
              
              {/* User info - hidden when collapsed */}
              <div className="flex-1 min-w-0 group-data-[state=collapsed]:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-body-sm font-semibold text-text-primary truncate">
                    Local User
                  </span>
                  <div className="flex items-center">
                    <Circle className="h-2 w-2 fill-success-500 text-success-500" />
                    <span className="text-caption text-success-600 dark:text-success-400 ml-1 font-medium">
                      Active
                    </span>
                  </div>
                </div>
                <p className="text-caption text-text-tertiary truncate">
                  Offline Mode • Premium
                </p>
              </div>
              
              <MoreHorizontal className="ml-auto h-4 w-4 text-text-tertiary group-hover:text-text-primary transition-apple group-data-[state=collapsed]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Premium Connection Status Footer - hidden when collapsed */}
        <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-surface-secondary to-surface-tertiary border border-border-primary shadow-apple-sm group-data-[state=collapsed]:hidden">
          <div className="flex items-center justify-between text-caption">
            <div className="flex items-center gap-2">
              {webSocket.isConnected ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
                  <span className="text-success-600 dark:text-success-400 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-error-500"></div>
                  <span className="text-error-600 dark:text-error-400 font-medium">Offline</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 text-text-tertiary">
              <Sparkles className="h-3 w-3" />
              <span className="font-mono font-medium">
                {serverStatus?.response_time_ms ? `${serverStatus.response_time_ms}ms` : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      
      {/* Premium Rail */}
      <SidebarRail className="bg-border-primary/30" />
    </Sidebar>
  )
}
