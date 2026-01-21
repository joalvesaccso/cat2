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

  .listen(3000)

console.log(`🦊 Backend running at http://localhost:3000`)
