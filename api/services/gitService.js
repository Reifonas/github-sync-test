import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import localStorageService from './LocalStorageService.js'; // For user data to get token

/**
 * Executes Git commands and interacts with GitHub API.
 */
class GitService {
  constructor() {
    this.octokit = null;
    this.githubToken = null;
    this.githubUsername = null;
  }

  /**
   * Initializes Octokit with the GitHub token.
   * @param {string} token - GitHub Personal Access Token.
   * @param {string} username - GitHub username.
   */
  init(token, username) {
    this.githubToken = token;
    this.githubUsername = username;
    this.octokit = new Octokit({ auth: token });
  }

  /**
   * Performs a Git pull operation.
   * @param {string} operationId - The ID of the sync operation.
   * @param {object} repository - The repository object.
   * @param {string} repoPath - The local path of the repository.
   * @param {function} logSyncMessage - Function to log messages.
   */
  async performPull(operationId, repository, repoPath, logSyncMessage) {
    await logSyncMessage(operationId, 'info', 'Executando pull do repositório');
    console.log(`[DEBUG] Starting performPull for operation ${operationId}`);
    
    try {
      // Check if directory exists
      try {
        await fs.access(repoPath);
        // Directory exists, pull changes
        console.log(`[DEBUG] Directory exists. Executing git pull origin main at ${repoPath}`);
        execSync('git pull origin main', { cwd: repoPath, stdio: 'pipe' });
        await logSyncMessage(operationId, 'info', 'Pull executado com sucesso');
        console.log(`[DEBUG] Git pull complete.`);
      } catch (dirError) {
        console.log(`[DEBUG] Directory does not exist or access error: ${dirError.message}. Cloning repository.`);
        // Directory doesn't exist, clone repository
        const [owner, repo] = repository.github_repo_id.split('/');
        const { data: repoData } = await this.octokit.rest.repos.get({ owner, repo });
        
        console.log(`[DEBUG] Cloning repository ${repoData.clone_url} into "${repoPath}"`);
        execSync(`git clone ${repoData.clone_url} "${repoPath}"`, { stdio: 'pipe' });
        await logSyncMessage(operationId, 'info', 'Repositório clonado com sucesso');
        console.log(`[DEBUG] Repository cloned successfully.`);
      }
    } catch (error) {
      console.error(`[DEBUG] Error during performPull: ${error.message}`);
      throw new Error(`Erro no pull: ${error.message}`);
    }
    console.log(`[DEBUG] performPull for operation ${operationId} completed.`);
  }

