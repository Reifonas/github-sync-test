import localStorageService from '../services/LocalStorageService.js';
import { gitService } from '../services/gitService.js';
import { logSyncMessage } from '../services/syncLogStreamer.js';
import fs from 'fs/promises';
import path from 'path';

// Single user ID for local application
const SINGLE_USER_ID = 'd2929b81-cb3f-47a1-b47b-6b0311964361';

/**
 * Controller for synchronization operations.
 */
class SyncController {
  /**
   * Get user's repositories.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async getRepositories(req, res) {
    try {
      const repositories = await localStorageService.getRepositories();
      res.json({ repositories });
    } catch (error) {
      console.error('Error fetching repositories:', error);
      res.status(500).json({ error: 'Erro ao buscar repositórios' });
    }
  }

  /**
   * Add or update repository configuration.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async configureRepository(req, res) {
    try {
      const { githubRepoId, name, localPath, syncEnabled } = req.body;

      if (!githubRepoId || !name || !localPath) {
        return res.status(400).json({ 
          error: 'ID do repositório, nome e caminho local são obrigatórios' 
        });
      }

      try {
        await fs.access(path.dirname(localPath));
      } catch {
        return res.status(400).json({ 
          error: 'Caminho local inválido ou inacessível' 
        });
      }

      const repositories = await localStorageService.getRepositories();
      const existingRepoIndex = repositories.findIndex(repo => repo.github_repo_id === githubRepoId);

      let result;
      if (existingRepoIndex !== -1) {
        repositories[existingRepoIndex] = {
          ...repositories[existingRepoIndex],
          name,
          local_path: localPath,
          sync_enabled: syncEnabled,
          updated_at: new Date().toISOString()
        };
        result = repositories[existingRepoIndex];
      } else {
        result = {
          id: Date.now().toString(),
          github_repo_id: githubRepoId,
          name,
          local_path: localPath,
          sync_enabled: syncEnabled,
          created_at: new Date().toISOString()
        };
        repositories.push(result);
      }

      await localStorageService.saveRepositories(repositories);
      await localStorageService.logActivity(`Repositório configurado: ${name}`);

      res.json({ 
        message: 'Repositório configurado com sucesso',
        repository: result 
      });
    } catch (error) {
      console.error('Error configuring repository:', error);
      res.status(500).json({ error: 'Erro ao configurar repositório' });
    }
  }

  /**
   * Create a new sync operation.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async createSyncOperation(req, res) {
    try {
      const { 
        github_repo_full_name,
        sync_type,
        options = {} 
      } = req.body;

      if (!github_repo_full_name || !sync_type) {
        return res.status(400).json({ 
          error: 'Nome completo do repositório e tipo de sincronização são obrigatórios' 
        });
      }

      if (!['push', 'pull', 'bidirectional'].includes(sync_type)) {
        return res.status(400).json({ 
          error: 'Tipo de sincronização inválido' 
        });
      }

      const repositories = await localStorageService.getRepositories();
      const repository = repositories.find(repo => repo.github_repo_id === github_repo_full_name);

      if (!repository) {
        return res.status(404).json({ error: `Repositório "${github_repo_full_name}" não está configurado localmente. Configure-o primeiro.` });
      }

      const operation = {
        id: Date.now().toString(),
        repository_id: repository.id,
        operation_name: `Sync for ${repository.name}`,
        sync_type: sync_type,
        source_path: options.local_path || repository.local_path,
        status: 'pending',
        options,
        created_at: new Date().toISOString()
      };

      const operations = await localStorageService.getSyncOperations();
      operations.push(operation);
      await localStorageService.saveSyncOperations(operations);
      await localStorageService.logActivity(`Operação de sincronização criada: ${operation.operation_name} (${sync_type})`);

      // Start sync operation asynchronously
      this.processSyncOperation(operation.id)
        .catch(error => console.error('Sync operation error:', error));

      res.json({ 
        message: 'Operação de sincronização iniciada',
        operation 
      });
    } catch (error) {
      console.error('Error creating sync operation:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Get sync operations.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async getSyncOperations(req, res) {
    try {
      const { status, limit = 50, offset = 0 } = req.query;

      let operations = await localStorageService.getSyncOperations();
      const repositories = await localStorageService.getRepositories();

      if (status) {
        operations = operations.filter(op => op.status === status);
      }

      operations.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const paginatedOperations = operations.slice(offset, offset + parseInt(limit));

      const enrichedOperations = paginatedOperations.map(op => {
        const repo = repositories.find(r => r.id === op.repository_id);
        return {
          ...op,
          repositories: repo ? {
            name: repo.name,
            github_repo_id: repo.github_repo_id
          } : null
        };
      });

      res.json({ operations: enrichedOperations });
    } catch (error) {
      console.error('Error fetching sync operations:', error);
      res.status(500).json({ error: 'Erro ao buscar operações de sincronização' });
    }
  }

  /**
   * Get details for a specific sync operation.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async getSyncOperationDetails(req, res) {
    try {
      const { operationId } = req.params;

      const operations = await localStorageService.getSyncOperations();
      const operation = operations.find(op => op.id === operationId);

      if (!operation) {
        return res.status(404).json({ error: 'Operação não encontrada' });
      }

      const repositories = await localStorageService.getRepositories();
      const repository = repositories.find(r => r.id === operation.repository_id);

      const enrichedOperation = {
        ...operation,
        repositories: repository ? {
          name: repository.name,
          github_repo_id: repository.github_repo_id,
          local_path: repository.local_path
        } : null,
        sync_logs: []
      };

      res.json({ operation: enrichedOperation });
    } catch (error) {
      console.error('Error fetching sync operation:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Cancel a running sync operation.
   * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  async cancelSyncOperation(req, res) {
    try {
      const { operationId } = req.params;

      const operations = await localStorageService.getSyncOperations();
      const operationIndex = operations.findIndex(op => op.id === operationId && op.status === 'running');

      if (operationIndex === -1) {
        return res.status(404).json({ 
          error: 'Operação não encontrada ou não pode ser cancelada' 
        });
      }

      operations[operationIndex] = {
        ...operations[operationIndex],
        status: 'failed',
        error_message: 'Operação cancelada pelo usuário',
        completed_at: new Date().toISOString()
      };

      await localStorageService.saveSyncOperations(operations);
      await localStorageService.logActivity(`Operação cancelada: ${operations[operationIndex].operation_name}`);

      res.json({ 
        message: 'Operação cancelada com sucesso',
        operation: operations[operationIndex] 
      });
    } catch (error) {
      console.error('Error canceling sync operation:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  /**
   * Processes a sync operation in the background.
   * @param {string} operationId - The ID of the sync operation to process.
   */
  async processSyncOperation(operationId) {
    try {
      const operations = await localStorageService.getSyncOperations();
      const operationIndex = operations.findIndex(op => op.id === operationId);
      
      if (operationIndex === -1) {
        throw new Error('Operação não encontrada');
      }

      const operation = operations[operationIndex];
      
      const repositories = await localStorageService.getRepositories();
      const repository = repositories.find(r => r.id === operation.repository_id);
      
      if (!repository) {
        throw new Error('Repositório não encontrado');
      }

      // Get GitHub token from authenticated user
      const users = await localStorageService.getUsers();
      let githubToken = null;
      let githubUsername = null;

      const user = users.find(u => u.id === SINGLE_USER_ID); // Assuming single user for now
      if (user && user.github_token) {
        githubToken = user.github_token;
        githubUsername = user.github_username || 'github-user';
      }
      
      if (!githubToken) {
        throw new Error('Token do GitHub não encontrado. Faça login e conecte sua conta GitHub.');
      }

      // Initialize GitService with the token
      gitService.init(githubToken, githubUsername);

      // Update status to running
      operations[operationIndex] = {
        ...operations[operationIndex],
        status: 'running',
        started_at: new Date().toISOString()
      };
      await localStorageService.saveSyncOperations(operations);

      await logSyncMessage(operationId, 'info', 'Iniciando operação de sincronização');
      console.log(`[DEBUG] Starting processSyncOperation for operation ${operationId}`);

      const repoPath = operation.source_path || repository.local_path;

      // Execute sync based on type
      switch (operation.sync_type) {
        case 'pull':
          await gitService.performPull(operation.id, repository, repoPath, logSyncMessage);
          break;
        case 'push':
          await gitService.performPush(operation.id, operation, repository, repoPath, logSyncMessage);
          break;
        case 'bidirectional':
          await gitService.performBidirectionalSync(operation.id, operation, repository, repoPath, logSyncMessage);
          break;
        default:
          throw new Error(`Tipo de operação não suportado: ${operation.sync_type}`);
      }

      // Update status to completed
      const updatedOperations = await localStorageService.getSyncOperations();
      const finalIndex = updatedOperations.findIndex(op => op.id === operationId);
      if (finalIndex !== -1) {
        updatedOperations[finalIndex] = {
          ...updatedOperations[finalIndex],
          status: 'completed',
          completed_at: new Date().toISOString()
        };
        await localStorageService.saveSyncOperations(updatedOperations);
      }

      await logSyncMessage(operationId, 'info', 'Operação concluída com sucesso');
      console.log(`[DEBUG] processSyncOperation for operation ${operationId} completed successfully.`);
    } catch (error) {
      console.error('Sync operation failed:', error);
      
      // Update status to failed
      const failedOperations = await localStorageService.getSyncOperations();
      const failedIndex = failedOperations.findIndex(op => op.id === operationId);
      if (failedIndex !== -1) {
        failedOperations[failedIndex] = {
          ...failedOperations[failedIndex],
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        };
        await localStorageService.saveSyncOperations(failedOperations);
      }

      await logSyncMessage(operationId, 'error', `Erro na operação: ${error.message}`);
      console.error(`[DEBUG] processSyncOperation for operation ${operationId} failed with error: ${error.message}`);
    }
  }
}

export const syncController = new SyncController();