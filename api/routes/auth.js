import express from 'express'
import localStorageService from '../services/LocalStorageService.js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { authenticateUser } from '../middleware/auth.js' // Adicionando esta linha para importar o middleware

const router = express.Router()

// Single user ID for local application
const SINGLE_USER_ID = 'd2929b81-cb3f-47a1-b47b-6b0311964361';

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      })
    }

    // Check if user already exists
    const users = await localStorageService.readJSON('users.json') || []
    const existingUser = users.find(u => u.email === email)
    
    if (existingUser) {
      return res.status(400).json({ error: 'Usuário já existe com este email' })
    }

    // Hash password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')
    
    // Create new user
    const newUser = {
      id: SINGLE_USER_ID, // Use the consistent SINGLE_USER_ID
      email,
      full_name: fullName || '',
      password: hashedPassword,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    users.push(newUser)
    await localStorageService.writeJSON('users.json', users)
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )
    
    // Save token for the user
    await localStorageService.saveUserToken(newUser.id, token, { email: newUser.email, full_name: newUser.full_name });

    res.json({ 
      message: 'Usuário registrado com sucesso',
      user: { id: newUser.id, email: newUser.email, full_name: newUser.full_name },
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email e senha são obrigatórios' 
      })
    }

    // Find user
    const users = await localStorageService.readJSON('users.json') || []
    const user = users.find(u => u.email === email)
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    // Verify password
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex')
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )
    
    // Save token for the user
    await localStorageService.saveUserToken(user.id, token, { email: user.email, full_name: user.full_name });

    res.json({ 
      message: 'Login realizado com sucesso',
      user: { id: user.id, email: user.email, full_name: user.full_name },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// GitHub OAuth initiation
router.get('/github', (req, res) => {
  const clientId = process.env.VITE_GITHUB_CLIENT_ID || process.env.GITHUB_CLIENT_ID
  const callbackUrl = process.env.CALLBACK_URL || 'http://localhost:5173/auth/callback'
  
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=repo,user:email`
  
  res.json({ authUrl: githubAuthUrl })
})

// GitHub OAuth callback (this is for the initial OAuth flow, not linking PAT)
router.post('/github/callback', async (req, res) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Código de autorização é obrigatório' })
    }

    // Exchange code for access token with GitHub
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      })
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description })
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${tokenData.access_token}`,
        'User-Agent': 'GitHub-Sync-Pro'
      }
    })

    const githubUser = await userResponse.json()

    res.json({
      access_token: tokenData.access_token,
      github_user: githubUser
    })
  } catch (error) {
    console.error('GitHub OAuth error:', error)
    res.status(500).json({ error: 'Erro na autenticação com GitHub' })
  }
})

// New endpoint to link GitHub PAT to an authenticated user
router.post('/link-github-token', authenticateUser, async (req, res) => {
  console.log('ROUTE: /api/auth/link-github-token hit!');
  try {
    const { accessToken, githubUsername, avatarUrl, userId } = req.body;
    console.log('ROUTE: Request body:', req.body);
    console.log('ROUTE: Authenticated user ID from middleware:', req.user.id);

    const authenticatedUserId = req.user.id;

    // Ensure the userId from body matches the authenticated user
    if (userId !== authenticatedUserId) {
      console.log('ROUTE: User ID mismatch:', userId, authenticatedUserId);
      return res.status(403).json({ error: 'Acesso negado: ID de usuário não corresponde' });
    }

    // Get existing user token data
    console.log('ROUTE: Fetching existing tokens...');
    const tokens = await localStorageService.getTokens();
    console.log('ROUTE: Existing tokens:', JSON.stringify(tokens));
    let userTokenData = tokens[authenticatedUserId];

    if (!userTokenData) {
      console.log('ROUTE: No existing token data for this user. Creating new entry.');
      // If no JWT token data exists for this user, create a basic one
      // This might happen if the user only connected via GitHub PAT without prior email/password login
      userTokenData = {
        token: req.headers.authorization?.replace('Bearer ', '') || '', // Use the base64 token from header
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default expiration
      };
      tokens[authenticatedUserId] = userTokenData;
      console.log('ROUTE: Created new basic token entry for user:', authenticatedUserId);
    }

    // Update user's token data with GitHub info
    userTokenData.github_token = accessToken;
    userTokenData.user_metadata = {
      github_username: githubUsername,
      avatar_url: avatarUrl,
    };
    userTokenData.updated_at = new Date().toISOString();

    console.log('ROUTE: Saving updated tokens to auth/tokens.json...');
    await localStorageService.writeJSON('auth/tokens.json', tokens);
    console.log('ROUTE: auth/tokens.json updated with GitHub token');

    // Update the user in the 'users.json' as well for consistency
    console.log('ROUTE: Fetching existing users...');
    const users = await localStorageService.readJSON('users.json') || [];
    console.log('ROUTE: Existing users:', JSON.stringify(users));
    const userIndex = users.findIndex(u => u.id === authenticatedUserId);
    if (userIndex !== -1) {
      console.log('ROUTE: User found in users.json. Updating...');
      users[userIndex] = {
        ...users[userIndex],
        github_username: githubUsername,
        github_token: accessToken, // Store the raw GitHub token here for easy access
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };
      await localStorageService.writeJSON('users.json', users);
      console.log('ROUTE: users.json updated with GitHub info');
    } else {
      console.warn(`ROUTE: User with ID ${authenticatedUserId} not found in users.json during GitHub link. Creating new entry.`);
      // If user not found in users.json, create a basic entry
      await localStorageService.createUser({
        id: authenticatedUserId,
        email: req.user.email || `${authenticatedUserId}@github.local`,
        full_name: req.user.user_metadata?.name || githubUsername, // Use full_name from req.user if available
        github_username: githubUsername,
        github_token: accessToken,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
      });
      console.log('ROUTE: Created new user entry in users.json');
    }

    res.json({ message: 'Token GitHub vinculado com sucesso', githubUsername, avatarUrl });
    console.log('ROUTE: Response sent: Token GitHub vinculado com sucesso');
  } catch (error) {
    console.error('ROUTE: Error linking GitHub token:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao vincular token GitHub' });
  }
});

