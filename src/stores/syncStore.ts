import { create } from 'zustand'
import { apiService } from '../services/apiService'
import type { Repository, SyncOperation, LogEntry } from '../services/localStorageService'

// Single user ID for local application
const SINGLE_USER_ID = 'd2929b81-cb3f-47a1-b47b-6b0311964361';

interface SyncState {
  repositories: Repository[]
  syncOperations: SyncOperation[]
  syncLogs: LogEntry[]
  logs: any[]
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchRepositories: () => Promise<void>
  fetchSyncOperations: () => Promise<void>
  fetchOperations: () => Promise<void>
  fetchSyncLogs: (operationId?: string) => Promise<void>
  createSyncOperation: (operation: {
    github_repo_full_name: string
    sync_type: 'pull' | 'push' | 'bidirectional'
    options?: any
  }) => Promise<void>
  updateRepository: (repoId: string, data: { local_path?: string; sync_enabled?: boolean }) => Promise<void>
  cancelSyncOperation: (operationId: string) => Promise<void>
  cancelOperation: (operationId: string) => Promise<void>
  clearError: () => void
  initializeRealTime: (userId: string) => void
  cleanupRealTime: () => void
  operations: SyncOperation[]
}

export const useSyncStore = create<SyncState>((set, get) => ({
  repositories: [],
  syncOperations: [],
  syncLogs: [],
  logs: [],
  isLoading: false,
  error: null,
  
  get operations() {
    return get().syncOperations
  },

  fetchRepositories: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getRepositories()
      const repositories = Array.isArray(response) ? response : (response as any)?.repositories || []
      set({ repositories, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao buscar repositórios',
        isLoading: false
      })
    }
  },

  fetchSyncOperations: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await apiService.getSyncOperations()
      const operations = Array.isArray(response) ? response : (response as any)?.operations || []
      set({ syncOperations: operations, isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao buscar operações de sincronização',
        isLoading: false
      })
    }
  },

  fetchOperations: async () => {
    return get().fetchSyncOperations()
  },

  fetchSyncLogs: async (operationId?: string) => {
    // This will be handled by the RealTimeLogs component via SSE
  },

  createSyncOperation: async (operation) => {
    set({ isLoading: true, error: null })
    try {
      await apiService.createSyncOperation(operation)
      await get().fetchSyncOperations() // Refresh operations list
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao criar operação de sincronização',
        isLoading: false
      })
      throw error
    }
  },

  updateRepository: async (repoId, data) => {
    try {
      await apiService.updateRepository(repoId, data)
      await get().fetchRepositories()
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao atualizar repositório'
      })
      throw error
    }
  },

  cancelSyncOperation: async (operationId) => {
    try {
      await apiService.cancelSyncOperation(operationId)
      await get().fetchSyncOperations()
    } catch (error: any) {
      set({
        error: error.message || 'Erro ao cancelar operação de sincronização'
      })
      throw error
    }
  },

  cancelOperation: async (operationId: string) => {
    return get().cancelSyncOperation(operationId)
  },

  clearError: () => set({ error: null }),

  initializeRealTime: (userId: string) => {
    // Real-time updates are handled via SSE in RealTimeLogs component
  },

  cleanupRealTime: () => {
    // Cleanup is handled by component unmounts
  }
}))