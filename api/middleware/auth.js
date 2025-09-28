import localStorageService from '../services/LocalStorageService.js'
import jwt from 'jsonwebtoken' // Add this import

/**
 * Middleware to authenticate users using JWT tokens or base64 encoded JSON
 */
export const authenticateUser = async (req, res, next) => {
  console.log('AUTH: authenticateUser middleware started');
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('AUTH: No Bearer token provided');
      return res.status(401).json({ 
        error: 'Token de acesso não fornecido' 
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    console.log('AUTH: Received token (first 10 chars):', token.substring(0, Math.min(token.length, 10)));

    // First, try to find the token in the backend's stored tokens (if it's a JWT from our login)
    const storedTokens = await localStorageService.getTokens() // This is an object, not an array
    let userData = null
    let userId = null
    
    // Iterate through stored tokens to find a match
    for (const id in storedTokens) {
      if (storedTokens[id].token === token) { // Check if the token matches a stored JWT
        console.log('AUTH: Token found in stored tokens (JWT)');
        // Check if token is expired (this logic is for JWTs)
        try {
          const decodedJwt = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
          if (decodedJwt.exp * 1000 < Date.now()) {
            console.log('AUTH: Stored JWT token expired');
            return res.status(401).json({ 
              error: 'Token expirado',
              code: 'TOKEN_EXPIRED'
            })
          }
          userId = id;
          userData = storedTokens[id];
          break;
        } catch (jwtError) {
          console.log('AUTH: Stored token is not a valid JWT or secret mismatch, trying base64:', jwtError.message);
          // If it's not a valid JWT, it might be the base64 token from frontend, continue to next block
        }
      }
    }
    
    if (!userData) { // If not found as a stored JWT
      console.log('AUTH: Token not found as stored JWT, attempting base64 decode');
      // Try to decode as base64 token (from frontend apiService)
      try {
        console.log('AUTH: Attempting base64 decode of token:', token.substring(0, Math.min(token.length, 20)) + '...'); // DEBUG LOG
        const decoded = Buffer.from(token, 'base64').toString('utf8')
        console.log('AUTH: Decoded string:', decoded.substring(0, Math.min(decoded.length, 50)) + '...'); // DEBUG LOG
        const decodedData = JSON.parse(decoded)
        console.log('AUTH: Base64 token decoded successfully:', decodedData);
        
        if (!decodedData.user_id || !decodedData.email) {
          console.log('AUTH: Decoded base64 token missing user_id or email');
          throw new Error('Invalid token format')
        }
        
        // Create user object from base64 decoded data
        req.user = {
          id: decodedData.user_id,
          user_metadata: {
            github_username: decodedData.github_username || '',
            avatar_url: decodedData.avatar_url || '',
            name: decodedData.name || ''
          },
          email: decodedData.email || `${decodedData.user_id}@github.local`,
          created_at: decodedData.created_at || new Date().toISOString(),
          role: 'authenticated'
        }
        console.log('AUTH: req.user set from base64 token:', req.user.id);
        return next()
      } catch (decodeError) {
        console.error('AUTH: Base64 decode failed:', decodeError.message);
        return res.status(401).json({ 
          error: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN'
        })
      }
    } else { // If userData was found as a stored JWT
      console.log('AUTH: req.user set from stored JWT token:', userId);
      req.user = {
        id: userId,
        user_metadata: userData.user_metadata || {},
        email: userData.user_metadata.email || userData.email || `user-${userId}@github.local`,
        created_at: userData.createdAt,
        role: 'authenticated'
      }
      return next()
    }
    
  } catch (error) {
    console.error('AUTH: Critical authentication middleware error:', error);
    return res.status(500).json({ 
      error: 'Erro interno de autenticação' 
    })
  }
}

/**
 * Middleware to optionally authenticate users (doesn't fail if no token)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      const tokens = await localStorageService.getTokens()
      
      for (const [id, tokenData] of Object.entries(tokens)) {
        if (tokenData.token === token && new Date(tokenData.expiresAt) > new Date()) {
          req.user = {
            id: id,
            user_metadata: tokenData.user_metadata || {},
            email: tokenData.email || `user-${id}@github.local`
          }
          req.token = token
          break
        }
      }
    }
    
    next()
  } catch (error) {
    console.error('Optional auth middleware error:', error)
    // Continue without authentication
    next()
  }
}

export const requireGitHubToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso necessário' })
    }

    const token = authHeader.substring(7)
    
    // Get tokens from local storage
    const tokens = await localStorageService.getTokens()
    
    // Find user by token
    let userData = null
    let userId = null
    
    for (const id in tokens) { // Iterate over object keys
      if (tokens[id].token === token) {
        if (new Date(tokens[id].expiresAt) < new Date()) {
          return res.status(401).json({ 
            error: 'Token expirado',
            code: 'TOKEN_EXPIRED'
          })
        }
        
        userId = id
        userData = tokens[id]
        break
      }
    }
    
    if (!userData) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    req.user = {
      id: userId,
      user_metadata: userData.user_metadata || {},
      email: userData.user_metadata.email || userData.email || `user-${userId}@github.local`
    }

    // Check if user has GitHub token
    if (!userData.github_token) {
      return res.status(400).json({ 
        error: 'Conta do GitHub não conectada',
        code: 'GITHUB_NOT_CONNECTED'
      })
    }

    // Verify GitHub token is still valid
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${userData.github_token}`,
          'User-Agent': 'Gatohub-Sync-Pro'
        }
      })

      if (!response.ok) {
        return res.status(400).json({ 
          error: 'Token do GitHub inválido ou expirado',
          code: 'GITHUB_TOKEN_INVALID'
        })
      }

      req.githubAccount = {
        access_token: userData.github_token,
        user_id: userId
      }
      
      next()
    } catch (error) {
      console.error('Error verifying GitHub token:', error)
      return res.status(500).json({ error: 'Erro ao verificar token do GitHub' })
    }
  } catch (error) {
    console.error('GitHub token middleware error:', error)
    return res.status(500).json({ error: 'Erro interno do servidor' })
  }
}

/**
 * Middleware to check if user has a GitHub account linked
 */
export const requireGitHubAccount = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuário não autenticado' 
      })
    }

    const tokens = await localStorageService.getTokens()
    const userData = tokens[req.user.id]
    
    if (!userData || !userData.github_token) {
      return res.status(400).json({ 
        error: 'Nenhuma conta GitHub vinculada. Vincule uma conta GitHub primeiro.' 
      })
    }
    
    req.githubAccount = {
      access_token: userData.github_token,
      user_id: req.user.id
    }
    
    next()
  } catch (error) {
    console.error('GitHub account middleware error:', error)
    return res.status(500).json({ 
      error: 'Erro ao verificar conta GitHub' 
    })
  }
}

/**
 * Rate limiting middleware
 */
const rateLimitStore = new Map()

export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress
    const now = Date.now()
    const windowStart = now - windowMs
    
    // Clean old entries
    if (rateLimitStore.has(key)) {
      const requests = rateLimitStore.get(key).filter(time => time > windowStart)
      rateLimitStore.set(key, requests)
    } else {
      rateLimitStore.set(key, [])
    }
    
    const requests = rateLimitStore.get(key)
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({ 
        error: 'Muitas requisições. Tente novamente mais tarde.' 
      })
    }
    
    requests.push(now)
    rateLimitStore.set(key, requests)
    
    next()
  }
}

/**
 * Validation middleware
 */
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos',
        details: error.details.map(detail => detail.message)
      })
    }
    
    next()
  }
}

/**
 * Error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('API Error:', err)
  
  // Supabase errors
  if (err.code) {
    return res.status(400).json({ 
      error: err.message || 'Erro na operação do banco de dados' 
    })
  }
  
  // GitHub API errors
  if (err.status) {
    return res.status(err.status).json({ 
      error: err.message || 'Erro na API do GitHub' 
    })
  }
  
  // Default error
  res.status(500).json({ 
      error: 'Erro interno do servidor' 
  })
}