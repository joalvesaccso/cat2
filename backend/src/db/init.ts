import { Database } from 'arangojs'

const db = new Database({
  url: 'http://localhost:8529',
  databaseName: '_system',
  auth: { username: 'root', password: 'changeme' },
})

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing ArangoDB collections and indexes...')

    // Create database
    const dbName = 'timeprojectdb'
    try {
      await db.createDatabase(dbName)
      console.log(`✅ Database '${dbName}' created`)
    } catch (e) {
      console.log(`ℹ️ Database '${dbName}' already exists`)
    }

    // Switch to application database
    const appDb = db.database(dbName)

    // Create collections
    const collections = [
      'users',
      'roles',
      'permissions',
      'projects',
      'tasks',
      'time_logs',
      'expenses',
      'skills',
      'consents',
      'audit_logs',
    ]

    for (const collName of collections) {
      try {
        await appDb.createCollection(collName)
        console.log(`✅ Collection '${collName}' created`)
      } catch (e) {
        console.log(`ℹ️ Collection '${collName}' already exists`)
      }
    }

    // Create indexes
    try {
      const timeLogsCollection = appDb.collection('time_logs')
      await timeLogsCollection.ensureIndex({
        type: 'hash',
        fields: ['userId'],
      })
      await timeLogsCollection.ensureIndex({
        type: 'hash',
        fields: ['projectId'],
      })
      await timeLogsCollection.ensureIndex({
        type: 'skiplist',
        fields: ['date'],
      })
      
      const auditLogsCollection = appDb.collection('audit_logs')
      await auditLogsCollection.ensureIndex({
        type: 'hash',
        fields: ['userId'],
      })
      await auditLogsCollection.ensureIndex({
        type: 'skiplist',
        fields: ['timestamp'],
      })
      
      console.log('✅ Indexes created successfully')
    } catch (e) {
      console.log('ℹ️ Indexes already exist or error creating:', e)
    }

    // Create graph
    try {
      await appDb.graph('TimeProjectGraph').create({
        edgeDefinitions: [
          {
            collection: 'assigned_to',
            from: ['users'],
            to: ['projects'],
          },
          {
            collection: 'works_on',
            from: ['users'],
            to: ['tasks'],
          },
          {
            collection: 'has_skill',
            from: ['users'],
            to: ['skills'],
          },
          {
            collection: 'uses_skill',
            from: ['tasks'],
            to: ['skills'],
          },
          {
            collection: 'has_role',
            from: ['users'],
            to: ['roles'],
          },
          {
            collection: 'has_permission',
            from: ['roles'],
            to: ['permissions'],
          },
          {
            collection: 'gave_consent',
            from: ['users'],
            to: ['consents'],
          },
          {
            collection: 'logged_action',
            from: ['audit_logs'],
            to: ['users'],
          },
          {
            collection: 'incurs_expense',
            from: ['expenses'],
            to: ['projects'],
          },
        ],
      })
      console.log('✅ Graph "TimeProjectGraph" created')
    } catch (e) {
      console.log('ℹ️ Graph "TimeProjectGraph" already exists')
    }

    console.log('✅ Database initialization complete!')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

initializeDatabase()
