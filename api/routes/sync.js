import express from 'express';
import { authenticateUser, requireGitHubAccount } from '../middleware/auth.js';
import { syncController } from '../controllers/syncController.js';
import { initSseConnection } from '../services/syncLogStreamer.js';

const router = express.Router();

// Get user's repositories
router.get('/repositories', syncController.getRepositories);

// Add/Update repository configuration
router.post('/repositories', syncController.configureRepository);

// Create sync operation
router.post('/operations', authenticateUser, requireGitHubAccount, syncController.createSyncOperation);

// Get sync operations
router.get('/operations', authenticateUser, syncController.getSyncOperations);

// SSE endpoint for real-time log streaming
router.get('/operations/:operationId/logs', initSseConnection);

// Get sync operation details
router.get('/operations/:operationId', authenticateUser, syncController.getSyncOperationDetails);

// Cancel sync operation
router.post('/operations/:operationId/cancel', authenticateUser, syncController.cancelSyncOperation);

export default router;