import React, { useState, useEffect } from 'react'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import { 
  History as HistoryIcon, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  GitBranch,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ExternalLink,
  Github
} from 'lucide-react'
import { toast } from 'sonner'

interface OperationDetails {
  id: string
  operation_name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_at: string
  error_message?: string
  repository: {
    id: string
    name: string
    html_url: string
    private: boolean
  }
  logs: Array<{
    id: string
    level: 'info' | 'success' | 'warning' | 'error'
    message: string
    created_at: string
  }>
}

export const History: React.FC = () => {
  const { user } = useAuthStore()
  const { operations, fetchOperations, cancelOperation } = useSyncStore()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOperation, setSelectedOperation] = useState<OperationDetails | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'running' | 'completed' | 'failed'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  useEffect(() => {
    if (user) {
      loadOperations()
    }
  }, [user])

  const loadOperations = async () => {
    try {
      setIsLoading(true)
      await fetchOperations()
    } catch (error) {
      console.error('Error loading operations:', error)
      toast.error('Erro ao carregar histórico')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelOperation = async (operationId: string) => {
    try {
      await cancelOperation(operationId)
      toast.success('Operação cancelada com sucesso')
      await loadOperations()
    } catch (error) {
      console.error('Error canceling operation:', error)
      toast.error('Erro ao cancelar operação')
    }
  }

  const getFilteredOperations = () => {
    let filtered = operations

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter(op => op.status === filter)
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(op => 
        (op as any).repository?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (op as any).sync_type?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      filtered = filtered.filter(op => {
        const opDate = new Date((op as any).created_at || (op as any).started_at)
        
        switch (dateFilter) {
          case 'today':
            return opDate >= today
          case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
            return opDate >= weekAgo
          case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            return opDate >= monthAgo
          default:
            return true
        }
      })
    }

    return filtered.sort((a, b) => new Date((b as any).created_at || (b as any).started_at).getTime() - new Date((a as any).created_at || (a as any).started_at).getTime())
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />
      case 'running':
        return <RefreshCw className="w-4 h-4 text-info animate-spin" />
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success" size="lg">Concluído</Badge>
      case 'failed':
        return <Badge variant="destructive" size="lg">Falhou</Badge>
      case 'running':
        return <Badge variant="info" size="lg" className="animate-pulse">Executando</Badge>
      case 'pending':
        return <Badge variant="warning" size="lg">Pendente</Badge>
      default:
        return <Badge variant="outline" size="lg">{status}</Badge>
    }
  }

  const getSyncTypeIcon = (syncType: string) => {
    switch (syncType) {
      case 'pull':
        return <Download className="w-4 h-4" />
      case 'push':
        return <Upload className="w-4 h-4" />
      case 'bidirectional':
        return <RefreshCw className="w-4 h-4" />
      default:
        return <GitBranch className="w-4 h-4" />
    }
  }

  const getSyncTypeLabel = (syncType: string) => {
    switch (syncType) {
      case 'pull':
        return 'Pull (Baixar)'
      case 'push':
        return 'Push (Enviar)'
      case 'bidirectional':
        return 'Bidirecional'
      default:
        return syncType
    }
  }

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)
    
    if (duration < 60) {
      return `${duration}s`
    } else if (duration < 3600) {
      return `${Math.floor(duration / 60)}m ${duration % 60}s`
    } else {
      const hours = Math.floor(duration / 3600)
      const minutes = Math.floor((duration % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  const filteredOperations = getFilteredOperations()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="container-fluid">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded-lg w-1/4 animate-skeleton"></div>
            <Card className="card-elevated animate-slide-in">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded-lg animate-skeleton"></div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-5 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="card-elevated">
                    <CardContent className="p-4">
                      <div className="h-20 bg-muted rounded-lg animate-skeleton"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="xl:col-span-7">
                <Card className="card-elevated">
                  <CardContent className="p-6">
                    <div className="h-96 bg-muted rounded-lg animate-skeleton"></div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="container-fluid">
        {/* Header */}
        <div className="mb-8 animate-slide-in">
          <div className="flex items-center space-x-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HistoryIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Histórico de Sincronizações
              </h1>
              <p className="text-muted-foreground mt-1">
                Visualize e gerencie todas as suas operações de sincronização
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="card-elevated mb-6 animate-slide-in">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar repositórios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  variant="modern"
                  size="lg"
                />
              </div>
              
              <Select value={filter} onValueChange={(value: 'all' | 'pending' | 'running' | 'completed' | 'failed') => setFilter(value)}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="running">Executando</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateFilter} onValueChange={(value: 'all' | 'today' | 'week' | 'month') => setDateFilter(value)}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as datas</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={loadOperations} variant="outline" size="lg" className="hover-lift">
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Operations List */}
          <div className="xl:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Operações ({filteredOperations.length})
              </h2>
              <Badge variant="secondary" size="lg">
                {filteredOperations.filter(op => op.status === 'running').length} ativas
              </Badge>
            </div>
            
            {filteredOperations.length === 0 ? (
              <Card className="card-elevated animate-slide-in">
                <CardContent className="text-center py-12">
                  <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-4">
                    <HistoryIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium text-foreground mb-2">
                    Nenhuma operação encontrada
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm || filter !== 'all' || dateFilter !== 'all'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Suas operações de sincronização aparecerão aqui'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredOperations.map((operation, index) => (
                  <Card 
                    key={operation.id} 
                    className={`card-interactive cursor-pointer hover-lift animate-slide-in ${
                      selectedOperation?.id === operation.id ? 'ring-2 ring-primary shadow-medium' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => setSelectedOperation(operation as any)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-1.5 bg-muted/30 rounded-lg">
                            {getStatusIcon(operation.status)}
                          </div>
                          <span className="font-medium text-foreground">
                            {(operation as any).repository?.name || 'Repositório desconhecido'}
                          </span>
                        </div>
                        {getStatusBadge(operation.status)}
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            {getSyncTypeIcon(operation.operation_name)}
                            <span>{getSyncTypeLabel(operation.operation_name)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDuration(operation.created_at, null)}</span>
                          </div>
                        </div>
                        <span className="hidden sm:block">{new Date(operation.created_at).toLocaleString('pt-BR')}</span>
                      </div>
                      
                      {operation.status === 'running' && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <Button
                            size="sm"
                            variant="outline"
                            className="hover-scale"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelOperation(operation.id)
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Operation Details */}
          <div className="xl:col-span-7 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Detalhes da Operação
            </h2>
            
            {selectedOperation ? (
              <div className="space-y-4">
                {/* Operation Info */}
                <Card className="card-elevated animate-slide-in">
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="flex items-center justify-between text-foreground">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Github className="w-5 h-5 text-primary" />
                        </div>
                        <span>{selectedOperation.repository.name}</span>
                      </div>
                      {getStatusBadge(selectedOperation.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                      <div className="space-y-2">
                        <span className="text-muted-foreground font-medium">Tipo de Sincronização</span>
                        <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg">
                          {getSyncTypeIcon(selectedOperation.operation_name)}
                          <span className="font-medium text-foreground">{getSyncTypeLabel(selectedOperation.operation_name)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-muted-foreground font-medium">Duração</span>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="font-medium text-foreground">
                            {formatDuration(selectedOperation.created_at, null)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <span className="text-muted-foreground font-medium">Iniciado em</span>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="font-medium text-foreground">
                            {new Date(selectedOperation.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      

                    </div>
                    
                    {selectedOperation.error_message && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-1 bg-destructive/20 rounded-lg">
                            <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-destructive mb-2">Erro na Operação</p>
                            <p className="text-sm text-foreground bg-background/50 p-3 rounded-lg border">
                              {selectedOperation.error_message}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="lg"
                        className="hover-lift"
                        onClick={() => window.open(selectedOperation.repository.html_url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ver no GitHub
                      </Button>
                      
                      {selectedOperation.status === 'running' && (
                        <Button
                          size="lg"
                          variant="destructive"
                          className="hover-scale"
                          onClick={() => handleCancelOperation(selectedOperation.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar Operação
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Operation Logs */}
                <Card className="card-elevated animate-slide-in">
                  <CardHeader className="bg-muted/30 border-b border-border">
                    <CardTitle className="flex items-center space-x-3 text-foreground">
                      <div className="p-2 bg-info/10 rounded-lg">
                        <Eye className="w-5 h-5 text-info" />
                      </div>
                      <span>Logs da Operação</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="bg-background border border-border rounded-lg p-4 max-h-64 overflow-y-auto custom-scrollbar font-mono text-sm">
                      {selectedOperation.logs && selectedOperation.logs.length > 0 ? (
                        <div className="space-y-1">
                          {selectedOperation.logs.map((log) => (
                            <div key={log.id} className="flex items-start space-x-2">
                              <span className="text-muted-foreground text-xs w-16 flex-shrink-0">
                                {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                              </span>
                              <span className={`text-xs ${
                                log.level === 'error' ? 'text-destructive' :
                                log.level === 'warning' ? 'text-warning' :
                                log.level === 'success' ? 'text-success' :
                                'text-info'
                              }`}>
                                {log.level.toUpperCase()}
                              </span>
                              <span className="text-foreground flex-1">{log.message}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground py-4">
                          <p>Nenhum log disponível para esta operação</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="card-elevated animate-slide-in">
                <CardContent className="text-center py-16">
                  <div className="p-4 bg-muted/30 rounded-full w-fit mx-auto mb-6">
                    <Eye className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma operação selecionada
                  </h3>
                  <p className="text-muted-foreground">
                    Selecione uma operação na lista ao lado para visualizar os detalhes completos
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default History