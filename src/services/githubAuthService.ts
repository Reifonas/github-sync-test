import { tokenService } from './tokenService'
import { connectionLogger } from './connectionLogger'
import type { GitHubConnection } from '../stores/authStore'

interface GitHubUser {
  id: number
  login: string
  name: string
  email: string
  avatar_url: string
  bio: string
  public_repos: number
  followers: number
  following: number
}

interface ConnectResult {
  success: boolean
  connection: GitHubConnection
  userInfo?: GitHubUser
  error?: string
}

interface ValidationResponse {
  isValid: boolean
  userInfo?: GitHubUser
  error?: string
}

class GitHubAuthService {
  private readonly GITHUB_API_BASE = 'https://api.github.com'

  /**
   * Connect to GitHub using a personal access token
   */
  async connectWithToken(token: string): Promise<ConnectResult> {
    try {
      // Validate token format
      if (!this.isValidTokenFormat(token)) {
        return {
          success: false,
          connection: this.getDisconnectedState(),
          error: 'Token inválido. Use um Personal Access Token válido do GitHub.'
        }
      }

      // Validate token and get user info
      const validationResult = await this.validateToken(token)

      if (!validationResult.isValid) {
        return {
          success: false,
          connection: this.getDisconnectedState(),
          error: validationResult.error || 'Falha ao validar token'
        }
      }

      const githubUser = validationResult.userInfo!

      // Save token to cache
      tokenService.saveToken(token)

      // Create connection object
      const connection: GitHubConnection = {
        isConnected: true,
        accessToken: token,
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url
      }

      return {
        success: true,
        connection,
        userInfo: githubUser
      }
    } catch (error: any) {
      console.error('Erro ao conectar GitHub:', error)
      return {
        success: false,
        connection: this.getDisconnectedState(),
        error: error.message || 'Erro ao conectar com GitHub'
      }
    }
  }

  /**
   * Validate if token format is correct
   */
  private isValidTokenFormat(token: string): boolean {
    return token && (token.startsWith('ghp_') || token.startsWith('github_pat_'))
  }

  /**
   * Get disconnected state
   */
  private getDisconnectedState(): GitHubConnection {
    return {
      isConnected: false,
      username: null,
      avatarUrl: null,
      accessToken: null
    }
  }

  /**
   * Validate GitHub token
   */
  async validateToken(token: string): Promise<ValidationResponse> {
    try {
      const response = await fetch(`${this.GITHUB_API_BASE}/user`, {
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'Gatohub-Sync-Pro'
        }
      })

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        }
      }

      const userInfo: GitHubUser = await response.json()
      return {
        isValid: true,
        userInfo
      }
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Erro ao validar token'
      }
    }
  }

  /**
   * Initialize GitHub connection from cache
   */
  async initializeFromCache(
    getState: () => any,
    setState: (state: Partial<any>) => void
  ): Promise<void> {
    try {
      const cachedToken = tokenService.getToken()

      if (!cachedToken) {
        console.log('Nenhum token encontrado no cache')
        return
      }

      // Validate cached token
      const validationResult = await this.validateToken(cachedToken)

      if (validationResult.isValid && validationResult.userInfo) {
        const githubUser = validationResult.userInfo

        // Store GitHub connection
        const connection: GitHubConnection = {
          isConnected: true,
          accessToken: cachedToken,
          username: githubUser.login,
          avatarUrl: githubUser.avatar_url
        }

        // Log the connection test
        await connectionLogger.testConnection(cachedToken)

        setState({ githubConnection: connection })

        // Log automatic reconnection
        await connectionLogger.logAutoReconnection(githubUser.login, true)
      } else {
        // Token is invalid or expired
        await connectionLogger.logAutoReconnection(
          'Token inválido', 
          false, 
          validationResult.error
        )

        // Clear invalid token
        tokenService.clearToken()
      }
    } catch (error) {
      console.error('Erro ao inicializar GitHub do cache:', error)

      // Log error in reconnection
      await connectionLogger.logAutoReconnection(
        'Erro na inicialização', 
        false, 
        error instanceof Error ? error.message : 'Erro desconhecido'
      )

      // Clear potentially corrupted data
      tokenService.clearToken()
    }
  }

  /**
   * Disconnect from GitHub
   */
  async disconnect(): Promise<GitHubConnection> {
    // Clear GitHub connection from localStorage and cache
    tokenService.clearToken()
    
    return this.getDisconnectedState()
  }

  /**
   * Clear all authentication data
   */
  clearAllAuthData(): void {
    tokenService.clearToken()
  }

  /**
   * Get user-friendly error message
   */
  getErrorMessage(error: any): string {
    let errorMessage = 'Erro ao conectar com GitHub'

    if (error.message.includes('Bad credentials')) {
      errorMessage = 'Token inválido. Verifique se o token está correto e possui as permissões necessárias.'
    } else if (error.message.includes('rate limit')) {
      errorMessage = 'Limite de requisições excedido. Tente novamente em alguns minutos.'
    } else if (error.message.includes('Network Error')) {
      errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return errorMessage
  }
}

export const githubAuthService = new GitHubAuthService()