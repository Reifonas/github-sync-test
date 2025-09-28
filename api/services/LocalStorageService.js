import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataDir = path.join(__dirname, '../../data')

class LocalStorageService {
  constructor() {
    this.ensureDataDirectories()
  }

  async ensureDataDirectories() {
    const dirs = [
      dataDir,
      path.join(dataDir, 'auth'),
      path.join(dataDir, 'logs')
    ]

    for (const dir of dirs) {
      try {
        await fs.access(dir)
      } catch {
        await fs.mkdir(dir, { recursive: true })
      }
    }
  }

  async readJSON(filePath) {
    try {
      const fullPath = path.join(dataDir, filePath)
      const data = await fs.readFile(fullPath, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }

  async writeJSON(filePath, data) {
    const fullPath = path.join(dataDir, filePath)
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf8')
  }

  async appendLog(filePath, message) {
    const fullPath = path.join(dataDir, filePath)
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message}\n`
    await fs.appendFile(fullPath, logEntry, 'utf8')
  }

  // Auth methods
  async getTokens() {
    return await this.readJSON('auth/tokens.json') || {} // Expects an object { userId: tokenData }
  }

  // This method should save a token object for a specific user ID
  async saveUserToken(userId, token, userMetadata = {}) {
    const tokens = await this.getTokens();
    tokens[userId] = {
      token, // This is the JWT token
      user_metadata: userMetadata, // Store GitHub user info here
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days for JWT
    };
    await this.writeJSON('auth/tokens.json', tokens);
  }

  async removeUserToken(userId) {
    const tokens = await this.getTokens();
    delete tokens[userId];
    await this.writeJSON('auth/tokens.json', tokens);
  }

  // Repositories methods
  async getRepositories() {
    return await this.readJSON('repositories.json') || []
  }

  async saveRepositories(repositories) {
    await this.writeJSON('repositories.json', repositories)
  }

  async getRepository(repositoryId) {
    const repositories = await this.getRepositories()
    return repositories.find(repo => repo.id === repositoryId)
  }

  async createRepository(repoData) {
    const repositories = await this.getRepositories()
    const newRepo = {
      id: Date.now().toString(),
      ...repoData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    repositories.push(newRepo)
    await this.saveRepositories(repositories)
    return newRepo
  }

  async updateRepository(repositoryId, updateData) {
    const repositories = await this.getRepositories()
    const index = repositories.findIndex(repo => repo.id === repositoryId)
    if (index === -1) {
      throw new Error('Repository not found')
    }
    repositories[index] = { ...repositories[index], ...updateData }
    await this.saveRepositories(repositories)
    return repositories[index]
  }

  // Routines methods
  async getRoutines() {
    return await this.readJSON('routines.json') || []
  }

  async saveRoutines(routines) {
    await this.writeJSON('routines.json', routines)
  }

  async getRoutine(routineId) {
    const routines = await this.getRoutines()
    return routines.find(routine => routine.id === routineId)
  }

  async createRoutine(routineData) {
    const routines = await this.getRoutines()
    const newRoutine = {
      id: Date.now().toString(),
      ...routineData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    routines.push(newRoutine)
    await this.saveRoutines(routines)
    return newRoutine
  }

  async updateRoutine(routineId, updateData) {
    const routines = await this.getRoutines()
    const index = routines.findIndex(routine => routine.id === routineId)
    if (index === -1) {
      throw new Error('Routine not found')
    }
    routines[index] = { ...routines[index], ...updateData }
    await this.saveRoutines(routines)
    return routines[index]
  }

  async deleteRoutine(routineId) {
    const routines = await this.getRoutines()
    const filteredRoutines = routines.filter(routine => routine.id !== routineId)
    await this.saveRoutines(filteredRoutines)
  }

  // Sync operations methods
  async getSyncOperations() {
    return await this.readJSON('sync-operations.json') || []
  }

  async saveSyncOperations(operations) {
    await this.writeJSON('sync-operations.json', operations)
  }

  async getSyncOperation(operationId) {
    const operations = await this.getSyncOperations()
    return operations.find(op => op.id === operationId)
  }

  async createSyncOperation(operationData) {
    const operations = await this.getSyncOperations()
    const newOperation = {
      id: Date.now().toString(),
      ...operationData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    operations.push(newOperation)
    await this.saveSyncOperations(operations)
    return newOperation
  }

  async updateSyncOperation(operationId, updateData) {
    const operations = await this.getSyncOperations()
    const index = operations.findIndex(op => op.id === operationId)
    if (index === -1) {
      throw new Error('Sync operation not found')
    }
    operations[index] = { ...operations[index], ...updateData, updated_at: new Date().toISOString() }
    await this.saveSyncOperations(operations)
    return operations[index]
  }

  async logSyncMessage(operationId, message, level = 'info') {
    const logMessage = `[${level.toUpperCase()}] Operation ${operationId}: ${message}`
    await this.appendLog('logs/sync-operations.txt', logMessage)
  }

  // Activity logs (structured)
  async createLog(logEntry) {
    const logs = await this.readJSON('logs/app-logs.json') || [];
    logs.push({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...logEntry
    });
    // Keep logs to a reasonable size, e.g., last 1000 entries
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    await this.writeJSON('logs/app-logs.json', logs);
  }

  async getLogs() {
    return await this.readJSON('logs/app-logs.json') || [];
  }

  async logActivity(message, level = 'info', metadata = {}, userId = 'system') { // Added userId parameter
    await this.createLog({
      level,
      message,
      metadata,
      user_id: userId // Use passed userId or default to 'system'
    });
  }

  // User operations
  async getUsers() {
    return await this.readJSON('users.json') || [];
  }

  async getUser(id) {
    const users = await this.getUsers();
    return users.find(user => user.id === id) || null;
  }

  async createUser(user) {
    const users = await this.getUsers();
    const newUser = {
      id: user.id || Date.now().toString(), // Use provided ID or generate new
      email: user.email || '',
      full_name: user.full_name || '', // Ensure full_name is handled
      github_username: user.github_username || '',
      github_token: user.github_token || '',
      avatar_url: user.avatar_url || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      preferences: user.preferences || {}
    };
    users.push(newUser);
    await this.writeJSON('users.json', users);
    return newUser;
  }

  async updateUser(id, updates) {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...updates, updated_at: new Date().toISOString() };
    await this.writeJSON('users.json', users);
    return users[index];
  }

  async deleteUser(id) {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    
    users.splice(index, 1);
    await this.writeJSON('users.json', users);
    return true;
  }
}

export const localStorageService = new LocalStorageService()
export default localStorageService