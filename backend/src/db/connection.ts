import { Database } from 'arangojs'
import Redis from 'ioredis'

// ArangoDB connection
export const arangoDb = new Database({
  url: process.env.ARANGO_URL || 'http://localhost:8529',
  databaseName: process.env.ARANGO_DB || 'timeprojectdb',
  auth: {
    username: process.env.ARANGO_USER || 'root',
    password: process.env.ARANGO_PASSWORD || 'changeme',
  },
})

// DragonflyDB (Redis-compatible) connection
export const redisCache = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'changeme',
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000),
})

redisCache.on('connect', () => {
  console.log('✅ Connected to DragonflyDB (Redis)')
})

redisCache.on('error', (err) => {
  console.error('❌ DragonflyDB error:', err)
})

// Test ArangoDB connection
arangoDb
  .get()
  .then(() => {
    console.log('✅ Connected to ArangoDB')
  })
  .catch((err) => {
    console.error('❌ ArangoDB error:', err)
  })

export const db = {
  users: () => arangoDb.collection('users'),
  roles: () => arangoDb.collection('roles'),
  permissions: () => arangoDb.collection('permissions'),
  projects: () => arangoDb.collection('projects'),
  tasks: () => arangoDb.collection('tasks'),
  timeLogs: () => arangoDb.collection('time_logs'),
  expenses: () => arangoDb.collection('expenses'),
  skills: () => arangoDb.collection('skills'),
  consents: () => arangoDb.collection('consents'),
  auditLogs: () => arangoDb.collection('audit_logs'),
}