  /**
   * Performs a Git push operation.
   * @param {string} operationId - The ID of the sync operation.
   * @param {object} operation - The sync operation object.
   * @param {object} repository - The repository object.
   * @param {string} repoPath - The local path of the repository.
   * @param {function} logSyncMessage - Function to log messages.
   */
  async performPush(operationId, operation, repository, repoPath, logSyncMessage) {
    await logSyncMessage(operationId, 'info', 'Executando push para o repositório');
    console.log(`[DEBUG] Starting performPush for operation ${operationId}`);
    
    try {
      if (!this.githubToken || !this.githubUsername) {
        console.error(`[DEBUG] GitHub token or username not found for push.`);
        throw new Error('Token do GitHub não encontrado para push');
      }

      await logSyncMessage(operationId, 'info', `Configurando credenciais para usuário: ${this.githubUsername}`);
      console.log(`[DEBUG] Configuring credentials for user: ${this.githubUsername}`);

      // Validate repository identifier
      const repoIdentifier = repository.github_repo_id;
      if (!repoIdentifier || !repoIdentifier.includes('/')) {
          await logSyncMessage(operationId, 'error', `Formato de ID do repositório GitHub inválido: "${repoIdentifier}". Esperado "owner/repo".`);
          console.error(`[DEBUG] Invalid GitHub repository ID format: "${repoIdentifier}"`);
          throw new Error(`Formato de ID do repositório GitHub inválido: "${repoIdentifier}". Esperado "owner/repo".`);
      }
      const [owner, repoName] = repoIdentifier.split('/');

      if (!owner || !repoName) {
          await logSyncMessage(operationId, 'error', `Não foi possível extrair owner/repo do ID: "${repoIdentifier}"`);
          console.error(`[DEBUG] Could not extract owner/repo from ID: "${repoIdentifier}"`);
          throw new Error(`Não foi possível extrair owner/repo do ID: "${repoIdentifier}"`);
      }

      // Configure git credentials with GitHub token
      const remoteUrl = `https://${this.githubToken}@github.com/${owner}/${repoName}.git`;
      
      // Verify repository path exists and is a git repository
      console.log(`[DEBUG] Checking for .git directory at ${repoPath}`);
      try {
        await fs.access(path.join(repoPath, '.git'));
        console.log(`[DEBUG] .git directory found.`);
      } catch (gitDirError) {
        console.log(`[DEBUG] .git directory not found: ${gitDirError.message}. Initializing Git repository...`);
        await logSyncMessage(operationId, 'info', 'Inicializando repositório Git...');
        execSync('git init', { cwd: repoPath, stdio: 'pipe' });
        console.log(`[DEBUG] Git init complete.`);
      }
      
      // Set git config for this operation
      console.log(`[DEBUG] Setting git user config...`);
      try {
        execSync(`git config user.name "${this.githubUsername}"`, { cwd: repoPath, stdio: 'pipe' });
        execSync(`git config user.email "${this.githubUsername}@users.noreply.github.com"`, { cwd: repoPath, stdio: 'pipe' });
        await logSyncMessage(operationId, 'info', `Configuração Git definida para: ${this.githubUsername}`);
        console.log(`[DEBUG] Git user config set.`);
      } catch (error) {
        console.error(`[DEBUG] Error setting Git config: ${error.message}`);
        throw new Error(`Erro ao configurar Git: ${error.message}`);
      }
      
      // Update remote URL with token
      console.log(`[DEBUG] Setting remote URL to ${remoteUrl}`);
      try {
        execSync(`git remote set-url origin "${remoteUrl}"`, { cwd: repoPath, stdio: 'pipe' });
        await logSyncMessage(operationId, 'info', 'URL remota atualizada com token de autenticação');
        console.log(`[DEBUG] Remote URL updated.`);
      } catch (remoteError) {
        console.log(`[DEBUG] Remote 'origin' not found or error updating: ${remoteError.message}. Attempting to add remote.`);
        // If remote doesn't exist, add it
        execSync(`git remote add origin "${remoteUrl}"`, { cwd: repoPath, stdio: 'pipe' });
        await logSyncMessage(operationId, 'info', 'URL remota adicionada com token de autenticação');
        console.log(`[DEBUG] Remote URL added.`);
      }
      
      // Check for modified files before adding
      await logSyncMessage(operationId, 'info', 'Verificando arquivos modificados...');
      console.log(`[DEBUG] Executing git status --porcelain at ${repoPath}`);
      let statusOutput;
      try {
        statusOutput = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' });
        console.log(`[DEBUG] Git status output: ${statusOutput.trim()}`);
      } catch (error) {
        console.error(`[DEBUG] Error during git status: ${error.message}`);
        throw new Error(`Erro ao verificar status do git: ${error.message}`);
      }
      
      if (!statusOutput.trim()) {
        await logSyncMessage(operationId, 'info', 'Nenhuma alteração detectada para fazer push');
        console.log(`[DEBUG] No changes detected. Skipping push.`);
        return; // Retorna se não houver alterações
      }
      
      // Log each modified file
      const modifiedFiles = statusOutput.trim().split('\n');
      await logSyncMessage(operationId, 'info', `Encontrados ${modifiedFiles.length} arquivo(s) modificado(s):`);
      console.log(`[DEBUG] Found ${modifiedFiles.length} modified file(s).`);
      
      for (const file of modifiedFiles) {
        const status = file.substring(0, 2);
        const fileName = file.substring(3);
        let statusText = '';
        
        if (status.includes('M')) statusText = 'Modificado';
        else if (status.includes('A')) statusText = 'Adicionado';
        else if (status.includes('D')) statusText = 'Deletado';
        else if (status.includes('R')) statusText = 'Renomeado';
        else if (status.includes('??')) statusText = 'Não rastreado';
        else statusText = 'Alterado';
        
        await logSyncMessage(operationId, 'info', `  ${statusText}: ${fileName}`);
        console.log(`[DEBUG]   ${statusText}: ${fileName}`);
      }
      
      // Add all changes
      await logSyncMessage(operationId, 'info', 'Adicionando arquivos ao stage...');
      console.log(`[DEBUG] Executing git add . at ${repoPath}`);
      execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
      console.log(`[DEBUG] Git add complete.`);
      
      // Verify staged files
      console.log(`[DEBUG] Verifying staged files...`);
      let stagedOutput;
      try {
        stagedOutput = execSync('git diff --cached --name-status', { cwd: repoPath, encoding: 'utf8' });
        console.log(`[DEBUG] Git diff --cached output: ${stagedOutput.trim()}`);
      } catch (error) {
        console.error(`[DEBUG] Error verifying staged files: ${error.message}`);
        throw new Error(`Erro ao verificar arquivos staged: ${error.message}`);
      }
      
      if (!stagedOutput.trim()) {
        await logSyncMessage(operationId, 'info', 'Nenhum arquivo foi adicionado ao stage');
        console.log(`[DEBUG] No files staged. Skipping push.`);
        return; // Retorna se nenhum arquivo foi staged
      }
      
      // Log staged files
      const stagedFiles = stagedOutput.trim().split('\n');
      await logSyncMessage(operationId, 'info', `${stagedFiles.length} arquivo(s) adicionado(s) ao stage:`);
      console.log(`[DEBUG] Found ${stagedFiles.length} staged file(s).`);
      
      for (const file of stagedFiles) {
        const [status, fileName] = file.split('\t');
        let statusText = '';
        
        if (status === 'M') statusText = 'Modificado';
        else if (status === 'A') statusText = 'Adicionado';
        else if (status === 'D') statusText = 'Deletado';
        else if (status === 'R') statusText = 'Renomeado';
        else statusText = 'Alterado';
        
        await logSyncMessage(operationId, 'info', `  ${statusText}: ${fileName}`);
        console.log(`[DEBUG]   ${statusText}: ${fileName}`);
      }
      
      // Commit changes
      const commitMessage = operation.options?.commitMessage || `Sync: ${new Date().toISOString()}`;
      await logSyncMessage(operationId, 'info', `Criando commit com mensagem: "${commitMessage}"`);
      console.log(`[DEBUG] Executing git commit -m "${commitMessage}" at ${repoPath}`);
      
      try {
        execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath, stdio: 'pipe' });
        await logSyncMessage(operationId, 'info', 'Commit criado com sucesso');
        console.log(`[DEBUG] Git commit complete.`);
      } catch (error) {
        const errorMessage = error.message || error.toString();
        if (errorMessage.includes('nothing to commit')) {
          await logSyncMessage(operationId, 'warning', 'Nenhuma alteração para commit. Pulando push.');
          console.log(`[DEBUG] No changes to commit. Skipping push.`);
          return; // Sai mais cedo se não houver nada para commitar
        }
        console.error(`[DEBUG] Error during git commit: ${errorMessage}`);
        throw new Error(`Erro ao criar commit: ${errorMessage}`);
      }
      
