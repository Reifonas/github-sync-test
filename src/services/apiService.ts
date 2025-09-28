import { tokenService } from './tokenService' // Importando o tokenService

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

class ApiService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    try {
      const authStore = (await import('../stores/authStore')).useAuthStore.getState()
      const user = authStore.user
      
      console.log('API_SERVICE: User object in getAuthHeaders:', user); // DEBUG LOG
      
      if (user && user.id && user.email) { // Ensure user and essential fields exist
        const tokenData = {
          user_id: user.id,
          email: user.email,
          // Add other relevant user info if needed for backend context
          github_username: user.github_username, // Include if available
          avatar_url: user.avatar_url, // Include if available
          name: user.full_name, // Include if available
          aud: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
          iat: Math.floor(Date.now() / 1000)
        }
        
        const token = btoa(JSON.stringify(tokenData))
        console.log('API_SERVICE: Generated base64 token (first 20 chars):', token.substring(0, Math.min(token.length, 20))); // DEBUG LOG
        
        return {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
      
      // If no user or essential info, return basic headers
      console.log('API_SERVICE: User or essential info missing, returning basic headers.'); // DEBUG LOG
      return {
        'Content-Type': 'application/json'
      }
    } catch (error) {
      console.error('API_SERVICE: Error getting auth headers:', error)
      return {
        'Content-Type': 'application/json'
      }
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const headers = await this.getAuthHeaders()

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        // Handle 401 specifically - token expired
        if (response.status === 401) {
          // Clear invalid token using the unified tokenService
          tokenService.clearToken()
          window.location.reload() // Reload to force re-initialization and potential re-login
          throw new Error('Token expirado. Faça login novamente.')
        }
        
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Auth endpoints
  async register(email: string, password: string, name: string) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    })
  }

  async login(email: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async githubCallback(code: string) {
    return this.request('/api/auth/github/callback', {
      method: 'POST',
      body: JSON.stringify({ code })
    })
  }

  async linkGithubToken(accessToken: string, githubUsername: string, avatarUrl: string | null, userId: string) {
    return this.request('/api/auth/link-github-token', {
      method: 'POST',
      body: JSON.stringify({ accessToken, githubUsername, avatarUrl, userId })
    })
  }

  async disconnectGitHubAccount() {
    return this.request('/api/auth/github/disconnect', {
      method: 'POST'
    })
  }

  async getProfile() {
    return this.request('/api/auth/profile')
  }

  async updateProfile(data: { name?: string; email?: string }) {
    return this.request('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST'
    })
  }

  // Sync endpoints
  async getRepositories() {
    return this.request('/api/sync/repositories')
  }

  async updateRepository(repoId: string, data: { local_path?: string; sync_enabled?: boolean }) {
    return this.request('/api/sync/repositories', {
      method: 'POST',
      body: JSON.stringify({ repository_id: repoId, ...data })
    })
  }

  async createSyncOperation(data: {
    github_repo_full_name: string
    sync_type: 'pull' | 'push' | 'bidirectional'
    options?: any
  }) {
    return this.request('/api/sync/operations', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async getSyncOperations(status?: string) {
    const params = status ? `?status=${status}` : ''
    return this.request(`/api/sync/operations${params}`)
  }

  async getSyncOperation(operationId: string) {
    return this.request(`/api/sync/operations/${operationId}`)
  }

  async cancelSyncOperation(operationId: string) {
    return this.request(`/api/sync/operations/${operationId}/cancel`, {
      method: 'POST'
    })
  }

  // Routine endpoints
  async getRoutines() {
    return this.request('/api/routines')
  }

  async createRoutine(data: {
    name: string
    repository_id: string
    sync_type: 'pull' | 'push' | 'bidirectional'
    schedule_cron: string
    is_active?: boolean
    options?: any
  }) {
    return this.request('/api/routines', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async updateRoutine(routineId: string, data: {
    name?: string
    sync_type?: 'pull' | 'push' | 'bidirectional'
    schedule_cron?: string
    is_active?: boolean
    options?: any
  }) {
    return this.request(`/api/routines/${routineId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  async deleteRoutine(routineId: string) {
    return this.request(`/api/routines/${routineId}`, {
      method: 'DELETE'
    })
  }

  async toggleRoutine(routineId: string) {
    return this.request(`/api/routines/${routineId}/toggle`, {
      method: 'PATCH'
    })
  }

  async getRoutineExecutions(routineId: string, page = 1, limit = 20) {
    return this.request(`/api/routines/${routineId}/executions?page=${page}&limit=${limit}`)
  }

  // User account management
  async deleteUserAccount() {
    return this.request('/api/auth/account', {
      method: 'DELETE'
    })
  }
}

export const apiService = new ApiService()
export default apiService