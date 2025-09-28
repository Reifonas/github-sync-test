import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, User, History, Menu, X, Github, LogOut, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../hooks/useTheme'
import GitHubLoginModal from '../components/GitHubLoginModal'

const Navigation: React.FC = () => {
  const location = useLocation()
  const { user, logout, githubConnection, connectGitHub, disconnectGitHub } = useAuthStore()
  const { theme, toggleTheme, isDark } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Histórico', href: '/history', icon: History },
    { name: 'Perfil', href: '/profile', icon: User },
  ]

  const isActive = (href: string) => {
    return location.pathname === href
  }

  const handleLogout = async () => {
    await logout()
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="bg-card/95 backdrop-blur-sm border-b border-border shadow-soft transition-theme sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <Github className="w-8 h-8 text-primary transition-all duration-300 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <span className="text-xl font-bold text-foreground bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                Gatohub Sync Pro
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground shadow-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                    isActive(item.href) ? 'text-primary-foreground' : ''
                  }`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Right Side Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme Toggle Moderno */}
            <button
              onClick={toggleTheme}
              className="relative p-2.5 rounded-xl bg-gradient-to-br from-accent/50 to-accent/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group overflow-hidden"
              title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                {isDark ? (
                  <Sun className="w-5 h-5 transition-all duration-300 group-hover:rotate-180 group-hover:scale-110 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 transition-all duration-300 group-hover:-rotate-180 group-hover:scale-110 text-indigo-500" />
                )}
              </div>
            </button>
            
            {/* GitHub Status Indicator */}
            <button
              onClick={() => {
                if (githubConnection.isConnected) {
                  disconnectGitHub()
                } else {
                  setIsGitHubModalOpen(true)
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-accent group"
              title={githubConnection.isConnected ? 'Desconectar do GitHub' : 'Conectar ao GitHub'}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  githubConnection.isConnected 
                    ? 'bg-success shadow-[0_0_8px_hsl(var(--success))]' 
                    : 'bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]'
                }`} />
                <Github className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-foreground font-medium">
                  {githubConnection.isConnected 
                    ? `@${githubConnection.username}` 
                    : 'Conectar GitHub'
                  }
                </span>
              </div>
            </button>
            
            {user && (
              <div className="flex items-center space-x-3 border-l border-border pl-4">
                <div className="text-sm">
                  <p className="text-foreground font-medium">
                    {user.github_username || user.email}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {user.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200 group"
                  title="Sair"
                >
                  <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Theme Toggle Moderno */}
            <button
              onClick={toggleTheme}
              className="relative p-2.5 rounded-xl bg-gradient-to-br from-accent/50 to-accent/30 border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group overflow-hidden"
              title={isDark ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro'}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                {isDark ? (
                  <Sun className="w-5 h-5 transition-all duration-300 group-hover:rotate-180 group-hover:scale-110 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 transition-all duration-300 group-hover:-rotate-180 group-hover:scale-110 text-indigo-500" />
                )}
              </div>
            </button>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary transition-all duration-200"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden animate-slide-in">
          <div className="px-4 pt-2 pb-3 space-y-2 bg-card/95 backdrop-blur-sm border-t border-border">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground shadow-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Mobile GitHub Status & User Info */}
            <div className="border-t border-border pt-4 mt-4 space-y-2">
              {/* GitHub Connection Status */}
              <button
                onClick={() => {
                  if (githubConnection.isConnected) {
                    disconnectGitHub()
                  } else {
                    setIsGitHubModalOpen(true)
                  }
                  setIsMobileMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left text-base font-medium text-foreground hover:bg-accent rounded-lg transition-all duration-200"
              >
                <div className={`w-2 h-2 rounded-full ${
                  githubConnection.isConnected 
                    ? 'bg-success shadow-[0_0_8px_hsl(var(--success))]' 
                    : 'bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]'
                }`} />
                <Github className="w-5 h-5" />
                <span>
                  {githubConnection.isConnected 
                    ? githubConnection.username 
                    : 'Conectar GitHub'
                  }
                </span>
              </button>
              
              {user && (
                <>
                  <div className="px-4 py-3 bg-muted/50 rounded-lg">
                    <p className="text-base font-medium text-foreground">
                      {user.github_username || user.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left text-base font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-all duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Sair</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* GitHub Login Modal */}
      <GitHubLoginModal 
        isOpen={isGitHubModalOpen} 
        onClose={() => setIsGitHubModalOpen(false)} 
      />
    </nav>
  )
}

export { Navigation }
export default Navigation