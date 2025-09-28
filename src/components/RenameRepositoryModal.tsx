import React, { useState } from 'react'
import { X, Edit3, AlertCircle, Loader2 } from 'lucide-react'
import { githubService } from '../services/githubService'
import { toast } from 'sonner'

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

interface RenameRepositoryModalProps {
  isOpen: boolean
  onClose: () => void
  repository: GitHubRepository | null
  onRepositoryRenamed: (updatedRepo: GitHubRepository) => void
}

export const RenameRepositoryModal: React.FC<RenameRepositoryModalProps> = ({
  isOpen,
  onClose,
  repository,
  onRepositoryRenamed
}) => {
  const [newName, setNewName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [error, setError] = useState('')

  React.useEffect(() => {
    if (isOpen && repository) {
      setNewName(repository.name)
      setError('')
    }
  }, [isOpen, repository])

  const validateName = (name: string): boolean => {
    if (!name.trim()) {
      setError('Nome do repositório é obrigatório')
      return false
    }

    if (name.length > 100) {
      setError('Nome do repositório deve ter no máximo 100 caracteres')
      return false
    }

    // Validação básica de nome do GitHub
    const validNameRegex = /^[a-zA-Z0-9._-]+$/
    if (!validNameRegex.test(name)) {
      setError('Nome deve conter apenas letras, números, pontos, hífens e underscores')
      return false
    }

    if (name === repository?.name) {
      setError('O novo nome deve ser diferente do atual')
      return false
    }

    setError('')
    return true
  }

  const handleRename = async () => {
    if (!repository || !validateName(newName.trim())) {
      return
    }

    setIsRenaming(true)
    try {
      // Extract owner from full_name (format: owner/repo)
      const owner = repository.full_name.split('/')[0]
      const updatedRepo = await githubService.renameRepository(
        owner,
        repository.name,
        newName.trim()
      )

      toast.success(`Repositório renomeado para "${newName.trim()}" com sucesso!`)
      onRepositoryRenamed(updatedRepo)
      onClose()
    } catch (error: any) {
      console.error('Erro ao renomear repositório:', error)
      setError(error.message || 'Erro ao renomear repositório')
      toast.error('Falha ao renomear repositório')
    } finally {
      setIsRenaming(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setNewName(value)
    if (error) {
      validateName(value)
    }
  }

  if (!isOpen || !repository) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 border-0 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Renomear Repositório
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            disabled={isRenaming}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Repositório atual: <span className="font-semibold text-gray-900 dark:text-white">{repository.name}</span>
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Atenção: Renomear um repositório pode quebrar links existentes.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="newName" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
              Novo nome do repositório
            </label>
            <input
              id="newName"
              type="text"
              value={newName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                error ? 'border-red-500 ring-red-500/20' : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
              }`}
              placeholder="Digite o novo nome"
              disabled={isRenaming}
              autoFocus
            />
            {error && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-500 animate-slide-in">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50"
            disabled={isRenaming}
          >
            Cancelar
          </button>
          <button
            onClick={handleRename}
            disabled={isRenaming || !!error || !newName.trim() || newName === repository.name}
            className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-primary to-secondary border border-transparent rounded-xl hover:from-primary/90 hover:to-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
          >
            {isRenaming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Renomeando...
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 mr-2" />
                Renomear
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}