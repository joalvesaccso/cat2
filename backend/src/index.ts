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

  // Token refresh endpoint
  .post('/auth/refresh', async ({ body }) => {
    try {
      const { token } = body as { token: string }

      if (!token) {
        return {
          success: false,
          error: 'Token is required',
          status: 400,
        }
      }

      // Decode token
      const decodedToken = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))

      // Get user from database
      const appDb = db.database('timeprojectdb')
      const query = `FOR u IN users FILTER u._key == @userId RETURN u`
      const cursor = await appDb.query(query, { userId: decodedToken.sub })
      const users = await cursor.all()

      if (users.length === 0) {
        return {
          success: false,
          error: 'User not found',
          status: 401,
        }
      }

      const user = users[0] as any

      // Generate new token
      const newToken = Buffer.from(
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
        token: newToken,
        user: {
          id: user._key,
          email: user.email,
          username: user.username,
          type: user.type,
          department: user.department,
        },
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      return {
        success: false,
        error: 'Token refresh failed',
        status: 401,
      }
    }
  })

  // Get all projects for the authenticated user
  .get('/api/projects', async ({ headers }) => {
    try {
      const appDb = db.database('timeprojectdb')

      // Get all projects (in real app, would filter by user)
      const query = `FOR p IN projects RETURN {
        id: p._key,
        name: p.name,
        description: p.description,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        createdAt: p.createdAt
      }`

      const cursor = await appDb.query(query)
      const projects = await cursor.all()

      return {
        success: true,
        data: projects,
      }
    } catch (error) {
      console.error('Get projects error:', error)
      return {
        success: false,
        error: 'Failed to fetch projects',
        status: 500,
      }
    }
  })

  // Get tasks for a specific project
  .get('/api/tasks/:projectId', async ({ params }) => {
    try {
      const appDb = db.database('timeprojectdb')
      const { projectId } = params as { projectId: string }

      // Get tasks for the project
      const query = `FOR t IN tasks 
        FILTER t.projectId == @projectId
        RETURN {
          id: t._key,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          assignedTo: t.assignedTo,
          dueDate: t.dueDate,
          createdAt: t.createdAt,
          projectId: t.projectId
        }`

      const cursor = await appDb.query(query, { projectId })
      const tasks = await cursor.all()

      return {
        success: true,
        data: tasks,
      }
    } catch (error) {
      console.error('Get tasks error:', error)
      return {
        success: false,
        error: 'Failed to fetch tasks',
        status: 500,
      }
    }
  })

  // Create a new time log entry
  .post('/api/time/logs', async ({ body }) => {
    try {
      const appDb = db.database('timeprojectdb')
      const { projectId, taskId, hours, minutes, description } = body as {
        projectId: string
        taskId?: string
        hours: number
        minutes: number
        description?: string
      }

      if (!projectId || hours === undefined || minutes === undefined) {
        return {
          success: false,
          error: 'projectId, hours, and minutes are required',
          status: 400,
        }
      }

      const timeLogsCollection = appDb.collection('time_logs')

      // Create time log document
      const timeLog = {
        projectId,
        taskId,
        hours,
        minutes,
        description: description || '',
        totalSeconds: hours * 3600 + minutes * 60,
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
      }

      const result = await timeLogsCollection.save(timeLog)

      return {
        success: true,
        data: {
          id: result._key,
          ...timeLog,
        },
      }
    } catch (error) {
      console.error('Create time log error:', error)
      return {
        success: false,
        error: 'Failed to create time log',
        status: 500,
      }
    }
  })

  // Get time logs for user
  .get('/api/time/logs', async ({ query }) => {
    try {
      const appDb = db.database('timeprojectdb')
      const { projectId } = query as { projectId?: string }

      let queryStr = `FOR tl IN time_logs`

      if (projectId) {
        queryStr += ` FILTER tl.projectId == @projectId`
      }

      queryStr += ` RETURN {
        id: tl._key,
        projectId: tl.projectId,
        taskId: tl.taskId,
        hours: tl.hours,
        minutes: tl.minutes,
        totalSeconds: tl.totalSeconds,
        description: tl.description,
        date: tl.date,
        createdAt: tl.createdAt
      }`

      const cursor = await appDb.query(queryStr, projectId ? { projectId } : {})
      const timeLogs = await cursor.all()

      return {
        success: true,
        data: timeLogs,
      }
    } catch (error) {
      console.error('Get time logs error:', error)
      return {
        success: false,
        error: 'Failed to fetch time logs',
        status: 500,
      }
    }
  })

  // Update task status
  .patch('/api/tasks/:id', async ({ params, body }) => {
    try {
      const appDb = db.database('timeprojectdb')
      const { id } = params as { id: string }
      const { status } = body as { status: string }

      if (!status) {
        return {
          success: false,
          error: 'status is required',
          status: 400,
        }
      }

      const tasksCollection = appDb.collection('tasks')

      // Update task
      await tasksCollection.update(id, {
        status,
        updatedAt: new Date().toISOString(),
      })

      // Fetch updated task
      const query = `FOR t IN tasks FILTER t._key == @id RETURN {
        id: t._key,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo,
        dueDate: t.dueDate,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
        projectId: t.projectId
      }`

      const cursor = await appDb.query(query, { id })
      const tasks = await cursor.all()

      return {
        success: true,
        data: tasks[0],
      }
    } catch (error) {
      console.error('Update task error:', error)
      return {
        success: false,
        error: 'Failed to update task',
        status: 500,
      }
    }
  })

  // Analytics: Get project statistics
  .get('/api/analytics/projects', async ({ headers }) => {
    try {
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        return { success: false, error: 'Unauthorized', status: 401 }
      }

      const appDb = db.database('timeprojectdb')
      const projectsCollection = appDb.collection('projects')
      const tasksCollection = appDb.collection('tasks')
      const timeLogsCollection = appDb.collection('time_logs')

      // Get all projects
      const projectsCursor = await appDb.query(
        'FOR p IN projects RETURN { id: p._key, name: p.name, status: p.status, createdAt: p.createdAt }'
      )
      const projects = await projectsCursor.all()

      // Get stats for each project
      const projectStats = await Promise.all(
        projects.map(async (p: any) => {
          // Count tasks by status
          const tasksCursor = await appDb.query(
            `FOR t IN tasks FILTER t.projectId == @projectId 
             COLLECT status = t.status WITH COUNT INTO cnt 
             RETURN { status, count: cnt }`,
            { projectId: p.id }
          )
          const tasksByStatus = await tasksCursor.all()

          // Sum time logs for project
          const timeCursor = await appDb.query(
            `FOR t IN time_logs FILTER t.projectId == @projectId 
             RETURN SUM(t.duration)`,
            { projectId: p.id }
          )
          const timeResult = await timeCursor.all()
          const totalTime = timeResult[0] || 0

          return {
            id: p.id,
            name: p.name,
            status: p.status,
            createdAt: p.createdAt,
            tasksByStatus: Object.fromEntries(
              tasksByStatus.map((s: any) => [s.status, s.count])
            ),
            totalTimeLogged: totalTime,
            totalHours: Math.round((totalTime / 3600) * 100) / 100,
          }
        })
      )

      return { success: true, data: projectStats }
    } catch (error) {
      console.error('Analytics projects error:', error)
      return { success: false, error: 'Failed to fetch analytics', status: 500 }
    }
  })

  // Analytics: Get time tracking summary
  .get('/api/analytics/time', async ({ headers, query }) => {
    try {
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        return { success: false, error: 'Unauthorized', status: 401 }
      }

      const appDb = db.database('timeprojectdb')
      const { projectId, period = '7' } = query as {
        projectId?: string
        period?: string
      }

      const daysBack = parseInt(period) || 7
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysBack)

      // Get time logs for period
      const query_str = projectId
        ? `FOR t IN time_logs 
           FILTER t.projectId == @projectId AND t.createdAt >= @startDate 
           RETURN { date: DATE_FORMAT(t.createdAt, '%Y-%m-%d'), duration: t.duration, activity: t.activity }`
        : `FOR t IN time_logs 
           FILTER t.createdAt >= @startDate 
           RETURN { date: DATE_FORMAT(t.createdAt, '%Y-%m-%d'), duration: t.duration, activity: t.activity }`

      const cursor = await appDb.query(query_str, {
        projectId,
        startDate: startDate.toISOString(),
      })
      const logs = await cursor.all()

      // Group by date and activity
      const byDate: Record<string, number> = {}
      const byActivity: Record<string, number> = {}

      logs.forEach((log: any) => {
        byDate[log.date] = (byDate[log.date] || 0) + log.duration
        byActivity[log.activity] = (byActivity[log.activity] || 0) + log.duration
      })

      const totalDuration = Object.values(byDate).reduce((a: number, b: number) => a + b, 0)

      return {
        success: true,
        data: {
          period: daysBack,
          totalSeconds: totalDuration,
          totalHours: Math.round((totalDuration / 3600) * 100) / 100,
          averagePerDay: Math.round((totalDuration / daysBack / 3600) * 100) / 100,
          byDate,
          byActivity: Object.fromEntries(
            Object.entries(byActivity)
              .map(([activity, duration]: [string, any]) => [
                activity,
                Math.round((duration / 3600) * 100) / 100,
              ])
              .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
          ),
        },
      }
    } catch (error) {
      console.error('Analytics time error:', error)
      return { success: false, error: 'Failed to fetch time analytics', status: 500 }
    }
  })

  // Analytics: Get task completion metrics
  .get('/api/analytics/tasks', async ({ headers, query }) => {
    try {
      const token = headers.authorization?.replace('Bearer ', '')
      if (!token) {
        return { success: false, error: 'Unauthorized', status: 401 }
      }

      const appDb = db.database('timeprojectdb')
      const { projectId } = query as { projectId?: string }

      const query_str = projectId
        ? `FOR t IN tasks FILTER t.projectId == @projectId 
           COLLECT status = t.status, priority = t.priority WITH COUNT INTO cnt 
           RETURN { status, priority, count: cnt }`
        : `FOR t IN tasks 
           COLLECT status = t.status, priority = t.priority WITH COUNT INTO cnt 
           RETURN { status, priority, count: cnt }`

      const cursor = await appDb.query(query_str, { projectId })
      const taskStats = await cursor.all()

      // Get total and completion rate
      const totalQuery = projectId
        ? `FOR t IN tasks FILTER t.projectId == @projectId RETURN COUNT(t)`
        : `FOR t IN tasks RETURN COUNT(t)`

      const totalCursor = await appDb.query(totalQuery, { projectId })
      const [totalTasks] = await totalCursor.all()

      const completedTasks = taskStats
        .filter((s: any) => s.status === 'done')
        .reduce((sum: number, s: any) => sum + s.count, 0)

      return {
        success: true,
        data: {
          total: totalTasks,
          completed: completedTasks,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          byStatus: Object.fromEntries(
            taskStats
              .filter((s: any) => s.priority === null) // Get only status grouping
              .map((s: any) => [s.status, s.count])
          ),
          byPriority: Object.fromEntries(
            taskStats
              .filter((s: any) => s.status === null) // Get only priority grouping
              .map((s: any) => [s.priority, s.count])
          ),
          details: taskStats,
        },
      }
    } catch (error) {
      console.error('Analytics tasks error:', error)
      return { success: false, error: 'Failed to fetch task analytics', status: 500 }
    }
  })

  .listen(3000)

console.log(`🦊 Backend running at http://localhost:3000`)
