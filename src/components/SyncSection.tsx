import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import { GitBranch, FolderOpen, Play, Square, Clock, CheckCircle, XCircle, AlertCircle, Settings, Github, Pause, RotateCcw, Trash2, ChevronDown, ChevronRight, RefreshCw, Download, Upload, Calendar, User, Hash, Edit3, Terminal, Eye, EyeOff, Plus, Edit2, X, Info } from 'lucide-react'
import { toast } from 'sonner'
import { githubService } from '../services/githubService'
import { connectionLogger } from '../services/connectionLogger'
import CreateRepositoryModal from './CreateRepositoryModal'
import { RenameRepositoryModal } from './RenameRepositoryModal'
import RealTimeLogs from './RealTimeLogs'

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string
  private: boolean
  html_url: string
  clone_url: string
  ssh_url: string
  language: string
  stargazers_count: number
  forks_count: number
  updated_at: string
  created_at: string
  default_branch: string
}

const SyncSection: React.FC = () => {
  const { user, githubConnection } = useAuthStore()
  const {
    repositories,
    syncOperations,
    isLoading,
    error,
    createSyncOperation,
    updateRepository,
    cancelSyncOperation,
    clearError,
    fetchRepositories,
    fetchSyncOperations
  } = useSyncStore()
  

  const [selectedGithubRepo, setSelectedGithubRepo] = useState('')
  const [localPath, setLocalPath] = useState('')
  const [syncType, setSyncType] = useState<'pull' | 'push' | 'bidirectional'>('pull')
  const [isCreating, setIsCreating] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([])
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false)
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [repositoryToRename, setRepositoryToRename] = useState<GitHubRepository | null>(null)
  const [showLogsFor, setShowLogsFor] = useState<string | null>(null)
  const [expandedOperations, setExpandedOperations] = useState<Set<string>>(new Set())
  // Removido folderInputRef pois a funcionalidade de seleção de pasta será removida

  // Função para buscar repositórios do GitHub
  const fetchGithubRepositories = async () => {
    if (!githubConnection.accessToken) {
      toast.error('Token do GitHub não encontrado. Faça login primeiro.')
      return
    }

    setLoadingGithubRepos(true)
    try {
      githubService.setAccessToken(githubConnection.accessToken)
      const repos = await githubService.getRepositories(1, 100)
      setGithubRepos(repos)
      
      if (repos.length === 0) {
        toast.info('Nenhum repositório encontrado na sua conta GitHub')
      }
    } catch (error: any) {
      console.error('Erro ao buscar repositórios:', error)
      toast.error(error.message || 'Erro ao buscar repositórios do GitHub')
    } finally {
      setLoadingGithubRepos(false)
    }
  }

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  // Buscar repositórios automaticamente quando o token estiver disponível
  useEffect(() => {
    if (githubConnection.accessToken) {
      fetchGithubRepositories()
    } else {
      setGithubRepos([])
    }
  }, [githubConnection.accessToken])

  // Manual refresh function for conditional updates
  const handleManualRefresh = useCallback(() => {
    if (githubConnection.accessToken) {
      fetchGithubRepositories()
      fetchRepositories()
      fetchSyncOperations()
    }
  }, [githubConnection.accessToken, fetchGithubRepositories, fetchRepositories, fetchSyncOperations])

  // Only refresh after sync operations complete
  useEffect(() => {
    const handleSyncComplete = () => {
      handleManualRefresh()
    }

    // Listen for sync completion events
    window.addEventListener('syncComplete', handleSyncComplete)
    return () => window.removeEventListener('syncComplete', handleSyncComplete)
  }, [handleManualRefresh])

  // Removido handleSelectFolder e handleFolderSelect

  const handleCreateSync = async () => {
    // Validação dos campos obrigatórios
    if (!selectedGithubRepo) {
      toast.error('Selecione um repositório do GitHub')
      return
    }

    if (!localPath.trim()) {
      toast.error('Especifique o caminho ABSOLUTO do repositório local')
      return
    }

    if (!user) {
      toast.error('Faça login para continuar')
      return
    }

    // Validação básica do caminho local (apenas para garantir que não está vazio)
    if (!localPath || localPath.trim().length === 0) {
      toast.error('Insira o caminho ABSOLUTO da pasta para o repositório local')
      return
    }

    const selectedGithubRepoData = githubRepos.find(r => r.full_name === selectedGithubRepo)
    if (!selectedGithubRepoData) {
      toast.error('Repositório do GitHub não encontrado')
      return
    }

    setIsCreating(true)
    try {
      // Criar sincronização com os novos dados
      await createSyncOperation({
        github_repo_full_name: selectedGithubRepoData.full_name,
        sync_type: syncType,
        options: {
          local_path: localPath, // Agora localPath deve ser o caminho absoluto
          commitMessage: `Sync: ${new Date().toISOString()}`
        }
      })
      
      toast.success('Operação de sincronização iniciada!')
      
      // Limpar campos após sucesso
      setSelectedGithubRepo('')
      setLocalPath('')
      setSyncType('pull')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar operação de sincronização')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateRepository = async (repoId: string, data: { local_path?: string; sync_enabled?: boolean }) => {
    try {
      await updateRepository(repoId, data)
      toast.success('Repositório atualizado com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar repositório')
    }
  }

  const handleCancelSync = async (operationId: string) => {
    try {
      await cancelSyncOperation(operationId)
      toast.success('Operação cancelada com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar operação')
    }
  }

  const handleRepositoryCreated = async (newRepo: any) => {
    try {
      // Atualizar a lista de repositórios
      await fetchGithubRepositories()
      
      // Selecionar automaticamente o repositório recém-criado
      setSelectedGithubRepo(newRepo.full_name)
      
      // Log da criação
      const owner = newRepo.full_name ? newRepo.full_name.split('/')[0] : 'unknown'
      await connectionLogger.logConnection({ // Usando connectionLogger
          timestamp: new Date().toISOString(),
          username: owner,
          status: 'success',
          apiStatus: 'valid'
        })
      
      toast.success(`Repositório '${newRepo.name}' criado e selecionado!`)
    } catch (error: any) {
      console.error('Erro ao atualizar lista após criação:', error)
      toast.error('Repositório criado, mas houve erro ao atualizar a lista')
    }
  }

  const handleRenameRepository = (repo: GitHubRepository) => {
    setRepositoryToRename(repo)
    setShowRenameModal(true)
  }

  const handleRepositoryRenamed = async (updatedRepo: GitHubRepository) => {
    try {
      // Atualizar a lista de repositórios
      await fetchGithubRepositories()
      
      // Se o repositório renomeado estava selecionado, atualizar a seleção
      if (selectedGithubRepo === repositoryToRename?.full_name) {
        setSelectedGithubRepo(updatedRepo.full_name)
      }
      
      // Log da renomeação
      const owner = updatedRepo.full_name ? updatedRepo.full_name.split('/')[0] : 'unknown'
      await connectionLogger.logConnection({ // Usando connectionLogger
          timestamp: new Date().toISOString(),
          username: owner,
          status: 'success',
          apiStatus: 'valid'
        })
      
      toast.success(`Repositório renomeado para '${updatedRepo.name}' com sucesso!`)
    } catch (error: any) {
      console.error('Erro ao atualizar lista após renomeação:', error)
      toast.error('Repositório renomeado, mas houve erro ao atualizar a lista')
    }
  }

  const toggleOperationExpansion = (operationId: string) => {
    setExpandedOperations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(operationId)) {
        newSet.delete(operationId)
      } else {
        newSet.add(operationId)
      }
      return newSet
    })
  }

  const toggleLogsView = (operationId: string) => {
    setShowLogsFor(prev => prev === operationId ? null : operationId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }



  return (
    <>
    <Card variant="elevated" className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 bg-primary/10 rounded-lg">
            <GitBranch className="h-5 w-5 text-primary" />
          </div>
          Configuração de Sincronização
        </CardTitle>
        <CardDescription className="text-base">
          Configure e execute operações de sincronização entre repositórios GitHub e local
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-6">
        {/* GitHub Repository Selection */}
        <div className="space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Github className="h-4 w-4 text-primary flex-shrink-0" />
              Repositório do GitHub
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreateRepoModal(true)}
              disabled={!githubConnection.accessToken}
              className="text-xs hover:scale-105 transition-transform flex-shrink-0"
            >
              <Github className="h-3 w-3 mr-1" />
              Criar Novo
            </Button>
          </div>
          <Select value={selectedGithubRepo} onValueChange={setSelectedGithubRepo}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingGithubRepos ? "Carregando repositórios..." : "Selecione um repositório do GitHub"} />
            </SelectTrigger>
            <SelectContent>
              {loadingGithubRepos ? (
                <SelectItem value="loading">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                </SelectItem>
              ) : (
                githubRepos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.full_name}>
                    <div className="flex items-center justify-between w-full max-w-full">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{repo.name}</span>
                        <span className="text-xs text-gray-500 truncate">{repo.full_name}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleRenameRepository(repo)
                        }}
                        className="h-6 w-6 p-0 hover:bg-gray-100 flex-shrink-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {!githubConnection.accessToken && (
            <p className="text-xs text-red-500">
              Faça login no GitHub para ver seus repositórios
            </p>
          )}
        </div>

        {/* Local Repository Path */}
        <div className="space-y-4 min-w-0">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
            Caminho do Repositório Local
          </label>
          <div className="relative">
            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Ex: C:\\Users\\SeuUsuario\\Documents\\GitHub\\SeuRepo"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              className="pl-10 h-12 w-full"
              variant="default"
            />
          </div>
          <div className="bg-muted/50 p-3 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Dica:</strong> Insira o caminho completo da pasta local do seu repositório
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Exemplo: <code className="bg-background px-1 rounded">C:\Users\SeuUsuario\Documents\GitHub\MeuProjeto</code>
            </p>
          </div>
        </div>

        {/* Sync Type */}
        <div className="space-y-4">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" />
            Tipo de Sincronização
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'pull', label: 'Pull', desc: 'Baixar do repositório', icon: Download },
              { value: 'push', label: 'Push', desc: 'Enviar para o repositório', icon: Upload },
              { value: 'bidirectional', label: 'Bidirecional', desc: 'Sincronização completa', icon: RefreshCw }
            ].map(({ value, label, desc, icon: Icon }) => (
              <div
                key={value}
                className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                  syncType === value
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => setSyncType(value as 'pull' | 'push' | 'bidirectional')}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <Icon className={`h-6 w-6 ${syncType === value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className={`font-medium text-sm ${syncType === value ? 'text-primary' : 'text-foreground'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                {syncType === value && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Advanced Options */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-0 h-auto font-normal text-sm"
          >
            <Settings className="h-4 w-4 mr-2" />
            Opções Avançadas
          </Button>
          {showAdvanced && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Caminho Local Personalizado</label>
                <div className="relative">
                  <FolderOpen className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Deixe vazio para usar o padrão"
                    value={localPath}
                    onChange={(e) => setLocalPath(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Se não especificado, será usado o caminho configurado no repositório
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <Button
            onClick={handleCreateSync}
            disabled={isCreating || isLoading || !selectedGithubRepo || !localPath}
            className="w-full h-12 text-base font-semibold"
            size="lg"
          >
            {isCreating ? (
              <>
                <Clock className="mr-2 h-5 w-5 animate-spin" />
                Iniciando Sincronização...
              </>
            ) : (
              <>
                <Play className="mr-2 h-5 w-5" />
                Iniciar Sincronização
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Active Operations */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Clock className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Operações Ativas</h3>
              <p className="text-sm text-muted-foreground">Acompanhe o progresso das sincronizações</p>
            </div>
          </div>
          {syncOperations.length === 0 ? (
            <Card variant="bordered" className="p-4 sm:p-8">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-muted/50 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Nenhuma operação de sincronização ativa
                </p>
                <p className="text-xs text-muted-foreground">
                  Inicie uma sincronização para ver o progresso aqui
                </p>
              </div>
            </Card>
          ) : (
            <div className="relative h-48 sm:h-56 md:h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40 transition-colors">
              <div className="space-y-3 sm:space-y-4 pr-1 sm:pr-2">
                {syncOperations.map((operation) => {
                  // Buscar repositório nos repositórios GitHub usando o repository_id
                  const repo = repositories.find(r => r.id === operation.repository_id)
                  const isExpanded = expandedOperations.has(operation.id)
                  const showingLogs = showLogsFor === operation.id
                  
                  return (
                    <Card key={operation.id} variant="bordered" className="overflow-hidden hover:shadow-md transition-all flex-shrink-0">
                    {/* Operation Header */}
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-background to-muted/20 hover:from-muted/30 hover:to-muted/40 transition-all">
                      <div className="flex items-center gap-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleOperationExpansion(operation.id)}
                          className="p-1 h-8 w-8 hover:bg-primary/10"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-primary" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        <div className="flex items-center gap-3">
                          {getStatusIcon(operation.status)}
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {repo?.name || 'Repositório desconhecido'}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <span className="capitalize">{operation.operation_name}</span>
                              <span>•</span>
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(operation.created_at).toLocaleString()}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`${getStatusColor(operation.status)} font-medium px-3 py-1`}>
                          {operation.status}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {(operation.status === 'running' || operation.status === 'completed') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleLogsView(operation.id)}
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:border-primary/50"
                            >
                              {showingLogs ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Terminal className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          {operation.status === 'running' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCancelSync(operation.id)}
                              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive"
                            >
                              <Square className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="p-4 border-t border-border bg-muted/20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div className="space-y-3 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <RefreshCw className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-medium text-foreground flex-shrink-0">Tipo:</span>
                              <Badge variant="secondary" className="capitalize">{operation.operation_name}</Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-foreground flex-shrink-0">ID:</span>
                              <code className="text-xs bg-background px-2 py-1 rounded border break-all">{operation.id}</code>
                            </div>
                          </div>
                          <div className="space-y-3 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Play className="h-4 w-4 text-success flex-shrink-0" />
                              <span className="font-medium text-foreground flex-shrink-0">Iniciado:</span>
                              <span className="text-sm text-muted-foreground break-words">{new Date(operation.created_at).toLocaleString()}</span>
                            </div>
                            {operation.status === 'completed' && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                                <span className="font-medium text-foreground flex-shrink-0">Concluído:</span>
                                <span className="text-sm text-muted-foreground break-words">{new Date(operation.created_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {operation.error_message && (
                          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <div className="flex items-start gap-2">
                              <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                              <div>
                                <span className="font-medium text-destructive">Erro:</span>
                                <p className="text-sm text-destructive/80 mt-1">{operation.error_message}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Real-time Logs */}
                    {showingLogs && (
                      <div className="border-t border-border bg-background">
                        <RealTimeLogs 
                          operationId={operation.id}
                          onClose={() => setShowLogsFor(null)}
                          className="border-0 shadow-none rounded-none"
                        />
                      </div>
                    )}
                    </Card>
                  )
                })}
              </div>
              
              {/* Scroll indicator */}
              {syncOperations.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-full px-2 py-1">
                  <span className="text-xs text-muted-foreground font-mono">
                    {syncOperations.length} ops
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Create Repository Modal */}
    <CreateRepositoryModal
      isOpen={showCreateRepoModal}
      onClose={() => setShowCreateRepoModal(false)}
      onRepositoryCreated={handleRepositoryCreated}
    />

    {/* Rename Repository Modal */}
    <RenameRepositoryModal
      isOpen={showRenameModal}
      onClose={() => {
        setShowRenameModal(false)
        setRepositoryToRename(null)
      }}
      repository={repositoryToRename}
      onRepositoryRenamed={handleRepositoryRenamed}
    />
    </>
  )
}

export { SyncSection }
export default SyncSection