// Disconnect GitHub account
router.post('/github/disconnect', authenticateUser, async (req, res) => {
  console.log('ROUTE: /api/auth/github/disconnect hit!');
  try {
    const authenticatedUserId = req.user.id;

    const tokens = await localStorageService.getTokens();
    const userTokenData = tokens[authenticatedUserId];

    if (userTokenData) {
      delete userTokenData.github_token;
      delete userTokenData.user_metadata;
      userTokenData.updated_at = new Date().toISOString();
      await localStorageService.writeJSON('auth/tokens.json', tokens);
      console.log('ROUTE: GitHub token and metadata removed from auth/tokens.json');
    }

    // Also update users.json
    const users = await localStorageService.readJSON('users.json') || [];
    const userIndex = users.findIndex(u => u.id === authenticatedUserId);
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        github_username: '',
        github_token: '',
        avatar_url: '',
        updated_at: new Date().toISOString(),
      };
      await localStorageService.writeJSON('users.json', users);
      console.log('ROUTE: GitHub info removed from users.json');
    }

    res.json({ message: 'Conta GitHub desconectada com sucesso' });
    console.log('ROUTE: Response sent: Conta GitHub desconectada com sucesso');
  } catch (error) {
    console.error('ROUTE: Error disconnecting GitHub account:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao desconectar conta GitHub' });
  }
});

// Get current user profile
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = req.user
    
    // Fetch user from users.json to get full profile data
    const users = await localStorageService.readJSON('users.json') || [];
    const fullUser = users.find(u => u.id === user.id);

    if (!fullUser) {
      return res.status(404).json({ error: 'Perfil do usuário não encontrado' });
    }

    // Also get GitHub connection status from auth/tokens.json
    const tokens = await localStorageService.getTokens();
    const userTokenData = tokens[user.id];
    const githubConnected = !!userTokenData?.github_token;
    const githubUsername = userTokenData?.user_metadata?.github_username || '';
    const avatar_url = userTokenData?.user_metadata?.avatar_url || '';

    res.json({ 
      id: fullUser.id,
      email: fullUser.email,
      full_name: fullUser.full_name,
      created_at: fullUser.created_at,
      updated_at: fullUser.updated_at,
      preferences: fullUser.preferences || {},
      github_connected: githubConnected,
      github_username: githubUsername,
      avatar_url: avatar_url
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Update user profile
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id
    const { fullName, preferences } = req.body

    const users = await localStorageService.readJSON('users.json') || []
    const userIndex = users.findIndex(u => u.id === userId)
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    }

    if (fullName !== undefined) {
      updateData.full_name = fullName
    }

    if (preferences !== undefined) {
      updateData.preferences = preferences
    }
    
    users[userIndex] = { ...users[userIndex], ...updateData }
    await localStorageService.writeJSON('users.json', users)

    res.json({ 
      message: 'Perfil atualizado com sucesso',
      user: {
        id: users[userIndex].id,
        email: users[userIndex].email,
        full_name: users[userIndex].full_name,
        created_at: users[userIndex].created_at,
        updated_at: users[userIndex].updated_at,
        preferences: users[userIndex].preferences || {}
      }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

// Logout (invalidate session)
router.post('/logout', authenticateUser, async (req, res) => {
  console.log('ROUTE: /api/auth/logout hit!');
  try {
    const authenticatedUserId = req.user.id;
    await localStorageService.removeUserToken(authenticatedUserId); // Corrected call
    console.log('ROUTE: User token removed from auth/tokens.json');

    res.json({ message: 'Logout realizado com sucesso' });
    console.log('ROUTE: Response sent: Logout realizado com sucesso');
  } catch (error) {
    console.error('ROUTE: Logout error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
})

export default router