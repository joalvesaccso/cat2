import { Database } from 'arangojs'
import bcrypt from 'bcrypt'

const db = new Database({
  url: process.env.ARANGO_URL || 'http://localhost:8529',
  databaseName: process.env.ARANGO_DB || 'timeprojectdb',
  auth: {
    username: process.env.ARANGO_USER || 'root',
    password: process.env.ARANGO_PASSWORD || 'changeme',
  },
})

async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...')

    // Get database instance
    const appDb = db.database(process.env.ARANGO_DB || 'timeprojectdb')

    // Ensure edge collections exist
    const edgeCollections = ['has_role', 'has_skill']
    for (const collName of edgeCollections) {
      try {
        await appDb.createCollection(collName, { type: 3 })
        console.log(`✅ Edge collection '${collName}' created`)
      } catch (e: any) {
        console.log(`ℹ️  Edge collection '${collName}': ${e.message}`)
      }
    }

    // 1. Create Roles
    const rolesData = [
      {
        _key: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: [
          'read:own_time',
          'read:department_time',
          'read:all_time',
          'write:time_logs',
          'write:projects',
          'write:tasks',
          'write:expenses',
          'admin:users',
          'admin:reports',
          'admin:audit',
        ],
      },
      {
        _key: 'manager',
        name: 'Manager',
        description: 'Team and project management',
        permissions: [
          'read:own_time',
          'read:department_time',
          'write:time_logs',
          'write:projects',
          'write:tasks',
          'read:department_expenses',
          'admin:department',
        ],
      },
      {
        _key: 'developer',
        name: 'Developer',
        description: 'Developer access',
        permissions: [
          'read:own_time',
          'write:time_logs',
          'read:projects',
          'read:tasks',
          'write:own_expenses',
        ],
      },
      {
        _key: 'guest',
        name: 'Guest',
        description: 'Limited read-only access',
        permissions: ['read:own_time', 'read:projects'],
      },
    ]

    const rolesCol = appDb.collection('roles')
    for (const role of rolesData) {
      try {
        await rolesCol.save(role, { overwrite: true })
        console.log(`✅ Created role: ${role.name}`)
      } catch (e: any) {
        console.log(`ℹ️  Role ${role._key}: ${e.message}`)
      }
    }

    // 2. Create Sample Admin User
    const adminPassword = await bcrypt.hash('admin123', 10)
    const adminUser = {
      _key: 'admin-user',
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      type: 'admin',
      department: 'Management',
      hireDate: new Date('2020-01-15').toISOString(),
      consents: [
        {
          type: 'time_tracking',
          granted: true,
          date: new Date().toISOString(),
          version: '1.0',
        },
        {
          type: 'expense_processing',
          granted: true,
          date: new Date().toISOString(),
          version: '1.0',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const usersCol = appDb.collection('users')
    try {
      await usersCol.save(adminUser, { overwrite: true })
      console.log('✅ Created admin user: admin@example.com (password: admin123)')
    } catch (e: any) {
      console.log('ℹ️  Admin user:', e.message)
    }

    // 3. Create sample developer users
    const devUsers = [
      {
        _key: 'dev-florian',
        username: 'florian',
        email: 'florian@example.com',
        passwordHash: await bcrypt.hash('florian123', 10),
        type: 'developer',
        department: 'Engineering',
        hireDate: new Date('2021-06-01').toISOString(),
        consents: [
          {
            type: 'time_tracking',
            granted: true,
            date: new Date().toISOString(),
            version: '1.0',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _key: 'dev-alice',
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: await bcrypt.hash('alice123', 10),
        type: 'developer',
        department: 'Engineering',
        hireDate: new Date('2022-03-15').toISOString(),
        consents: [
          {
            type: 'time_tracking',
            granted: true,
            date: new Date().toISOString(),
            version: '1.0',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _key: 'manager-bob',
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: await bcrypt.hash('bob123', 10),
        type: 'manager',
        department: 'Management',
        hireDate: new Date('2019-01-10').toISOString(),
        consents: [
          {
            type: 'time_tracking',
            granted: true,
            date: new Date().toISOString(),
            version: '1.0',
          },
          {
            type: 'expense_processing',
            granted: true,
            date: new Date().toISOString(),
            version: '1.0',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    for (const user of devUsers) {
      try {
        await usersCol.save(user, { overwrite: true })
        const pwd =
          user.email === 'florian@example.com'
            ? 'florian123'
            : user.email === 'alice@example.com'
              ? 'alice123'
              : 'bob123'
        console.log(`✅ Created user: ${user.email} (password: ${pwd})`)
      } catch (e: any) {
        console.log(`ℹ️  User ${user.email}: ${e.message}`)
      }
    }

    // 4. Assign roles to users
    const hasRoleEdges = [
      { _from: 'users/admin-user', _to: 'roles/admin' },
      { _from: 'users/dev-florian', _to: 'roles/developer' },
      { _from: 'users/dev-alice', _to: 'roles/developer' },
      { _from: 'users/manager-bob', _to: 'roles/manager' },
    ]

    const hasRoleCol = appDb.collection('has_role')
    for (const edge of hasRoleEdges) {
      try {
        await hasRoleCol.save(edge, { overwrite: true })
        console.log(`✅ Assigned role: ${edge._from.split('/')[1]} -> ${edge._to.split('/')[1]}`)
      } catch (e: any) {
        console.log(`ℹ️  Role assignment: ${e.message}`)
      }
    }

    // 5. Create sample projects
    const projectsData = [
      {
        _key: 'proj-api',
        name: 'API Backend Refactor',
        description: 'Refactoring legacy API to modern standards',
        startDate: new Date('2025-12-01').toISOString(),
        endDate: new Date('2026-03-31').toISOString(),
        status: 'active',
        budget: 50000,
        client: 'Internal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _key: 'proj-frontend',
        name: 'Frontend Dashboard',
        description: 'New analytics dashboard for reporting',
        startDate: new Date('2025-11-15').toISOString(),
        endDate: new Date('2026-02-28').toISOString(),
        status: 'active',
        budget: 35000,
        client: 'TechCorp AG',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const projectsCol = appDb.collection('projects')
    for (const proj of projectsData) {
      try {
        await projectsCol.save(proj, { overwrite: true })
        console.log(`✅ Created project: ${proj.name}`)
      } catch (e: any) {
        console.log(`ℹ️  Project: ${e.message}`)
      }
    }

    // 6. Create sample tasks
    const tasksData = [
      {
        _key: 'task-auth',
        name: 'Implement JWT Authentication',
        description: 'Add JWT-based auth to API',
        priority: 'high',
        dueDate: new Date('2026-01-30').toISOString(),
        estimatedDuration: 16,
        status: 'in_progress',
        billable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _key: 'task-db',
        name: 'Database Optimization',
        description: 'Add indexes and optimize queries',
        priority: 'medium',
        dueDate: new Date('2026-02-15').toISOString(),
        estimatedDuration: 24,
        status: 'todo',
        billable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _key: 'task-ui',
        name: 'Dashboard UI Components',
        description: 'Build reusable SolidJS components',
        priority: 'high',
        dueDate: new Date('2026-02-01').toISOString(),
        estimatedDuration: 32,
        status: 'in_progress',
        billable: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    const tasksCol = appDb.collection('tasks')
    for (const task of tasksData) {
      try {
        await tasksCol.save(task, { overwrite: true })
        console.log(`✅ Created task: ${task.name}`)
      } catch (e: any) {
        console.log(`ℹ️  Task: ${e.message}`)
      }
    }

    // 7. Create sample skills
    const skillsData = [
      { _key: 'skill-typescript', name: 'TypeScript', category: 'Technical' },
      { _key: 'skill-nodejs', name: 'Node.js', category: 'Technical' },
      { _key: 'skill-solidjs', name: 'SolidJS', category: 'Technical' },
      { _key: 'skill-arangodb', name: 'ArangoDB', category: 'Technical' },
      { _key: 'skill-project-mgmt', name: 'Project Management', category: 'Soft Skill' },
    ]

    const skillsCol = appDb.collection('skills')
    for (const skill of skillsData) {
      try {
        await skillsCol.save(skill, { overwrite: true })
        console.log(`✅ Created skill: ${skill.name}`)
      } catch (e: any) {
        console.log(`ℹ️  Skill: ${e.message}`)
      }
    }

    // 8. Assign skills to users
    const userSkillEdges = [
      {
        _from: 'users/dev-florian',
        _to: 'skills/skill-typescript',
        proficiency: 'expert',
        acquiredDate: new Date('2020-01-01').toISOString(),
      },
      {
        _from: 'users/dev-florian',
        _to: 'skills/skill-nodejs',
        proficiency: 'expert',
        acquiredDate: new Date('2020-06-01').toISOString(),
      },
      {
        _from: 'users/dev-alice',
        _to: 'skills/skill-solidjs',
        proficiency: 'intermediate',
        acquiredDate: new Date('2022-01-01').toISOString(),
      },
      {
        _from: 'users/dev-alice',
        _to: 'skills/skill-typescript',
        proficiency: 'intermediate',
        acquiredDate: new Date('2021-09-01').toISOString(),
      },
      {
        _from: 'users/manager-bob',
        _to: 'skills/skill-project-mgmt',
        proficiency: 'expert',
        acquiredDate: new Date('2015-01-01').toISOString(),
      },
    ]

    const hasSkillCol = appDb.collection('has_skill')
    for (const edge of userSkillEdges) {
      try {
        await hasSkillCol.save(edge, { overwrite: true })
        console.log(`✅ Assigned skill: ${edge._from.split('/')[1]} -> ${edge._to.split('/')[1]}`)
      } catch (e: any) {
        console.log(`ℹ️  Skill: ${e.message}`)
      }
    }

    console.log('\n✅ Database seeding complete!\n')
    console.log('📋 Sample Login Credentials:')
    console.log('═══════════════════════════════════════════')
    console.log('  👤 Admin:')
    console.log('     Email: admin@example.com')
    console.log('     Password: admin123')
    console.log()
    console.log('  👤 Developer 1:')
    console.log('     Email: florian@example.com')
    console.log('     Password: florian123')
    console.log()
    console.log('  👤 Developer 2:')
    console.log('     Email: alice@example.com')
    console.log('     Password: alice123')
    console.log()
    console.log('  👤 Manager:')
    console.log('     Email: bob@example.com')
    console.log('     Password: bob123')
    console.log('═══════════════════════════════════════════\n')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

seedDatabase()