      // Push changes
      await logSyncMessage(operationId, 'info', 'Enviando alterações para o GitHub...');
      console.log(`[DEBUG] Executing git push origin main at ${repoPath}`);
      
      try {
        const pushOutput = execSync('git push origin main', { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' });
        await logSyncMessage(operationId, 'info', 'Push executado com sucesso!');
        console.log(`[DEBUG] Git push complete. Output: ${pushOutput.trim()}`);
        
        // Log push details if available
        if (pushOutput && pushOutput.trim()) {
          await logSyncMessage(operationId, 'info', `Detalhes do push: ${pushOutput.trim()}`);
          console.log(`[DEBUG] Push details: ${pushOutput.trim()}`);
        }
        
        await logSyncMessage(operationId, 'info', `Repositório ${repository.name} atualizado no GitHub`);
        console.log(`[DEBUG] Repository ${repository.name} updated on GitHub.`);
      } catch (error) {
        const errorMessage = error.message || error.toString();
        console.error(`[DEBUG] Error during git push: ${errorMessage}`);
        
        // Handle specific error types
        if (errorMessage.includes('rejected')) {
          if (errorMessage.includes('non-fast-forward')) {
            await logSyncMessage(operationId, 'error', 'Push rejeitado: há commits remotos mais recentes');
            await logSyncMessage(operationId, 'info', 'Tentando fazer pull antes do push...');
            console.log(`[DEBUG] Push rejected (non-fast-forward). Attempting pull before retry.`);
            
            try {
              execSync('git pull origin main --rebase', { cwd: repoPath, stdio: 'pipe' });
              await logSyncMessage(operationId, 'info', 'Pull com rebase executado, tentando push novamente...');
              console.log(`[DEBUG] Pull with rebase complete. Retrying push.`);
              
              const retryPushOutput = execSync('git push origin main', { cwd: repoPath, encoding: 'utf8', stdio: 'pipe' });
              await logSyncMessage(operationId, 'info', 'Push executado com sucesso após rebase!');
              console.log(`[DEBUG] Push successful after rebase. Output: ${retryPushOutput.trim()}`);
              
              if (retryPushOutput && retryPushOutput.trim()) {
                await logSyncMessage(operationId, 'info', `Detalhes do push: ${retryPushOutput.trim()}`);
                console.log(`[DEBUG] Retry push details: ${retryPushOutput.trim()}`);
              }
              
              await logSyncMessage(operationId, 'info', `Repositório ${repository.name} atualizado no GitHub`);
              console.log(`[DEBUG] Repository ${repository.name} updated on GitHub after rebase.`);
            } catch (retryError) {
              console.error(`[DEBUG] Error after rebase attempt: ${retryError.message}`);
              throw new Error(`Erro após tentativa de rebase: ${retryError.message}`);
            }
          } else {
            console.error(`[DEBUG] Push rejected by server: ${errorMessage}`);
            throw new Error(`Push rejeitado pelo servidor: ${errorMessage}`);
          }
        } else if (errorMessage.includes('Permission denied') || errorMessage.includes('403')) {
          console.error(`[DEBUG] Permission error: ${errorMessage}`);
          throw new Error('Erro de permissão: verifique se o token tem acesso de escrita ao repositório');
        } else if (errorMessage.includes('Could not resolve host') || errorMessage.includes('network')) {
          console.error(`[DEBUG] Connectivity error: ${errorMessage}`);
          throw new Error('Erro de conectividade: verifique sua conexão com a internet');
        } else if (errorMessage.includes('Authentication failed')) {
          console.error(`[DEBUG] Authentication failed: ${errorMessage}`);
          throw new Error('Falha na autenticação: token do GitHub pode estar inválido ou expirado');
        } else {
          console.error(`[DEBUG] Unknown error during push: ${errorMessage}`);
          throw new Error(`Erro ao fazer push: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error(`[DEBUG] Error in performPush: ${error.message}`);
      await logSyncMessage(operationId, 'error', `Erro durante push: ${error.message}`);
      throw error;
    }
    console.log(`[DEBUG] performPush for operation ${operationId} completed.`);
  }

  /**
   * Performs a bidirectional sync operation (pull then push).
   * @param {string} operationId - The ID of the sync operation.
   * @param {object} operation - The sync operation object.
   * @param {object} repository - The repository object.
   * @param {string} repoPath - The local path of the repository.
   * @param {function} logSyncMessage - Function to log messages.
   */
  async performBidirectionalSync(operationId, operation, repository, repoPath, logSyncMessage) {
    await logSyncMessage(operationId, 'info', 'Executando sincronização bidirecional');
    console.log(`[DEBUG] Starting performBidirectionalSync for operation ${operationId}`);
    
    try {
      // First pull to get latest changes
      await this.performPull(operationId, repository, repoPath, logSyncMessage);
      
      // Then push local changes
      await this.performPush(operationId, operation, repository, repoPath, logSyncMessage);
      
      await logSyncMessage(operationId, 'info', 'Sincronização bidirecional concluída');
      console.log(`[DEBUG] Bidirectional sync for operation ${operationId} completed.`);
    } catch (error) {
      console.error(`[DEBUG] Error during performBidirectionalSync: ${error.message}`);
      throw new Error(`Erro na sincronização bidirecional: ${error.message}`);
    }
  }
}

export const gitService = new GitService();