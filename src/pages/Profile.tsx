import React, { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { apiService } from '../services/apiService'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Switch } from '../components/ui/switch'
import { Separator } from '../components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import GitHubLoginModal from '../components/GitHubLoginModal'
import { 
  User, 
  Github, 
  Settings, 
  Bell, 
  Shield, 
  Trash2, 
  Save,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  Key,
  Lock,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  github_username?: string
  github_connected: boolean
  preferences: {
    notifications_enabled: boolean
    auto_sync_enabled: boolean
    theme: 'light' | 'dark' | 'system'
    default_sync_type: 'pull' | 'push' | 'bidirectional'
  }
}

interface GitHubCredentials {
  username: string
  password: string
  token: string
}

export const Profile: React.FC = () => {
  const { 
    user, 
    logout, 
    saveGitHubCredentials, 
    loadGitHubCredentials, 
    clearGitHubCredentials, 
    testGitHubCredentials 
  } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    notifications_enabled: true,
    auto_sync_enabled: false,
    theme: 'system' as 'light' | 'dark' | 'system',
    default_sync_type: 'bidirectional' as 'pull' | 'push' | 'bidirectional'
  })
  
  // GitHub Credentials State
  const [credentials, setCredentials] = useState<GitHubCredentials>({
    username: '',
    password: '',
    token: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showToken, setShowToken] = useState(false)
  const [credentialsSaved, setCredentialsSaved] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (user) {
      fetchProfile()
      loadSavedCredentials()
    }
  }, [user])

  useEffect(() => {
    // Load credentials from authStore on component mount
    loadSavedCredentials()
  }, [])



  const loadSavedCredentials = async () => {
    try {
      const savedCredentials = await loadGitHubCredentials()
      if (savedCredentials) {
        setCredentials(savedCredentials)
        setCredentialsSaved(true)
      }
    } catch (error) {
      console.error('Error loading credentials:', error)
    }
  }

  const saveCredentials = async () => {
    try {
      await saveGitHubCredentials(credentials)
      setCredentialsSaved(true)
      toast.success('Credenciais salvas com segurança!')
    } catch (error) {
      console.error('Error saving credentials:', error)
      toast.error('Erro ao salvar credenciais')
    }
  }

  const clearCredentials = async () => {
    if (window.confirm('Tem certeza que deseja remover todas as credenciais salvas?')) {
      try {
        await clearGitHubCredentials()
        setCredentials({ username: '', password: '', token: '' })
        setCredentialsSaved(false)
        setConnectionStatus('idle')
        toast.success('Credenciais removidas')
      } catch (error) {
        console.error('Error clearing credentials:', error)
        toast.error('Erro ao remover credenciais')
      }
    }
  }

  const testGitHubConnection = async () => {
    if (!credentials.token && !credentials.username) {
      toast.error('Preencha pelo menos o token ou username')
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus('idle')

    try {
      const isValid = await testGitHubCredentials(credentials)
      
      if (isValid) {
        setConnectionStatus('success')
        toast.success('Conexão bem-sucedida!')
      } else {
        setConnectionStatus('error')
        toast.error('Falha na conexão. Verifique suas credenciais.')
      }
    } catch (error) {
      setConnectionStatus('error')
      toast.error('Erro ao testar conexão')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const validateToken = (token: string): boolean => {
    // GitHub personal access tokens start with 'ghp_' (new format) or are 40 characters (classic)
    return token.startsWith('ghp_') || (token.length === 40 && /^[a-f0-9]+$/i.test(token))
  }

  const maskToken = (token: string): string => {
    if (token.length <= 4) return token
    return '•'.repeat(token.length - 4) + token.slice(-4)
  }

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getProfile() as any
      setProfile(response)
      setFormData({
        full_name: response.full_name || '',
        notifications_enabled: response.preferences?.notifications_enabled || false,
        auto_sync_enabled: response.preferences?.auto_sync_enabled || false,
        theme: response.preferences?.theme || 'light',
        default_sync_type: response.preferences?.default_sync_type || 'pull'
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Erro ao carregar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      await apiService.updateProfile({
        name: formData.full_name,
        preferences: {
          notifications_enabled: formData.notifications_enabled,
          auto_sync_enabled: formData.auto_sync_enabled,
          theme: formData.theme,
          default_sync_type: formData.default_sync_type
        }
      } as any)
      toast.success('Perfil atualizado com sucesso!')
      await fetchProfile()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar perfil')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConnectGitHub = async () => {
    setIsGitHubModalOpen(true)
  }

  const handleGitHubConnectionSuccess = async () => {
    setIsGitHubModalOpen(false)
    await fetchProfile()
    toast.success('GitHub conectado com sucesso!')
  }

  const handleDisconnectGitHub = async () => {
    if (window.confirm('Tem certeza que deseja desconectar sua conta do GitHub? Isso pode afetar suas sincronizações.')) {
      try {
        await apiService.disconnectGitHubAccount()
        toast.success('Conta do GitHub desconectada')
        await fetchProfile()
      } catch (error) {
        console.error('Error disconnecting GitHub:', error)
        toast.error('Erro ao desconectar GitHub')
      }
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'EXCLUIR') {
      toast.error('Digite "EXCLUIR" para confirmar')
      return
    }

    try {
      await apiService.deleteUserAccount()
      toast.success('Conta excluída com sucesso')
      logout()
    } catch (error) {
      console.error('Error deleting account:', error)
      toast.error('Erro ao excluir conta')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="container mx-auto max-w-7xl">
          <div className="animate-pulse space-y-4 sm:space-y-6">
            <div className="h-6 sm:h-8 bg-muted rounded-lg w-full max-w-xs mx-auto lg:mx-0"></div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              <div className="lg:col-span-8 space-y-4 sm:space-y-6">
                <div className="h-48 sm:h-64 bg-muted rounded-xl loading-shimmer"></div>
                <div className="h-32 sm:h-48 bg-muted rounded-xl loading-shimmer"></div>
              </div>
              <div className="lg:col-span-4">
                <div className="h-64 sm:h-96 bg-muted rounded-xl loading-shimmer"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="container mx-auto max-w-2xl text-center py-8 sm:py-12">
          <Card className="card-elevated p-6 sm:p-8">
            <div className="p-3 sm:p-4 bg-destructive/10 rounded-full w-fit mx-auto mb-4 sm:mb-6">
              <AlertTriangle className="w-8 h-8 sm:w-12 sm:h-12 text-destructive" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">
              Erro ao carregar perfil
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
              Não foi possível carregar as informações do seu perfil.
            </p>
            <Button onClick={fetchProfile} variant="default" size="lg" className="w-full sm:w-auto">
              Tentar novamente
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 text-center lg:text-left animate-fade-in">
          <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-primary/10 rounded-lg sm:rounded-xl">
              <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gradient">
              Configurações do Perfil
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
            Gerencie suas informações pessoais e preferências da conta
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Profile Information */}
            <Card className="card-elevated animate-slide-in">
              <CardHeader className="bg-primary/5 border-b p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  </div>
                  <span className="text-sm sm:text-base text-foreground">Informações Pessoais</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                  {profile.avatar_url ? (
                    <div className="relative flex-shrink-0">
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full ring-2 sm:ring-4 ring-primary/20 shadow-medium"
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-4 h-4 sm:w-6 sm:h-6 bg-success rounded-full border-2 border-background status-dot"></div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-muted rounded-full flex items-center justify-center ring-2 sm:ring-4 ring-primary/20 shadow-medium flex-shrink-0">
                      <User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="text-center sm:text-left flex-1 space-y-2 sm:space-y-3 min-w-0">
                    <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                      {profile.full_name || 'Nome não informado'}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground truncate">
                      {profile.email}
                    </p>
                    <Badge variant="success" size="default" className="sm:size-lg">
                      Conta Ativa
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3">
                      Nome Completo
                    </label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Digite seu nome completo"
                      variant="modern"
                      size="default"
                      className="sm:size-lg"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* GitHub Integration */}
            <Card className="card-elevated animate-slide-in" style={{animationDelay: '0.1s'}}>
              <CardHeader className="bg-muted/30 border-b p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
                    <Github className="w-4 h-4 sm:w-5 sm:h-5 text-foreground" />
                  </div>
                  <span className="text-sm sm:text-base text-foreground">Integração GitHub</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {profile.github_connected ? (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-foreground rounded-full flex items-center justify-center shadow-medium flex-shrink-0">
                          <Github className="w-5 h-5 sm:w-6 sm:h-6 text-background" />
                        </div>
                        <div className="text-center sm:text-left min-w-0">
                          <p className="font-bold text-foreground text-base sm:text-lg truncate">
                            @{profile.github_username}
                          </p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Conta conectada
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" size="default" className="sm:size-lg flex-shrink-0">
                        ✓ Conectado
                      </Badge>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button
                        variant="outline"
                        size="default"
                        className="flex-1 sm:size-lg"
                        onClick={() => window.open(`https://github.com/${profile.github_username}`, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        <span className="text-sm sm:text-base">Ver Perfil</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="default"
                        className="flex-1 sm:size-lg"
                        onClick={handleDisconnectGitHub}
                      >
                        <span className="text-sm sm:text-base">Desconectar</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <div className="p-3 sm:p-4 bg-muted/50 rounded-full w-fit mx-auto mb-3 sm:mb-4">
                      <Github className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium text-foreground mb-2 text-base sm:text-lg">
                      GitHub não conectado
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 max-w-sm mx-auto">
                      Conecte sua conta do GitHub para sincronizar repositórios
                    </p>
                    <Button onClick={handleConnectGitHub} variant="default" size="default" className="sm:size-lg w-full sm:w-auto">
                      <Github className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      <span className="text-sm sm:text-base">Conectar GitHub</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GitHub Credentials */}
            <Card className="card-elevated animate-slide-in" style={{animationDelay: '0.15s'}}>
              <CardHeader className="bg-blue-50 dark:bg-blue-950/30 border-b p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Key className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm sm:text-base text-foreground">Credenciais GitHub</span>
                  {credentialsSaved && (
                    <Badge variant="success" size="sm" className="ml-auto">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Salvo
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                      <p className="font-medium mb-1">Como obter suas credenciais:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• <strong>Token:</strong> GitHub → Settings → Developer settings → Personal access tokens</li>
                        <li>• <strong>Username:</strong> Seu nome de usuário do GitHub</li>
                        <li>• <strong>Senha:</strong> Sua senha do GitHub (opcional se usar token)</li>
                      </ul>
                      <a 
                        href="https://github.com/settings/tokens" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Gerar Token no GitHub
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Username Field */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Username do GitHub
                    </label>
                    <Input
                      type="text"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      placeholder="seu-username"
                      variant="modern"
                      size="default"
                      className="sm:size-lg"
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Senha (Opcional)
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                        placeholder="Sua senha do GitHub"
                        variant="modern"
                        size="default"
                        className="sm:size-lg pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Token Field */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-foreground mb-2">
                      Token de Acesso Pessoal
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        value={credentials.token}
                        onChange={(e) => setCredentials({ ...credentials, token: e.target.value })}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        variant="modern"
                        size="default"
                        className={`sm:size-lg pr-10 ${
                          credentials.token && !validateToken(credentials.token) 
                            ? 'border-red-500 focus:border-red-500' 
                            : ''
                        }`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {credentials.token && !validateToken(credentials.token) && (
                      <p className="text-xs text-red-500 mt-1">
                        Formato de token inválido. Deve começar com 'ghp_' ou ter 40 caracteres.
                      </p>
                    )}
                    {showToken && credentials.token && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Token mascarado: {maskToken(credentials.token)}
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Connection Status */}
                {connectionStatus !== 'idle' && (
                  <div className={`p-3 rounded-lg border ${
                    connectionStatus === 'success' 
                      ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-center gap-2">
                      {connectionStatus === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        connectionStatus === 'success' 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {connectionStatus === 'success' 
                          ? 'Conexão bem-sucedida!' 
                          : 'Falha na conexão'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    onClick={testGitHubConnection}
                    disabled={isTestingConnection || (!credentials.token && !credentials.username)}
                    variant="outline"
                    size="default"
                    className="flex-1 sm:size-lg"
                  >
                    {isTestingConnection ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <Github className="w-4 h-4 mr-2" />
                        Testar Conexão
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={saveCredentials}
                    disabled={!credentials.token && !credentials.username}
                    variant="default"
                    size="default"
                    className="flex-1 sm:size-lg"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Salvar Credenciais
                  </Button>
                  
                  {credentialsSaved && (
                    <Button
                      onClick={clearCredentials}
                      variant="destructive"
                      size="default"
                      className="sm:size-lg"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card className="card-elevated animate-slide-in" style={{animationDelay: '0.2s'}}>
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Settings className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-foreground">Preferências</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground mb-1">
                        Notificações
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Receber notificações sobre sincronizações
                      </p>
                    </div>
                    <Switch
                      checked={formData.notifications_enabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, notifications_enabled: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground mb-1">
                        Sincronização Automática
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Executar rotinas automaticamente
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_sync_enabled}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, auto_sync_enabled: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <label className="block text-sm font-semibold text-foreground">
                      Tipo de Sincronização Padrão
                    </label>
                    <Select
                      value={formData.default_sync_type}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        default_sync_type: value as 'pull' | 'push' | 'bidirectional'
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pull">Pull (Baixar)</SelectItem>
                        <SelectItem value="push">Push (Enviar)</SelectItem>
                        <SelectItem value="bidirectional">Bidirecional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isSaving}
                  variant="default"
                  size="lg"
                  className="w-full"
                >
                  {isSaving ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Salvando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Save className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="xl:col-span-4 space-y-6">
            {/* Account Status */}
            <Card className="card-elevated animate-slide-in" style={{animationDelay: '0.3s'}}>
              <CardHeader className="bg-muted/30 border-b">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Shield className="w-5 h-5 text-foreground" />
                  </div>
                  <span className="text-foreground">Status da Conta</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <Badge variant="success" size="lg">
                    ✓ Ativo
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Plano</span>
                  <span className="text-sm font-bold text-foreground">
                    Gratuito
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Membro desde</span>
                  <span className="text-sm font-bold text-foreground">
                    {new Date(user?.created_at || '').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="card-elevated animate-slide-in" style={{animationDelay: '0.4s'}}>
              <CardHeader className="bg-warning/10 border-b border-warning/20">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-warning/20 rounded-lg">
                    <Settings className="w-5 h-5 text-warning" />
                  </div>
                  <span className="text-foreground">Ações Rápidas</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-6">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start"
                >
                  <Bell className="w-4 h-4 mr-3 text-warning" />
                  Configurar Notificações
                </Button>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 mr-3 text-warning" />
                  Preferências Avançadas
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="card-elevated animate-slide-in border-destructive/20" style={{animationDelay: '0.5s'}}>
              <CardHeader className="bg-destructive/10 border-b border-destructive/20">
                <CardTitle className="flex items-center gap-3 text-destructive">
                  <div className="p-2 bg-destructive/20 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <span>Zona de Perigo</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-sm text-destructive mb-4">
                  Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos.
                </p>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Conta
                </Button>
                {showDeleteConfirm && (
                  <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm text-destructive mb-3">
                      Digite "EXCLUIR" para confirmar:
                    </p>
                    <Input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="EXCLUIR"
                      variant="modern"
                      size="lg"
                      className="mb-3"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="lg"
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE'}
                      >
                        {false ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Excluindo...
                          </>
                        ) : (
                          'Confirmar Exclusão'
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <GitHubLoginModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onSuccess={handleGitHubConnectionSuccess}
      />
    </div>
  )
}

export default Profile