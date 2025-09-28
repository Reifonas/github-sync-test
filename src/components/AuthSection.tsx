import React, { useState } from 'react'
import { Github, Mail, Lock, User, Eye, EyeOff, AlertCircle, Sparkles, Settings } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import GitHubLoginModal from './GitHubLoginModal'
import { toast } from 'sonner'

const AuthSection: React.FC = () => {
  const { login, register, loginWithGitHub, isLoading, error, clearError } = useAuthStore()
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    if (isLoginMode) {
      await login(formData.email, formData.password)
    } else {
      if (!formData.name.trim()) {
        return
      }
      await register(formData.email, formData.password, formData.name)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleGitHubLogin = async () => {
    clearError()
    try {
      await loginWithGitHub()
    } catch (error) {
      // If token is not found, open the GitHub configuration modal
      if (error instanceof Error && error.message.includes('Token do GitHub não encontrado')) {
        console.error('GitHub token not configured:', error.message)
        toast.error('Token do GitHub não configurado. Configure seu token primeiro.')
        setIsGitHubModalOpen(true)
        return
      }
      // Handle other errors
      console.error('GitHub login error:', error)
    }
  }

  const handleGitHubConnectionSuccess = async () => {
    setIsGitHubModalOpen(false)
    toast.success('GitHub conectado com sucesso! Agora você pode fazer login.')
    // Try to login again after successful connection
    try {
      await loginWithGitHub()
    } catch (error) {
      console.error('Login after connection failed:', error)
    }
  }

  return (
    <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-900/10 dark:to-purple-900/10 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-3 h-12 flex items-center justify-center">
          <span className={`transition-opacity duration-300 ${isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
            Bem-vindo de volta!
          </span>
          <span className={`transition-opacity duration-300 ${!isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
            Junte-se a nós
          </span>
        </CardTitle>
        <div className="text-gray-600 dark:text-gray-400 text-lg h-14 flex items-center justify-center">
          <p className={`transition-opacity duration-300 text-center ${isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
            Acesse sua conta para gerenciar sincronizações
          </p>
          <p className={`transition-opacity duration-300 text-center ${!isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
            Crie uma conta para começar a usar o GitHub Sync Pro
          </p>
        </div>
      </CardHeader>
      
      <CardContent className="px-8 pb-8">

        {error && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-700 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1 bg-red-100 dark:bg-red-800 rounded-full">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-sm font-medium text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* GitHub OAuth Button */}
        <Button
          onClick={handleGitHubLogin}
          disabled={isLoading}
          className="w-full mb-4 h-12 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 dark:from-gray-800 dark:to-gray-700 dark:hover:from-gray-700 dark:hover:to-gray-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          <Github className="w-5 h-5 mr-3" />
          <span>{isLoading ? 'Conectando...' : 'Continuar com GitHub'}</span>
        </Button>
        
        {/* GitHub Token Configuration Button */}
        <Button
          onClick={() => setIsGitHubModalOpen(true)}
          variant="outline"
          className="w-full mb-6 h-10 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-200"
        >
          <Settings className="w-4 h-4 mr-2" />
          <span>Configurar Token do GitHub</span>
        </Button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-gray-600" />
          </div>
          <div className="relative flex justify-center">
            <Badge className="px-4 py-1 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 font-medium">
              ou
            </Badge>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={`space-y-2 transition-all duration-300 ${isLoginMode ? 'h-0 overflow-hidden opacity-0' : 'h-auto opacity-100'}`}>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Nome completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 dark:text-blue-400" />
              <Input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required={!isLoginMode}
                className="pl-12 h-12 border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-400/20 dark:focus:ring-blue-500/20 bg-white dark:bg-gray-800 transition-all duration-200 text-gray-900 dark:text-white"
                placeholder="Seu nome completo"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 dark:text-blue-400" />
              <Input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="pl-12 h-12 border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-400/20 dark:focus:ring-blue-500/20 bg-white dark:bg-gray-800 transition-all duration-200 text-gray-900 dark:text-white"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500 dark:text-blue-400" />
              <Input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="pl-12 pr-12 h-12 border-gray-200 dark:border-gray-700 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-blue-400/20 dark:focus:ring-blue-500/20 bg-white dark:bg-gray-800 transition-all duration-200 text-gray-900 dark:text-white"
                placeholder="Sua senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-10 w-10 p-0 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            {!isLoginMode && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Mínimo de 6 caracteres
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden"
          >
            <span className={`transition-opacity duration-300 ${!isLoading && isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
              Entrar
            </span>
            <span className={`transition-opacity duration-300 ${!isLoading && !isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
              Criar conta
            </span>
            <span className={`transition-opacity duration-300 ${isLoading && isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
              Entrando...
            </span>
            <span className={`transition-opacity duration-300 ${isLoading && !isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
              Criando conta...
            </span>
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={() => {
              setIsLoginMode(!isLoginMode)
              clearError()
              setFormData({ email: '', password: '', name: '' })
            }}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 relative overflow-hidden h-10"
          >
            <span className={`transition-opacity duration-300 ${isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
              Não tem uma conta? Criar conta
            </span>
            <span className={`transition-opacity duration-300 ${!isLoginMode ? 'opacity-100' : 'opacity-0 absolute'}`}>
              Já tem uma conta? Entrar
            </span>
          </Button>
        </div>
      </CardContent>
      
      <GitHubLoginModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
        onSuccess={handleGitHubConnectionSuccess}
      />
    </Card>
  )
}

export { AuthSection }
export default AuthSection