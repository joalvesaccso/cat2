import { Elysia, t } from 'elysia'
import { db, redisCache } from '../db/connection'
import { rbacPlugin } from '../middleware/rbac'
import type { Task } from '../types/domain'

export const taskRoutes = new Elysia({ prefix: '/api/tasks', name: 'task-routes' })
  .use(rbacPlugin)

  /**
   * GET /api/tasks - List tasks
   * Filtered by project, status, assignee, etc.
   */
  .get(
    '/',
    async ({ auth, query: { projectId, status, assigneeId, page = '1', limit = '20' } }) => {
      const pageNum = parseInt(page)
      const pageSize = parseInt(limit)
      const offset = (pageNum - 1) * pageSize

      try {
        let aqlFilter = `FOR t IN tasks`

        const params: Record<string, any> = {}

        if (projectId) {
          aqlFilter += ` FILTER t.projectId == @projectId`
          params.projectId = projectId
        }

        if (status) {
          aqlFilter += ` FILTER t.status == @status`
          params.status = status
        }

        if (assigneeId) {
          aqlFilter += ` FILTER t.assigneeId == @assigneeId`
          params.assigneeId = assigneeId
        }

        // Non-admin: only show tasks from projects they're assigned to
        if (!auth.permissions.includes('admin:*')) {
          aqlFilter += `
            LET userProjects = (
              FOR p IN 1 OUTBOUND @userId assigned_to
                RETURN p._key
            )
            FILTER t.projectId IN userProjects
          `
          params.userId = auth.userId
        }

        const countQuery = `${aqlFilter} RETURN COUNT(t)`
        const countCursor = await db.users().collection.db.query(countQuery, params)
        const total = (await countCursor.all())[0] || 0

        const dataQuery = `${aqlFilter} SORT t.priority DESC, t.dueDate ASC LIMIT @offset, @limit RETURN t`
        params.offset = offset
        params.limit = pageSize

        const dataCursor = await db.users().collection.db.query(dataQuery, params)
        const tasks = await dataCursor.all()

        return {
          success: true,
          data: tasks,
          pagination: {
            page: pageNum,
            pageSize,
            total,
            hasMore: offset + pageSize < total,
          },
        }
      } catch (error) {
        console.error('Error fetching tasks:', error)
        return { error: 'Failed to fetch tasks', status: 500 }
      }
    },
    {
      query: t.Object({
        projectId: t.Optional(t.String()),
        status: t.Optional(t.String()),
        assigneeId: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /api/tasks/:taskId - Get single task
   */
  .get('/:taskId', async ({ params: { taskId }, set }) => {
    try {
      const task = await db.tasks().document(taskId)
      return { success: true, data: task }
    } catch (error) {
      set.status = 404
      return { error: 'Task not found', status: 404 }
    }
  })

  /**
   * POST /api/tasks - Create task
   */
  .post(
    '/',
    async ({ auth, body, set }) => {
      // Check project write permission
      if (
        !auth.permissions.includes('write:project_tasks') &&
        !auth.permissions.includes('admin:*')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      try {
        const task: Task = {
          _key: crypto.randomUUID(),
          projectId: body.projectId,
          name: body.name,
          description: body.description,
          priority: body.priority,
          dueDate: body.dueDate,
          estimatedDuration: body.estimatedDuration,
          status: 'todo',
          billable: body.billable,
          assigneeId: body.assigneeId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await db.tasks().save(task)

        // Create edge: task within project (works_on)
        if (body.assigneeId) {
          await db.users().collection.db.collection('works_on').save({
            _from: `users/${body.assigneeId}`,
            _to: `tasks/${task._key}`,
          })
        }

        // Invalidate project task cache
        await redisCache.del(`project:${body.projectId}:tasks`)

        // Audit log
        await db.auditLogs().save({
          _key: crypto.randomUUID(),
          userId: auth.userId,
          action: 'create_task',
          resourceId: task._key,
          timestamp: new Date().toISOString(),
          success: true,
        })

        return { success: true, data: task, status: 201 }
      } catch (error) {
        console.error('Error creating task:', error)
        set.status = 500
        return { error: 'Failed to create task', status: 500 }
      }
    },
    {
      body: t.Object({
        projectId: t.String(),
        name: t.String(),
        description: t.String(),
        priority: t.Enum({ low: 'low', medium: 'medium', high: 'high' }),
        dueDate: t.Optional(t.String()),
        estimatedDuration: t.Number(),
        billable: t.Boolean(),
        assigneeId: t.Optional(t.String()),
      }),
    }
  )

  /**
   * PATCH /api/tasks/:taskId - Update task
   */
  .patch(
    '/:taskId',
    async ({ auth, params: { taskId }, body, set }) => {
      try {
        const task = (await db.tasks().document(taskId)) as Task

        // Only assignee, project managers, or admins can update
        if (
          task.assigneeId !== auth.userId &&
          !auth.permissions.includes('write:project_tasks') &&
          !auth.permissions.includes('admin:*')
        ) {
          set.status = 403
          return { error: 'Forbidden', status: 403 }
        }

        const updated = {
          ...task,
          ...body,
          updatedAt: new Date().toISOString(),
        }

        await db.tasks().update(taskId, updated)

        // Invalidate cache
        await redisCache.del(`project:${task.projectId}:tasks`)

        return { success: true, data: updated }
      } catch (error) {
        console.error('Error updating task:', error)
        set.status = 500
        return { error: 'Failed to update task', status: 500 }
      }
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String(),
          description: t.String(),
          priority: t.Enum({ low: 'low', medium: 'medium', high: 'high' }),
          dueDate: t.String(),
          status: t.Enum({ todo: 'todo', in_progress: 'in_progress', review: 'review', done: 'done' }),
          billable: t.Boolean(),
          assigneeId: t.String(),
        })
      ),
    }
  )

  /**
   * DELETE /api/tasks/:taskId - Delete task
   */
  .delete('/:taskId', async ({ auth, params: { taskId }, set }) => {
    try {
      const task = (await db.tasks().document(taskId)) as Task

      // Only manager/admin can delete
      if (
        !auth.permissions.includes('write:project_tasks') &&
        !auth.permissions.includes('admin:*')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      await db.tasks().remove(taskId)

      // Invalidate cache
      await redisCache.del(`project:${task.projectId}:tasks`)

      // Audit log
      await db.auditLogs().save({
        _key: crypto.randomUUID(),
        userId: auth.userId,
        action: 'delete_task',
        resourceId: taskId,
        timestamp: new Date().toISOString(),
        success: true,
      })

      return { success: true }
    } catch (error) {
      console.error('Error deleting task:', error)
      set.status = 500
      return { error: 'Failed to delete task', status: 500 }
    }
  })

  /**
   * POST /api/tasks/:taskId/focus-session - Start focus/pomodoro session
   */
  .post(
    '/:taskId/focus-session',
    async ({ auth, params: { taskId }, body, set }) => {
      try {
        const focusSession = {
          _key: crypto.randomUUID(),
          userId: auth.userId,
          taskId,
          type: body.type, // 'pomodoro' | 'focus'
          duration: body.duration || 25, // minutes
          breakDuration: body.breakDuration || 5,
          isActive: true,
          startedAt: new Date().toISOString(),
        }

        // Save in cache for real-time tracking
        await redisCache.setex(
          `focus:${focusSession._key}`,
          focusSession.duration * 60, // TTL in seconds
          JSON.stringify(focusSession)
        )

        return { success: true, data: focusSession, status: 201 }
      } catch (error) {
        console.error('Error starting focus session:', error)
        set.status = 500
        return { error: 'Failed to start focus session', status: 500 }
      }
    },
    {
      body: t.Object({
        type: t.Enum({ pomodoro: 'pomodoro', focus: 'focus' }),
        duration: t.Optional(t.Number()),
        breakDuration: t.Optional(t.Number()),
      }),
    }
  )

export default taskRoutes
