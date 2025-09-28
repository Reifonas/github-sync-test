import React, { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Terminal, X, Download } from 'lucide-react'

interface LogEntry {
  id: string
  type: string
  level: 'info' | 'error' | 'warning' | 'success'
  message: string
  operationId: string
  timestamp: string
}

interface RealTimeLogsProps {
  operationId: string
  onClose?: () => void
  className?: string
}

const RealTimeLogs: React.FC<RealTimeLogsProps> = ({ operationId, onClose, className }) => {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Conectar ao SSE para logs em tempo real
    const connectToLogs = () => {
      const eventSource = new EventSource(`/api/sync/operations/${operationId}/logs`)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        console.log('Conectado aos logs em tempo real')
      }

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data)
          setLogs(prevLogs => {
            const newLogs = [...prevLogs, logData]
            // Manter apenas os últimos 100 logs para performance
            return newLogs.slice(-100)
          })
        } catch (error) {
          console.error('Erro ao processar log:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('Erro na conexão SSE:', error)
        setIsConnected(false)
        // Tentar reconectar após 3 segundos
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToLogs()
          }
        }, 3000)
      }
    }

    connectToLogs()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [operationId])

  // Auto-scroll para o final quando novos logs chegam
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [logs])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    }
  }

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n')
    
    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sync-logs-${operationId}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={`border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ${className}`}>
      <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-t-xl border-b border-emerald-100 dark:border-emerald-800 pb-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-1">
            <div className="p-0.5 bg-emerald-100 dark:bg-emerald-800 rounded">
              <Terminal className="h-2 w-2 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1">
              <CardTitle className="text-xs text-gray-900 dark:text-white">Logs Tempo Real</CardTitle>
              <Badge className={`w-fit text-[8px] px-1 py-0 h-3 ${
                isConnected 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
              }`}>
                <div className={`w-1 h-1 rounded-full mr-1 ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                {isConnected ? 'On' : 'Off'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={exportLogs}
              disabled={logs.length === 0}
              className="h-5 px-1 text-[8px] bg-white dark:bg-gray-800 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200"
            >
              <Download className="h-2 w-2 mr-1" />
              Export
            </Button>
            {onClose && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onClose}
                className="h-5 w-5 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
              >
                <X className="h-2 w-2" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-1">
        <ScrollArea className="h-8 w-full rounded border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50" ref={scrollAreaRef}>
          <div className="p-0.5 space-y-0">
            {logs.length === 0 ? (
              <div className="text-center py-1">
                <div className="p-0.5 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded w-fit mx-auto mb-1">
                  <Terminal className="h-2 w-2 text-emerald-400 dark:text-emerald-300 mx-auto" />
                </div>
                <h3 className="text-[10px] font-semibold text-gray-900 dark:text-white mb-0.5">
                  Aguardando...
                </h3>
                <p className="text-[8px] text-gray-500 dark:text-gray-400">
                  Logs em tempo real
                </p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div 
                  key={`${log.id}-${index}`} 
                  className="group flex items-start gap-0.5 p-0.5 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-sm hover:border-emerald-200 dark:hover:border-emerald-700 transition-all duration-200"
                >
                  <Badge className={`text-[8px] font-medium shrink-0 px-0.5 py-0 h-2 leading-none ${getLevelColor(log.level)}`}>
                    {log.level === 'error' ? '✗' : log.level === 'warning' ? '⚠' : log.level === 'success' ? '✓' : 'ℹ'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-mono text-gray-900 dark:text-white break-words leading-none truncate">
                      {log.message}
                    </p>
                    <p className="text-[8px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5 leading-none">
                      <div className="w-0.5 h-0.5 bg-gray-400 rounded-full" />
                      {new Date(log.timestamp).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default RealTimeLogs