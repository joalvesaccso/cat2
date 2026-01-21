import { Elysia, t } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { cookie } from '@elysiajs/cookie'
import type { AuthContext, JWTPayload, User } from '../types/domain'
import { db } from '../db/connection'
import { cacheAuthDecision } from './rbac'
import bcrypt from 'bcrypt'

/**
 * Mock Microsoft Entra ID integration for development
 * In production: Use @azure/msal-node or openid-client for real OAuth2/OIDC
 */

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const ENTRA_ID_TENANT = process.env.ENTRA_ID_TENANT || 'common'
const ENTRA_ID_CLIENT_ID = process.env.ENTRA_ID_CLIENT_ID || 'dev-client-id'

export const authPlugin = new Elysia({ name: 'auth' })
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
      alg: 'HS256',
      sign: {
        expiresIn: '24h',
      },
    })
  )
  .use(cookie())

  // Login endpoint (mock for dev, would use OAuth2 flow in production)
  .post(
    '/auth/login',
    async ({ body, jwt: jwtPlugin, set, cookie: cookies }) => {
      const { email, password } = body

      try {
        // Fetch user from ArangoDB
        const users = db.users()
        const cursor = await users.query('FOR u IN users FILTER u.email == @email RETURN u', {
          email,
        })
        const userList = await cursor.all()

        if (!userList.length) {
          set.status = 401
          return { error: 'Invalid email or password' }
        }

        const user = userList[0] as User
        if (!user.passwordHash) {
          set.status = 401
          return { error: 'User configured for SSO. Use Microsoft login.' }
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordMatch) {
          set.status = 401
          return { error: 'Invalid email or password' }
        }

        // Fetch user roles and permissions
        const rolesQuery = `
          FOR u IN users
            FILTER u._key == @userId
            FOR r IN 1 OUTBOUND u has_role roles
              RETURN { roleId: r._key, permissions: r.permissions }
        `
        const rolesCursor = await db.users().collection.db.query(rolesQuery, {
          userId: user._key,
        })
        const userRoles = await rolesCursor.all()

        // Build permission array
        const permissions = userRoles.flatMap((r: any) => r.permissions || [])
        const roleIds = userRoles.map((r: any) => r.roleId)

        // Create JWT payload
        const jwtPayload: JWTPayload = {
          sub: user._key,
          email: user.email,
          name: user.username,
          roles: roleIds,
          permissions,
          department: user.department,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400, // 24h
        }

        // Sign JWT
        const token = await jwtPlugin.sign(jwtPayload)

        // Build AuthContext
        const authContext: AuthContext = {
          userId: user._key,
          username: user.username,
          email: user.email,
          roles: roleIds,
          permissions,
          department: user.department,
          isAuthenticated: true,
        }

        // Cache in DragonflyDB for fast permission checks
        await cacheAuthDecision(token, authContext)

        // Update lastLogin
        await users.update(user._key, { lastLogin: new Date().toISOString() })

        // Set secure, httpOnly cookie
        cookies.jwt.value = token
        cookies.jwt.httpOnly = true
        cookies.jwt.secure = process.env.NODE_ENV === 'production'
        cookies.jwt.sameSite = 'strict'
        cookies.jwt.maxAge = 86400

        return {
          success: true,
          data: {
            token,
            user: {
              id: user._key,
              email: user.email,
              username: user.username,
              department: user.department,
              roles: roleIds,
            },
          },
        }
      } catch (error) {
        console.error('Login error:', error)
        set.status = 500
        return { error: 'Internal server error' }
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
      }),
    }
  )

  // OAuth2 callback (mock)
  .get(
    '/auth/callback',
    async ({ query: { code, state }, set }) => {
      /**
       * In production:
       * 1. Exchange 'code' for access token via Entra ID token endpoint
       * 2. Fetch user info from Entra ID
       * 3. Create/update user in ArangoDB
       * 4. Issue JWT
       * 5. Redirect to frontend with token
       *
       * For now, return mock response
       */
      return {
        message: 'OAuth2 callback - implement Entra ID token exchange in production',
        code,
        state,
      }
    },
    {
      query: t.Object({
        code: t.String(),
        state: t.String(),
      }),
    }
  )

  // Logout endpoint
  .post('/auth/logout', async ({ cookie: cookies, headers }) => {
    const authHeader = headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      // Invalidate token in cache (optional: add to blacklist in production)
    }

    cookies.jwt.value = ''
    cookies.jwt.maxAge = 0

    return { success: true, message: 'Logged out' }
  })

  // Get current user
  .get(
    '/auth/me',
    async ({ headers }) => {
      const authHeader = headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return { error: 'Not authenticated', status: 401 }
      }

      const token = authHeader.slice(7)
      // In production, verify JWT signature and expiry
      // For now, assume token is valid (cached in rbac middleware)
      return { message: 'Current user endpoint', token }
    }
  )

  // Get or create user (mock SSO integration)
  .post(
    '/auth/sso-user',
    async ({ body }) => {
      const { email, displayName, tenantId, objectId } = body

      const usersCollection = db.users()

      // Check if user exists
      const cursor = await usersCollection.query(
        'FOR u IN users FILTER u.email == @email RETURN u',
        { email }
      )
      const existing = await cursor.all()

      if (existing.length) {
        return { user: existing[0], isNew: false }
      }

      // Create new user (auto-provisioning)
      const newUser: User = {
        _key: objectId,
        username: displayName,
        email,
        type: 'employee', // Default role; admin assigns roles later
        department: 'Unassigned',
        consents: [
          { type: 'time_tracking', granted: false, date: new Date().toISOString(), version: '1.0' },
          {
            type: 'expense_processing',
            granted: false,
            date: new Date().toISOString(),
            version: '1.0',
          },
          {
            type: 'analytics',
            granted: false,
            date: new Date().toISOString(),
            version: '1.0',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await usersCollection.save(newUser)

      // Log SSO provisioning
      const auditLog = {
        userId: objectId,
        action: 'user_sso_provisioning',
        resourceId: objectId,
        timestamp: new Date().toISOString(),
        success: true,
        details: `User auto-provisioned via SSO: ${email}`,
      }
      await db.auditLogs().save(auditLog)

      return { user: newUser, isNew: true }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        displayName: t.String(),
        tenantId: t.String(),
        objectId: t.String(),
      }),
    }
  )

export default authPlugin
