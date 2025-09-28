import { create } from 'zustand'
import { localStorageService, type User } from '../services/localStorageService'
import { githubAuthService } from '../services/githubAuthService'
import { tokenService } from '../services/tokenService'
import { connectionLogger } from '../services/connectionLogger'
import { apiService } from '../services/apiService' // Import apiService

// Single user ID for local application
const SINGLE_USER_ID = 'd2929b81-cb3f-47a1-b47b-6b0311964361'

// Types
export interface GitHubConnection {
  isConnected: boolean
  username: string | null
  avatarUrl: string | null
  accessToken: string | null
}

interface GitHubCredentials {
  username: string
  password: string
  token: string
}

interface EncryptedCredentials {
  username: string
  password: string
  token: string
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  githubConnection: GitHubConnection
  githubCredentials: GitHubCredentials | null
  
  // Computed properties
  isAuthenticated: boolean
  isLoading: boolean
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  loginWithGitHub: () => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  initialize: () => Promise<void>
  connectGitHub: (token: string) => Promise<void>
  disconnectGitHub: () => Promise<void>
  refreshGitHubToken: () => Promise<string>
  hasGitHubTokenInCache: () => boolean
  
  // GitHub Credentials Management
  saveGitHubCredentials: (credentials: GitHubCredentials) => Promise<void>
  loadGitHubCredentials: () => Promise<GitHubCredentials | null>
  clearGitHubCredentials: () => Promise<void>
  getStoredCredentials: () => GitHubCredentials | null
  testGitHubCredentials: (credentials: GitHubCredentials) => Promise<boolean>
}

// Store implementation
// Utility functions for encryption
const encryptData = (data: string): string => {
  return btoa(data) // Basic base64 encoding - in production use proper encryption
}

