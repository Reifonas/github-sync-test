import React, { useState, useEffect, useRef } from 'react'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { ScrollArea } from './ui/scroll-area'
import { Separator } from './ui/separator'
import { Terminal, Download, Trash2, Filter, Search, CheckCircle, XCircle, AlertCircle, Info, RefreshCw, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { localStorageService } from '../services/localStorageService'
import RealTimeLogs from './RealTimeLogs' // Importar o componente RealTimeLogs

interface LogEntry {
  id: string
  timestamp: Date
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  operation?: string
  repository?: string
}

export const LogsSection: React.FC = () => {
  const { user } = useAuthStore()
  const { operations: syncOperations } = useSyncStore() // Renomear para evitar conflito
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [localLogs, setLocalLogs] = useState<any[]>([]) // Renomear para evitar conflito
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  // Encontrar a operação de sincronização mais recente que está 'running'
  const runningOperation = syncOperations.find(op => op.status === 'running')
  const activeOperationId = runningOperation?.id || null

  useEffect(() => {
    if (user && !activeOperationId) { // Só busca logs gerais se não houver operação ativa
      fetchLogs()
      setupRealtimeSubscription()
    }
  }, [user, activeOperationId]) // Adicionar activeOperationId como dependência

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [localLogs, autoScroll, activeOperationId]) // Adicionar activeOperationId como dependência

  const fetchLogs = async () => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const logs = await localStorageService.getLogs(user.id) // Passar user.id
      const formattedLogs = logs.map(log => ({
        ...log,
        operation_name: log.metadata?.category || 'sync',
        repository_name: log.metadata?.repository || 'N/A'
      }))
      
      setLocalLogs(formattedLogs)
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    // Real-time updates removed - using local storage only
    // Logs are automatically updated when new entries are added
    // Removed automatic polling to prevent constant refresh
    return () => {
      // No cleanup needed
    }
  }

  const filteredLogs = localLogs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.operation_name && log.operation_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.repository_name && log.repository_name.toLowerCase().includes(searchTerm.toLowerCase()))
    
    return matchesFilter && matchesSearch
  })

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'info':
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      case 'info':
        return 'text-blue-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const exportLogs = () => {
    const logText = filteredLogs
      .map(log => `[${formatTimestamp(log.created_at)}] [${log.level.toUpperCase()}] ${log.operation_name || 'N/A'} - ${log.message}`)
      .join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync-logs-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logsContainerRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setAutoScroll(isAtBottom)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 shadow-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 overflow-hidden">
        <CardHeader className="pb-4 px-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-800 rounded-xl flex-shrink-0">
                <Terminal className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-lg sm:text-2xl text-gray-900 dark:text-white truncate">
                  Logs de Sincronização
                </CardTitle>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                  Monitore as operações em tempo real
                </p>
              </div>
            </div>
            
            {/* Buttons Section */}
            <div className="flex items-center justify-end gap-2 flex-shrink-0">
              <Button
                onClick={fetchLogs}
                disabled={isLoading || !!activeOperationId}
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 sm:px-3 bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 disabled:opacity-50 text-xs sm:text-sm"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline">Atualizar</span>
                <span className="xs:hidden">↻</span>
              </Button>
              
              <Button
                onClick={exportLogs}
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 sm:px-3 bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 text-xs sm:text-sm"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Exportar</span>
                <span className="xs:hidden">↓</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      {!activeOperationId && (
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search */}
              <div className="w-full">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 dark:text-emerald-400 w-3 h-3 sm:w-4 sm:h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar nos logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 h-9 sm:h-11 border-emerald-200 dark:border-emerald-700 focus:border-emerald-400 dark:focus:border-emerald-500 focus:ring-emerald-400/20 dark:focus:ring-emerald-500/20 bg-white dark:bg-gray-800 transition-all duration-200 text-sm"
                  />
                </div>
              </div>
              
              {/* Filter and Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
                    <SelectTrigger className="w-32 sm:w-40 h-9 sm:h-11 border-emerald-200 dark:border-emerald-700 focus:border-emerald-400 dark:focus:border-emerald-500 focus:ring-emerald-400/20 dark:focus:ring-emerald-500/20 bg-white dark:bg-gray-800 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os níveis</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Auto-scroll toggle */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    id="autoScroll"
                    checked={autoScroll}
                    onCheckedChange={setAutoScroll}
                    className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500"
                  />
                  <label htmlFor="autoScroll" className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
                    <span className="hidden sm:inline">Auto-scroll</span>
                    <span className="sm:hidden">Auto</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Terminal */}
      <Card className="border-0 shadow-xl bg-gray-900 dark:bg-gray-950 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-900 dark:to-gray-800 px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between border-b border-gray-700 dark:border-gray-600 min-h-0">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-red-500 rounded-full shadow-sm"></div>
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-yellow-500 rounded-full shadow-sm"></div>
              <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full shadow-sm"></div>
            </div>
            <div className="h-3 w-px bg-gray-600 dark:bg-gray-500 flex-shrink-0 mx-1"></div>
            <span className="text-gray-300 dark:text-gray-200 text-xs font-medium truncate flex-1 min-w-0">
              <span className="hidden sm:inline">Terminal de Logs</span>
              <span className="sm:hidden">Logs</span>
            </span>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2">
            {activeOperationId && (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs px-1 py-0.5 h-5 flex items-center">
                <div className="w-1 h-1 bg-emerald-500 rounded-full mr-1 animate-pulse" />
                <span className="hidden sm:inline text-xs">Ativa</span>
                <span className="sm:hidden text-xs">•</span>
              </Badge>
            )}
            <span className="text-gray-400 dark:text-gray-300 text-xs font-mono truncate max-w-20 sm:max-w-none">
              {activeOperationId ? (
                <span className="hidden sm:inline">Tempo Real</span>
              ) : (
                <span className="hidden sm:inline">{filteredLogs.length} {filteredLogs.length === 1 ? 'entrada' : 'entradas'}</span>
              )}
              <span className="sm:hidden">{activeOperationId ? '●' : filteredLogs.length}</span>
            </span>
          </div>
        </div>
        
        {activeOperationId ? (
          <RealTimeLogs operationId={activeOperationId} className="border-0 shadow-none rounded-none" />
        ) : (
          <div 
            ref={logsContainerRef}
            onScroll={handleScroll}
            className="h-8 sm:h-10 overflow-y-auto p-0.5 sm:p-1 font-mono text-[10px] bg-gray-900 dark:bg-gray-950 scrollbar-thin scrollbar-thumb-gray-600 dark:scrollbar-thumb-gray-500 scrollbar-track-gray-800 dark:scrollbar-track-gray-900"
          >
            {isLoading && localLogs.length === 0 ? (
              <div className="text-center py-0.5 px-1">
                <div className="flex items-center justify-center gap-1">
                  <RefreshCw className="w-2 h-2 text-emerald-400 dark:text-emerald-300 animate-spin" />
                  <span className="text-[10px] text-gray-300 dark:text-gray-200">Carregando...</span>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-0.5 px-1">
                <div className="flex items-center justify-center gap-1">
                  <Terminal className="w-2 h-2 text-gray-400 dark:text-gray-300" />
                  <span className="text-[10px] text-gray-300 dark:text-gray-200">
                    {searchTerm ? 'Nenhum resultado' : 'Sem logs'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {filteredLogs.map((log, index) => (
                  <div 
                    key={log.id || index} 
                    className="group flex items-center gap-0.5 p-0.5 rounded bg-gray-800/20 dark:bg-gray-900/20 hover:bg-gray-800/40 dark:hover:bg-gray-900/40 border border-gray-700/30 dark:border-gray-600/30 hover:border-emerald-600/20 dark:hover:border-emerald-500/20 transition-all duration-200"
                  >
                    <span className="text-gray-500 dark:text-gray-400 text-[9px] flex-shrink-0 font-mono w-6 truncate leading-none">
                      {formatTimestamp(log.created_at).split(' ')[1]}
                    </span>
                    
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <div className={`w-0.5 h-0.5 rounded-full ${
                        log.level === 'error' ? 'bg-red-500' :
                        log.level === 'warning' ? 'bg-yellow-500' :
                        log.level === 'info' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`} />
                      <Badge className={`text-[8px] font-medium px-0.5 py-0 h-2 leading-none ${
                        log.level === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' :
                        log.level === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                        log.level === 'info' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800'
                      }`}>
                        {log.level.charAt(0).toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-0.5">
                        {log.operation_name && (
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800 text-[8px] px-0.5 py-0 h-2 leading-none">
                            {log.operation_name.substring(0, 2)}
                          </Badge>
                        )}
                        
                        {log.repository_name && log.repository_name !== 'N/A' && (
                          <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800 text-[8px] px-0.5 py-0 h-2 leading-none">
                            {log.repository_name.substring(0, 6)}
                          </Badge>
                        )}
                        
                        <span className="text-gray-300 dark:text-gray-200 text-[10px] break-words leading-none truncate">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        )}
      </Card>
      
      {/* Status Bar */}
      <Card className="border-0 shadow-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
                } shadow-lg`}></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status: {isLoading ? 'Carregando...' : 'Conectado'}
                </span>
              </div>
              <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Última atualização: {localLogs.length > 0 ? formatTimestamp(localLogs[localLogs.length - 1].created_at) : 'N/A'}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {filteredLogs.filter(l => l.level === 'error').length}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">erros</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {filteredLogs.filter(l => l.level === 'warning').length}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">avisos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {filteredLogs.filter(l => l.level === 'info').length}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">info</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LogsSection