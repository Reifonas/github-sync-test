import React, { useEffect, useMemo, useCallback, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useSyncStore } from '../stores/syncStore'
import { useRoutineStore } from '../stores/routineStore'
import { AuthSection } from '../components/AuthSection'
import SyncSection from '../components/SyncSection'
import RoutineSection from '../components/RoutineSection'
import LogsSection from '../components/LogsSection'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { SINGLE_USER_ID } from '../config/constants'

const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const { 
    repositories, 
    syncOperations, 
    fetchRepositories, 
    fetchSyncOperations,
    initializeRealTime: initSyncRealTime,
    cleanupRealTime: cleanupSyncRealTime
  } = useSyncStore()
  const { 
    routines, 
    fetchRoutines,
    initializeRealTime: initRoutineRealTime,
    cleanupRealTime: cleanupRoutineRealTime
  } = useRoutineStore()

  // Memoized statistics to prevent unnecessary recalculations
  const stats = useMemo(() => ({
    totalRepos: repositories.length,
    activeOperations: syncOperations.filter(op => op.status === 'running').length,
    totalRoutines: routines.length
  }), [repositories.length, syncOperations, routines.length])

  // Memoized callbacks to prevent re-renders
  const handleInitialFetch = useCallback(() => {
    fetchRepositories()
    fetchSyncOperations()
    fetchRoutines()
  }, [fetchRepositories, fetchSyncOperations, fetchRoutines])

  const handleInitRealTime = useCallback(() => {
    initSyncRealTime(SINGLE_USER_ID)
    initRoutineRealTime(SINGLE_USER_ID)
  }, [initSyncRealTime, initRoutineRealTime])

  const handleCleanupRealTime = useCallback(() => {
    cleanupSyncRealTime()
    cleanupRoutineRealTime()
  }, [cleanupSyncRealTime, cleanupRoutineRealTime])
  const [activeTab, setActiveTab] = useState('sync')

  useEffect(() => {
    // Only fetch data once when component mounts and user is available
    if (user) {
      // Fetch initial data only once
      handleInitialFetch()
      
      // Initialize real-time subscriptions
      handleInitRealTime()
      
      // Cleanup on unmount
      return handleCleanupRealTime
    }
  }, [user, handleInitialFetch, handleInitRealTime, handleCleanupRealTime])

  return (
    <div className="min-h-screen bg-background transition-theme">
      {/* Fixed Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
            {/* Title and Status */}
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
                Gatohub{' '}
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Sync Pro
                </span>
              </h1>
              <div className="flex sm:hidden items-center gap-1 bg-success/10 border border-success/20 text-success px-1.5 py-0.5 rounded-full text-xs font-medium">
                <div className="w-1 h-1 bg-success rounded-full animate-pulse" />
                <span className="text-xs">Online</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 bg-success/10 border border-success/20 text-success px-2 py-0.5 rounded-full text-xs font-medium">
                <div className="w-1 h-1 bg-success rounded-full animate-pulse" />
                <span>Online</span>
              </div>
            </div>
            
            {/* Compact Stats */}
            <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-2 md:gap-3 overflow-x-auto">
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-1.5 sm:px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                <span className="font-semibold">{stats.totalRepos}</span>
                <span className="hidden xs:inline sm:hidden md:inline text-muted-foreground text-xs">Repos</span>
                <span className="hidden lg:inline text-muted-foreground">Repositórios</span>
              </div>
              <div className="flex items-center gap-1 bg-success/10 text-success px-1.5 sm:px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                <span className="font-semibold">{stats.activeOperations}</span>
                <span className="hidden xs:inline sm:hidden md:inline text-muted-foreground text-xs">Ops</span>
                <span className="hidden lg:inline text-muted-foreground">Operações</span>
              </div>
              <div className="flex items-center gap-1 bg-info/10 text-info px-1.5 sm:px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                <span className="font-semibold">{stats.totalRoutines}</span>
                <span className="hidden xs:inline sm:hidden md:inline text-muted-foreground text-xs">Rot</span>
                <span className="hidden lg:inline text-muted-foreground">Rotinas</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 md:py-8 pt-24 sm:pt-20">
        {/* Main Content with Tabs */}
        <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 lg:space-y-12">
          <AuthSection />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-xs sm:max-w-md mx-auto mb-6 sm:mb-8">
              <TabsTrigger value="sync" className="text-xs sm:text-sm px-2 sm:px-4">Sincronização</TabsTrigger>
              <TabsTrigger value="routines" className="text-xs sm:text-sm px-2 sm:px-4">Rotinas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sync" className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                <div className="lg:col-span-2 xl:col-span-2 min-w-0">
                  <SyncSection />
                </div>
                <div className="lg:col-span-1 xl:col-span-1 min-w-0">
                  <LogsSection />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="routines" className="space-y-6 sm:space-y-8">
              <RoutineSection />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Mobile Navigation Helper */}
        <div className="xl:hidden fixed bottom-4 right-4 z-40">
          <button 
            className="bg-primary text-primary-foreground p-2.5 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 backdrop-blur-sm"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Voltar ao topo"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  )
}

export { Dashboard }
export default Dashboard