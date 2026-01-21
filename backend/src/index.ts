import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { Database } from 'arangojs'
import bcrypt from 'bcrypt'

// Database connection
const db = new Database({
  url: process.env.ARANGO_URL || 'http://localhost:8529',
  databaseName: process.env.ARANGO_DB || 'timeprojectdb',
  auth: {
    username: process.env.ARANGO_USER || 'root',
    password: process.env.ARANGO_PASSWORD || 'changeme',
  },
})

const app = new Elysia()
  .use(
    cors({
      origin: '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  )

  // Root endpoint
  .get('/', () => ({
    name: 'Time & Project Management API - Backend',
    version: '1.0.0',
    status: 'running',
    environment: 'backend',
    endpoints: {
      health: '/health',
      api_test: '/api/test',
      login: '/auth/login (POST)',
    },
  }))

  // Health check (public)
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // Test endpoint (public)
  .get('/api/test', () => ({
    message: 'Backend API is working!',
    containers: {
      arangodb: 'http://localhost:8529',
      dragonfly: 'http://localhost:6379',
    },
  }))

  // Login endpoint with database integration
  .post('/auth/login', async ({ body }) => {
    try {
      const appDb = db.database('timeprojectdb')
      const { email, password } = body as { email: string; password: string }

      if (!email || !password) {
        return {
          error: 'Email and password are required',
          status: 400,
        }
      }

      // Find user by email
      const query = `FOR u IN users FILTER u.email == @email RETURN u`
      const cursor = await appDb.query(query, { email })
      const users = await cursor.all()

      if (users.length === 0) {
        return {
          error: 'User not found',
          status: 401,
        }
      }

      const user = users[0] as any

      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.passwordHash)

      if (!passwordMatch) {
        return {
          error: 'Invalid password',
          status: 401,
        }
      }

      // Generate simple JWT-like token
      const token = Buffer.from(
        JSON.stringify({
          sub: user._key,
          email: user.email,
          username: user.username,
          type: user.type,
          iat: Date.now(),
          exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        })
      ).toString('base64')

      return {
        success: true,
        token,
        user: {
          id: user._key,
          email: user.email,
          username: user.username,
          type: user.type,
          department: user.department,
        },
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        error: 'Internal server error',
        status: 500,
      }
    }
  })

  .listen(3000)

console.log(`🦊 Backend running at http://localhost:3000`)
