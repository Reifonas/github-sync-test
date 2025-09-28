import React, { useState, useEffect } from 'react'
import { useRoutineStore } from '../stores/routineStore'
import { useSyncStore } from '../stores/syncStore'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Switch } from './ui/switch'
import { Separator } from './ui/separator'
import { Clock, Plus, Play, Pause, Trash2, Edit, Calendar, CheckCircle, XCircle, AlertCircle, Settings, Zap, Timer, Hash, Info } from 'lucide-react'
import { toast } from 'sonner'

// Single user ID for local application
const SINGLE_USER_ID = 'd2929b81-cb3f-47a1-b47b-6b0311964361';

const RoutineSection: React.FC = () => {
  const { user } = useAuthStore()
  const { repositories } = useSyncStore()
  const {
    routines,
    executions,
    isLoading,
    error,
    fetchRoutines,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutine,
    fetchRoutineExecutions,
    clearError
  } = useRoutineStore()
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<any>(null)
  const [selectedRoutineId, setSelectedRoutineId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    repository_id: '',
    sync_type: 'pull' as 'pull' | 'push' | 'bidirectional',
    schedule_cron: '0 9 * * 1-5', // Default: weekdays at 9 AM
    is_active: true
  })

  useEffect(() => {
    if (error) {
      toast.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleInputChange = (field: string, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.repository_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      if (editingRoutine) {
        await updateRoutine(editingRoutine.id, formData)
        toast.success('Rotina atualizada com sucesso!')
      } else {
        await createRoutine(formData)
        toast.success('Rotina criada com sucesso!')
      }

      // Reset form
      setFormData({
        name: '',
        repository_id: '',
        sync_type: 'pull',
        schedule_cron: '0 9 * * 1-5',
        is_active: true
      })
      setShowCreateForm(false)
      setEditingRoutine(null)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar rotina')
    }
  }

  const handleEdit = (routine: any) => {
    setFormData({
      name: routine.name,
      repository_id: '',
      sync_type: 'pull',
      schedule_cron: routine.schedule,
      is_active: routine.enabled
    })
    setEditingRoutine(routine)
    setShowCreateForm(true)
  }

  const handleDelete = async (routineId: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta rotina?')) {
      try {
        await deleteRoutine(routineId)
        toast.success('Rotina excluída com sucesso!')
      } catch (error: any) {
        toast.error(error.message || 'Erro ao excluir rotina')
      }
    }
  }

  const handleToggle = async (routineId: string) => {
    try {
      await toggleRoutine(routineId)
      toast.success('Status da rotina atualizado!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar rotina')
    }
  }

  const handleViewExecutions = async (routineId: string) => {
    setSelectedRoutineId(routineId)
    await fetchRoutineExecutions(routineId)
  }

  const getScheduleDescription = (schedule: string) => {
    const scheduleMap: { [key: string]: string } = {
      '0 9 * * 1-5': 'Dias úteis às 9:00',
      '0 18 * * 5': 'Sextas-feiras às 18:00',
      '0 0 * * 0': 'Domingos à meia-noite',
      '0 */6 * * *': 'A cada 6 horas',
      '0 12 * * *': 'Diariamente ao meio-dia',
      '0 0 1 * *': 'Primeiro dia do mês'
    }
    return scheduleMap[schedule] || 'Agendamento personalizado'
  }

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'running':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl">
              <Timer className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Rotinas Automatizadas
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 ml-11">
            Configure sincronizações automáticas em horários específicos
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Rotina
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm animate-slide-in">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-xl border-b border-purple-100 dark:border-purple-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">
                {editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nome da Rotina</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Ex: Sync diário do projeto"
                    className="h-12 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20"
                    required
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Repositório</label>
                  <Select value={formData.repository_id} onValueChange={(value) => handleInputChange('repository_id', value)}>
                    <SelectTrigger className="h-12 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20">
                      <SelectValue placeholder="Selecione um repositório" />
                    </SelectTrigger>
                    <SelectContent>
                      {repositories.map((repo) => (
                        <SelectItem key={repo.id} value={repo.id}>
                          {repo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tipo de Sincronização</label>
                  <Select value={formData.sync_type} onValueChange={(value: 'pull' | 'push' | 'bidirectional') => handleInputChange('sync_type', value)}>
                    <SelectTrigger className="h-12 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pull">Pull (Baixar)</SelectItem>
                        <SelectItem value="push">Push (Enviar)</SelectItem>
                        <SelectItem value="bidirectional">Bidirecional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Agendamento</label>
                  <Select value={formData.schedule_cron} onValueChange={(value) => handleInputChange('schedule_cron', value)}>
                    <SelectTrigger className="h-12 border-gray-300 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0 9 * * 1-5">Dias úteis às 9:00</SelectItem>
                      <SelectItem value="0 18 * * 5">Sextas-feiras às 18:00</SelectItem>
                      <SelectItem value="0 0 * * 0">Domingos à meia-noite</SelectItem>
                      <SelectItem value="0 */6 * * *">A cada 6 horas</SelectItem>
                      <SelectItem value="0 12 * * *">Diariamente ao meio-dia</SelectItem>
                      <SelectItem value="0 0 1 * *">Primeiro dia do mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  className="data-[state=checked]:bg-purple-600"
                />
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Ativar rotina imediatamente
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 h-12"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {editingRoutine ? 'Atualizar' : 'Criar'} Rotina
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                  onClick={() => {
                    setShowCreateForm(false)
                    setEditingRoutine(null)
                    setFormData({
                      name: '',
                      repository_id: '',
                      sync_type: 'pull',
                      schedule_cron: '0 9 * * 1-5',
                      is_active: true
                    })
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Routines List */}
      <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-t-xl border-b border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-xl text-gray-900 dark:text-white">Rotinas Configuradas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {routines.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl w-fit mx-auto mb-6">
                <Clock className="w-16 h-16 text-purple-400 dark:text-purple-300 mx-auto" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma rotina configurada
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Crie sua primeira rotina automatizada para sincronizar repositórios
              </p>
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Rotina
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {routines.map((routine, index) => {
                return (
                  <div
                    key={routine.id}
                    className="group relative p-6 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 hover:shadow-lg transition-all duration-300 animate-slide-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-3">
                          <div className={`relative w-4 h-4 rounded-full transition-all duration-200 ${
                            routine.enabled 
                              ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/30' 
                              : 'bg-gray-400 dark:bg-gray-600'
                          }`}>
                            {routine.enabled && (
                              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse" />
                            )}
                          </div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {routine.name}
                          </h4>
                          <Badge className={`${routine.enabled ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {routine.enabled ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 bg-purple-400 rounded-full flex-shrink-0" />
                            <span className="font-medium flex-shrink-0">Descrição:</span>
                            <span className="truncate">{routine.description || 'Sem descrição'}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 bg-pink-400 rounded-full flex-shrink-0" />
                            <span className="font-medium flex-shrink-0">Agendamento:</span>
                            <span className="truncate">{getScheduleDescription(routine.schedule)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewExecutions(routine.id)}
                          title="Ver execuções"
                          className="h-10 w-10 p-0 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-all duration-200"
                        >
                          <Calendar className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggle(routine.id)}
                          title={routine.enabled ? 'Pausar rotina' : 'Ativar rotina'}
                          className={`h-10 w-10 p-0 transition-all duration-200 ${
                            routine.enabled 
                              ? 'hover:bg-orange-100 dark:hover:bg-orange-900/30 hover:text-orange-600 dark:hover:text-orange-400'
                              : 'hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400'
                          }`}
                        >
                          {routine.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(routine)}
                          title="Editar rotina"
                          className="h-10 w-10 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(routine.id)}
                          title="Excluir rotina"
                          className="h-10 w-10 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution History */}
      {selectedRoutineId && (
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-t-xl border-b border-blue-100 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl text-gray-900 dark:text-white">Histórico de Execuções</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRoutineId(null)}
                className="hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
              >
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {executions.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl w-fit mx-auto mb-6">
                  <Calendar className="w-16 h-16 text-blue-400 dark:text-blue-300 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhuma execução encontrada
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  As execuções desta rotina aparecerão aqui quando iniciadas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {executions.slice(0, 10).map((execution, index) => (
                  <div
                    key={execution.id}
                    className="group p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-900/50 hover:shadow-md transition-all duration-200 animate-slide-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-4">
                        <div className={`relative w-3 h-3 rounded-full transition-all duration-200 ${
                          execution.status === 'completed' ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/30' :
                          execution.status === 'failed' ? 'bg-gradient-to-r from-red-400 to-rose-500 shadow-lg shadow-red-500/30' :
                          'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/30 animate-pulse'
                        }`}>
                          {execution.status === 'running' && (
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 animate-ping" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getExecutionStatusIcon(execution.status)}
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {new Date(execution.startedAt).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              <span className="font-medium flex-shrink-0">Data:</span>
                              <span className="truncate">{new Date(execution.createdAt).toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0">
                              <Clock className="h-4 w-4 text-purple-500 flex-shrink-0" />
                              <span className="font-medium flex-shrink-0">Duração:</span>
                              <span className="truncate">
                                {execution.completedAt 
                                  ? `${Math.round((new Date(execution.completedAt).getTime() - new Date(execution.createdAt).getTime()) / 1000)}s`
                                  : 'Em execução...'}
                              </span>
                            </div>
                          </div>
                          {execution.errorMessage && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                                {execution.errorMessage}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <Badge className={`shrink-0 ${getExecutionStatusColor(execution.status)} border`}>
                        {execution.status === 'completed' ? '✓ Sucesso' :
                         execution.status === 'failed' ? '✗ Erro' : '⟳ Em andamento'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { RoutineSection }
export default RoutineSection