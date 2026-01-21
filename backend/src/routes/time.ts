import { Elysia, t } from 'elysia'
import { db, redisCache } from '../db/connection'
import { rbacPlugin, requirePermission } from '../middleware/rbac'
import type { TimeLog } from '../types/domain'

export const timeRoutes = new Elysia({ prefix: '/api/time', name: 'time-routes' })
  .use(rbacPlugin)

  /**
   * GET /api/time/logs - Get user's time logs
   * Scoped: own/department/all based on permissions
   */
  .get(
    '/logs',
    async ({ auth, query: { projectId, startDate, endDate, page = '1', limit = '20' } }) => {
      const pageNum = parseInt(page)
      const pageSize = parseInt(limit)
      const offset = (pageNum - 1) * pageSize

      try {
        // Determine scope based on permissions
        let userFilter = `u._key == @userId`
        const params: Record<string, any> = { userId: auth.userId }

        if (auth.permissions.includes('read:department_reports')) {
          userFilter = `u.department == @dept`
          params.dept = auth.department
        }

        if (auth.permissions.includes('admin:*')) {
          // Admin can see all
          delete params.userId
          delete params.dept
          userFilter = 'true'
        }

        // Build AQL query
        let aqlFilter = `FOR tl IN time_logs FILTER ${userFilter}`

        if (projectId) {
          aqlFilter += ` && tl.projectId == @projectId`
          params.projectId = projectId
        }

        if (startDate) {
          aqlFilter += ` && tl.startTime >= @startDate`
          params.startDate = startDate
        }

        if (endDate) {
          aqlFilter += ` && tl.startTime <= @endDate`
          params.endDate = endDate
        }

        const countQuery = `${aqlFilter} RETURN LENGTH(tl)`
        const cursor = await db.users().collection.db.query(countQuery, params)
        const total = (await cursor.all())[0] || 0

        const dataQuery = `${aqlFilter} SORT tl.startTime DESC LIMIT @offset, @limit RETURN tl`
        params.offset = offset
        params.limit = pageSize

        const dataCursor = await db.users().collection.db.query(dataQuery, params)
        const data = await dataCursor.all()

        return {
          success: true,
          data,
          pagination: {
            page: pageNum,
            pageSize,
            total,
            hasMore: offset + pageSize < total,
          },
        }
      } catch (error) {
        console.error('Error fetching time logs:', error)
        return {
          success: false,
          error: 'Failed to fetch time logs',
          status: 500,
        }
      }
    },
    {
      query: t.Object({
        projectId: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  /**
   * POST /api/time/logs - Create a new time log
   */
  .post(
    '/logs',
    async ({ auth, body, set }) => {
      // Check consent
      const usersColl = db.users()
      const cursor = await usersColl.query('FOR u IN users FILTER u._key == @id RETURN u', {
        id: auth.userId,
      })
      const user = (await cursor.all())[0] as any

      const hasTimeTrackingConsent = user.consents?.some(
        (c: any) => c.type === 'time_tracking' && c.granted
      )

      if (!hasTimeTrackingConsent) {
        set.status = 403
        return {
          error: 'User consent required for time tracking',
          status: 403,
        }
      }

      try {
        const timeLog: TimeLog = {
          _key: crypto.randomUUID(),
          userId: auth.userId,
          projectId: body.projectId,
          taskId: body.taskId,
          description: body.description,
          startTime: body.startTime,
          endTime: body.endTime,
          duration: body.duration,
          type: body.type,
          billable: body.billable,
          tags: body.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await db.timeLogs().save(timeLog)

        // Invalidate cache for user's aggregates
        await redisCache.del(`user:${auth.userId}:time_summary`)

        // Log audit
        await db.auditLogs().save({
          _key: crypto.randomUUID(),
          userId: auth.userId,
          action: 'create_time_log',
          resourceId: timeLog._key,
          timestamp: new Date().toISOString(),
          success: true,
        })

        return { success: true, data: timeLog, status: 201 }
      } catch (error) {
        console.error('Error creating time log:', error)
        set.status = 500
        return { error: 'Failed to create time log', status: 500 }
      }
    },
    {
      body: t.Object({
        projectId: t.String(),
        taskId: t.Optional(t.String()),
        description: t.String(),
        startTime: t.String(),
        endTime: t.Optional(t.String()),
        duration: t.Number(),
        type: t.Enum({
          work: 'work',
          travel: 'travel',
          holiday: 'holiday',
          sick: 'sick',
        }),
        billable: t.Boolean(),
        tags: t.Optional(t.Array(t.String())),
      }),
    }
  )

  /**
   * PATCH /api/time/logs/:logId - Update a time log
   */
  .patch(
    '/logs/:logId',
    async ({ auth, params: { logId }, body, set }) => {
      try {
        const timeLogs = db.timeLogs()
        const cursor = await timeLogs.query('FOR tl IN time_logs FILTER tl._key == @id RETURN tl', {
          id: logId,
        })
        const timeLog = (await cursor.all())[0] as TimeLog

        if (!timeLog) {
          set.status = 404
          return { error: 'Time log not found', status: 404 }
        }

        // Check ownership (unless admin/manager)
        if (
          timeLog.userId !== auth.userId &&
          !auth.permissions.includes('admin:*') &&
          !auth.permissions.includes('write:other_time')
        ) {
          set.status = 403
          return { error: 'Forbidden', status: 403 }
        }

        const updated = {
          ...timeLog,
          ...body,
          updatedAt: new Date().toISOString(),
        }

        await timeLogs.update(logId, updated)

        // Invalidate cache
        await redisCache.del(`user:${timeLog.userId}:time_summary`)

        return { success: true, data: updated }
      } catch (error) {
        console.error('Error updating time log:', error)
        set.status = 500
        return { error: 'Failed to update time log', status: 500 }
      }
    },
    {
      body: t.Partial(
        t.Object({
          description: t.String(),
          endTime: t.String(),
          duration: t.Number(),
          billable: t.Boolean(),
          tags: t.Array(t.String()),
        })
      ),
    }
  )

  /**
   * DELETE /api/time/logs/:logId - Delete a time log
   */
  .delete('/logs/:logId', async ({ auth, params: { logId }, set }) => {
    try {
      const timeLogs = db.timeLogs()
      const cursor = await timeLogs.query('FOR tl IN time_logs FILTER tl._key == @id RETURN tl', {
        id: logId,
      })
      const timeLog = (await cursor.all())[0] as TimeLog

      if (!timeLog) {
        set.status = 404
        return { error: 'Time log not found', status: 404 }
      }

      if (
        timeLog.userId !== auth.userId &&
        !auth.permissions.includes('admin:*')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      await timeLogs.remove(logId)

      // Invalidate cache
      await redisCache.del(`user:${timeLog.userId}:time_summary`)

      // Log audit
      await db.auditLogs().save({
        _key: crypto.randomUUID(),
        userId: auth.userId,
        action: 'delete_time_log',
        resourceId: logId,
        timestamp: new Date().toISOString(),
        success: true,
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting time log:', error)
      set.status = 500
      return { error: 'Failed to delete time log', status: 500 }
    }
  })

  /**
   * GET /api/time/summary - Get time summary (cached)
   */
  .get('/summary', async ({ auth, query: { startDate, endDate } }) => {
    const cacheKey = `user:${auth.userId}:time_summary:${startDate}:${endDate}`

    try {
      // Try cache first
      const cached = await redisCache.get(cacheKey)
      if (cached) {
        return { success: true, data: JSON.parse(cached), fromCache: true }
      }

      // Calculate from time logs
      const query = `
        FOR tl IN time_logs
          FILTER tl.userId == @userId
          && tl.startTime >= @startDate
          && tl.startTime <= @endDate
          COLLECT type = tl.type INTO groups
          RETURN {
            type: type,
            totalMinutes: SUM(groups[*].tl.duration),
            count: COUNT(groups),
            billableMinutes: SUM(
              FOR g IN groups
                FILTER g.tl.billable
                RETURN g.tl.duration
            )
          }
      `

      const cursor = await db.users().collection.db.query(query, {
        userId: auth.userId,
        startDate,
        endDate,
      })
      const summary = await cursor.all()

      // Cache for 1 hour
      await redisCache.setex(cacheKey, 3600, JSON.stringify(summary))

      return { success: true, data: summary }
    } catch (error) {
      console.error('Error fetching time summary:', error)
      return { error: 'Failed to fetch summary', status: 500 }
    }
  })

export default timeRoutes
