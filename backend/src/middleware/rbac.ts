import { Elysia, t } from 'elysia'
import type { AuthContext } from '../types/domain'
import { redisCache } from '../db/connection'

declare global {
  namespace Elysia {
    interface Models {
      auth: AuthContext
    }
  }
}

/**
 * RBAC Middleware
 * Checks permissions for API routes based on JWT claims cached in DragonflyDB
 */
export const rbacPlugin = new Elysia({ name: 'rbac' }).derive(
  { as: 'scoped' },
  async ({ headers, set }) => {
    const authHeader = headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      set.status = 401
      throw new Error('Missing or invalid authorization header')
    }

    const token = authHeader.slice(7)

    // Check token cache in DragonflyDB
    const cachedAuth = await redisCache.get(`auth:${token}`)
    if (!cachedAuth) {
      set.status = 401
      throw new Error('Token expired or invalid')
    }

    const auth = JSON.parse(cachedAuth) as AuthContext
    return { auth }
  }
)

/**
 * Permission Checker: Scoped middleware to enforce granular permissions
 * Example: requirePermission('read:own_time') checks if user has that permission
 */
export function requirePermission(requiredPermission: string) {
  return new Elysia({ name: `permission-${requiredPermission}` })
    .guard(
      {
        as: 'scoped',
      },
      (app) =>
        app.derive(({ auth, set }) => {
          // Check if user has the required permission
          if (!auth.permissions.includes(requiredPermission)) {
            set.status = 403
            throw new Error(
              `Forbidden: Required permission '${requiredPermission}' not granted`
            )
          }
          return {}
        })
    )
}

/**
 * Scope Resolver: For fine-grained data access (own/department/all)
 * Example: A developer can only read their own time logs
 * A manager can read their department's time logs
 * An admin can read all time logs
 */
export function resolveDataScope(
  auth: AuthContext,
  requestedScope: string // 'own_time', 'department_reports', 'all_expenses'
): 'own' | 'department' | 'all' {
  // If requesting 'all' but user doesn't have admin permission
  if (requestedScope.includes('all')) {
    if (!auth.permissions.includes('admin:*') && !auth.permissions.includes('admin:users')) {
      return 'department'
    }
    return 'all'
  }

  // If requesting 'own', always allow
  if (requestedScope.includes('own')) {
    return 'own'
  }

  // If requesting department-level access
  if (auth.permissions.includes('read:department_reports')) {
    return 'department'
  }

  return 'own'
}

/**
 * Cache auth decisions in DragonflyDB for fast permission checks
 */
export async function cacheAuthDecision(
  token: string,
  auth: AuthContext,
  ttlSeconds: number = 3600 // 1 hour default
) {
  await redisCache.setex(`auth:${token}`, ttlSeconds, JSON.stringify(auth))
}

/**
 * Invalidate auth cache on logout/role change
 */
export async function invalidateAuthCache(token: string) {
  await redisCache.del(`auth:${token}`)
}

export default rbacPlugin
