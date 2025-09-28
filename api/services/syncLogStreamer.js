import localStorageService from './LocalStorageService.js';

// Store active SSE connections for real-time log streaming
const sseConnections = new Map();

/**
 * Helper function to log sync messages to local storage and stream via SSE.
 * @param {string} operationId - The ID of the sync operation.
 * @param {'info' | 'warning' | 'error' | 'success'} level - The log level.
 * @param {string} message - The log message.
 */
export async function logSyncMessage(operationId, level, message) {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${level.toUpperCase()}] ${message} (Operation: ${operationId})`;
    
    // Save to local storage
    await localStorageService.logActivity(logEntry, level, { operationId, category: 'sync' });
    
    // Send real-time log via SSE to connected clients
    if (sseConnections.has(operationId)) {
      const logData = {
        type: 'log',
        level: level,
        message: message,
        operationId: operationId,
        timestamp: timestamp
      };
      
      const sseMessage = `data: ${JSON.stringify(logData)}\n\n`;
      
      // Send to all connected clients for this operation
      const connections = sseConnections.get(operationId);
      const deadConnections = new Set();
      
      for (const connection of connections) {
        try {
          connection.write(sseMessage);
        } catch (error) {
          // Connection is dead, mark for removal
          deadConnections.add(connection);
        }
      }
      
      // Remove dead connections
      for (const deadConnection of deadConnections) {
        connections.delete(deadConnection);
      }
      
      // Clean up empty connection sets
      if (connections.size === 0) {
        sseConnections.delete(operationId);
      }
    }
  } catch (error) {
    console.error('Error logging sync message:', error);
  }
}

/**
 * Initializes an SSE connection for a given operation ID.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 */
export function initSseConnection(req, res) {
  const { operationId } = req.params;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Store connection for this operation
  if (!sseConnections.has(operationId)) {
    sseConnections.set(operationId, new Set());
  }
  sseConnections.get(operationId).add(res);
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Conectado ao stream de logs',
    timestamp: new Date().toISOString()
  })}\n\n`);
  
  // Handle client disconnect
  req.on('close', () => {
    if (sseConnections.has(operationId)) {
      sseConnections.get(operationId).delete(res);
      if (sseConnections.get(operationId).size === 0) {
        sseConnections.delete(operationId);
      }
    }
  });
}