const decryptData = (encryptedData: string): string => {
  try {
    return atob(encryptedData) // Basic base64 decoding
  } catch {
    return ''
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  githubConnection: {
    isConnected: false,
    username: null,
    avatarUrl: null,
    accessToken: null
  },
  githubCredentials: null,
  
  // Computed properties
  get isAuthenticated() {
    return get().user !== null
  },
  get isLoading() {
    return get().loading
  },

  login: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })
      
      // For single-user app, just validate basic credentials
      if (email === 'admin@gatohub.app' && password === 'admin') {
        let user = await localStorageService.getUser(SINGLE_USER_ID)
        
        if (!user) {
          // Create user if doesn't exist
          user = await localStorageService.createUser({
            id: SINGLE_USER_ID, // Ensure ID is set for new user
            github_username: '',
            github_token: '',
            email: 'admin@gatohub.app',
            avatar_url: '',
            created_at: new Date().toISOString()
          })
        }
        
        set({ user, loading: false })
        
        // Log successful login
        await localStorageService.createLog({
          level: 'info',
          message: 'User logged in successfully',
          user_id: user.id
        })
      } else {
        throw new Error('Credenciais inválidas')
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no login', 
        loading: false 
      })
      throw error
    }
  },

  register: async (email: string, password: string, name: string) => {
    try {
      set({ loading: true, error: null })
      
      // For single-user app, create or update the user
      let user = await localStorageService.getUser(SINGLE_USER_ID)
      
      if (!user) {
        user = await localStorageService.createUser({
          id: SINGLE_USER_ID, // Ensure ID is set for new user
          github_username: '',
          github_token: '',
          email: email,
          avatar_url: '',
          created_at: new Date().toISOString()
        })
      } else {
        user = await localStorageService.updateUser(SINGLE_USER_ID, {
          email: email,
          full_name: name // Update full_name if registering
        })
      }
      
      if (!user) throw new Error('Falha ao criar usuário')
      
      set({ user, loading: false })
      
      // Log successful registration
      await localStorageService.createLog({
        level: 'info',
        message: 'User registered successfully',
        user_id: user.id
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no registro', 
        loading: false 
      })
      throw error
    }
  },

  loginWithGitHub: async () => {
    try {
      set({ loading: true, error: null })
      
      // Check if token exists in cache
      const cachedToken = tokenService.getToken()
      if (!cachedToken) {
        set({ loading: false })
        throw new Error('Token do GitHub não encontrado. Configure seu token do GitHub primeiro nas configurações.')
      }
      
      // Validate token format
      if (!cachedToken.startsWith('ghp_') && !cachedToken.startsWith('github_pat_')) {
        set({ loading: false })
        throw new Error('Formato de token inválido. Use um Personal Access Token válido do GitHub.')
      }
      
      // Use the connectGitHub method for OAuth flow
      await get().connectGitHub(cachedToken)
      
      // Verify connection was successful
      const connection = get().githubConnection
      if (!connection.isConnected) {
        set({ loading: false })
        throw new Error('Falha ao conectar com o GitHub. Verifique se o token é válido.')
      }
      
      // After successful GitHub connection, log in the user
      let user = await localStorageService.getUser(SINGLE_USER_ID)
      
      if (!user) {
        user = await localStorageService.createUser({
          id: SINGLE_USER_ID, // Ensure ID is set for new user
          github_username: connection.username || '',
          github_token: connection.accessToken || '', // This is the PAT
          email: 'admin@gatohub.app',
          avatar_url: connection.avatarUrl || '',
          created_at: new Date().toISOString()
        })
      } else {
        // Update existing user with GitHub info
        user = await localStorageService.updateUser(SINGLE_USER_ID, {
          github_username: connection.username || '',
          github_token: connection.accessToken || '',
          avatar_url: connection.avatarUrl || ''
        })
      }
      
      if (!user) {
        set({ loading: false })
        throw new Error('Falha ao criar/atualizar usuário')
      }
      
      set({ user, loading: false })
      
      // Log successful GitHub login
      await localStorageService.createLog({
        level: 'info',
        message: 'User logged in with GitHub successfully',
        user_id: user.id
      })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no login com GitHub', 
        loading: false 
      })
      throw error
    }
  },

  logout: async () => {
    try {
      set({ loading: true })
      
      const currentUser = get().user
      
      // Log logout
      if (currentUser) {
        await localStorageService.createLog({
          level: 'info',
          message: 'User logged out',
          user_id: currentUser.id
        })
      }
      
      // Clear all authentication data
      githubAuthService.clearAllAuthData()
      
      set({ user: null, loading: false, error: null })
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Erro no logout', 
        loading: false 
      })
    }
  },

  clearError: () => set({ error: null }),

  initialize: async () => {
    try {
      set({ loading: true, error: null })
      
      let user = await localStorageService.getUser(SINGLE_USER_ID)
      
      if (!user) {
        // Create user if doesn't exist with essential fields
        user = await localStorageService.createUser({
          id: SINGLE_USER_ID,
          github_username: '',
          github_token: '',
          email: 'admin@gatohub.app', // Ensure a default email is always set
          avatar_url: '',
          created_at: new Date().toISOString()
        })
      } else {
        // Ensure existing user also has an email, if somehow missing
        if (!user.email) {
          user = await localStorageService.updateUser(SINGLE_USER_ID, { email: 'admin@gatohub.app' });
        }
      }
      
      if (!user) { // Should not happen after creation/update
        throw new Error('Failed to initialize user for authentication.');
      }

      set({ 
        user, 
        loading: false,
        error: null
      })
      
      // Try to initialize GitHub connection from cache
      await githubAuthService.initializeFromCache(get, set)
      
      // Log initialization
      await localStorageService.createLog({
        level: 'info',
        message: 'Application initialized',
        user_id: user.id
      })
      
    } catch (error) {
      console.error('Initialization error:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Erro na inicialização', 
        loading: false 
      })
    }
  },

  connectGitHub: async (token: string) => {
    try {
      set({ loading: true, error: null })
      
      // Validate and connect GitHub token
      const result = await githubAuthService.connectWithToken(token)
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao conectar com GitHub')
      }
      
      const currentUser = get().user
      console.log('AUTH_STORE: currentUser before linking GitHub token:', currentUser); // DEBUG LOG
      
      if (currentUser && result.userInfo) {
        // Call backend to link GitHub token to the authenticated user
        await apiService.linkGithubToken(
          token, 
          result.userInfo.login, 
          result.userInfo.avatar_url, 
          currentUser.id // Pass the current user's ID
        )
        
        // Update local user state (redundant if backend updates users.json, but good for immediate UI update)
        await localStorageService.updateUser(currentUser.id, {
          github_username: result.userInfo.login,
          github_token: token, // Store the raw GitHub token here
          avatar_url: result.userInfo.avatar_url
        })
        
        set({ 
          user: {
            ...currentUser,
            github_username: result.userInfo.login,
            avatar_url: result.userInfo.avatar_url
          }
        })
      }
      
      set({ 
        githubConnection: result.connection,
        loading: false,
        error: null
      })
    } catch (error: any) {
      console.error('Erro ao conectar GitHub:', error)
      const errorMessage = githubAuthService.getErrorMessage(error)
      
      set({ 
        loading: false, 
        error: errorMessage 
      })
      throw new Error(errorMessage)
    }
  },

  disconnectGitHub: async () => {
    const { githubConnection } = get()
    const username = githubConnection.username || 'Usuário desconhecido'
    
    // Call backend to disconnect GitHub account
    try {
      await apiService.disconnectGitHubAccount()
    } catch (error) {
      console.error('Erro ao desconectar GitHub no backend:', error);
      // Continue with frontend disconnection even if backend fails
    }

    // Disconnect GitHub and clear data
    const disconnectedState = await githubAuthService.disconnect()
    
    const currentUser = get().user
    
    // Update user to remove GitHub data
    if (currentUser) {
      await localStorageService.updateUser(currentUser.id, {
        github_username: '',
        github_token: '',
        avatar_url: ''
      })
      
      set({ 
        user: {
          ...currentUser,
          github_username: '',
          github_token: '',
          avatar_url: ''
        }
      })
    }
    
    set({ githubConnection: disconnectedState })
    
    // Log disconnection
    await connectionLogger.logDisconnection(username)
    
    console.log(`${username} desconectado do GitHub`)
  },

  refreshGitHubToken: async () => {
    const { githubConnection } = get()
    
    if (!githubConnection.isConnected || !githubConnection.accessToken) {
      return 'Token não encontrado'
    }
    
    try {
      const result = await githubAuthService.validateToken(githubConnection.accessToken)
      
      if (!result.isValid) {
        console.error('Token GitHub inválido:', result.error)
        await get().disconnectGitHub()
        return 'Token inválido'
      }
      
      console.log('Token GitHub ainda válido')
      return 'Token válido'
    } catch (error) {
      console.error('Erro ao validar token GitHub:', error)
      // If validation fails, disconnect
      await get().disconnectGitHub()
      return 'Erro na validação'
    }
  },

  /**
   * Verifica se há token GitHub no cache
   */
  hasGitHubTokenInCache: () => {
    return tokenService.hasTokenInCache()
  },

  // GitHub Credentials Management
  saveGitHubCredentials: async (credentials: GitHubCredentials) => {
    try {
      const encryptedCredentials: EncryptedCredentials = {
        username: encryptData(credentials.username),
        password: encryptData(credentials.password),
        token: encryptData(credentials.token)
      }
      
      localStorage.setItem('github_credentials', JSON.stringify(encryptedCredentials))
      set({ githubCredentials: credentials })
      
      // Log credential save
      const currentUser = get().user
      if (currentUser) {
        await localStorageService.createLog({
          level: 'info',
          message: 'GitHub credentials saved securely',
          user_id: currentUser.id
        })
      }
    } catch (error) {
      console.error('Error saving GitHub credentials:', error)
      throw new Error('Erro ao salvar credenciais')
    }
  },

  loadGitHubCredentials: async () => {
    try {
      const saved = localStorage.getItem('github_credentials')
      if (!saved) return null
      
      const parsed: EncryptedCredentials = JSON.parse(saved)
      const credentials: GitHubCredentials = {
        username: decryptData(parsed.username || ''),
        password: decryptData(parsed.password || ''),
        token: decryptData(parsed.token || '')
      }
      
      set({ githubCredentials: credentials })
      return credentials
    } catch (error) {
      console.error('Error loading GitHub credentials:', error)
      return null
    }
  },

  clearGitHubCredentials: async () => {
    try {
      localStorage.removeItem('github_credentials')
      set({ githubCredentials: null })
      
      // Log credential clear
      const currentUser = get().user
      if (currentUser) {
        await localStorageService.createLog({
          level: 'info',
          message: 'GitHub credentials cleared',
          user_id: currentUser.id
        })
      }
    } catch (error) {
      console.error('Error clearing GitHub credentials:', error)
      throw new Error('Erro ao limpar credenciais')
    }
  },

  getStoredCredentials: () => {
    return get().githubCredentials
  },

  testGitHubCredentials: async (credentials: GitHubCredentials) => {
    try {
      if (!credentials.token && !credentials.username) {
        throw new Error('Token ou username é obrigatório')
      }

      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Sync-App'
      }

      if (credentials.token) {
        headers['Authorization'] = `token ${credentials.token}`
      }

      const response = await fetch('https://api.github.com/user', { headers })
      
      if (response.ok) {
        const userData = await response.json()
        
        // Log successful test
        const currentUser = get().user
        if (currentUser) {
          await localStorageService.createLog({
            level: 'info',
            message: `GitHub credentials test successful for user: ${userData.login}`,
            user_id: currentUser.id
          })
        }
        
        return true
      } else {
        // Log failed test
        const currentUser = get().user
        if (currentUser) {
          await localStorageService.createLog({
            level: 'warn',
            message: 'GitHub credentials test failed',
            user_id: currentUser.id
          })
        }
        
        return false
      }
    } catch (error) {
      console.error('Error testing GitHub credentials:', error)
      
      // Log error
      const currentUser = get().user
      if (currentUser) {
        await localStorageService.createLog({
          level: 'error',
          message: `GitHub credentials test error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          user_id: currentUser.id
        })
      }
      
      return false
    }
  }
}))