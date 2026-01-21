import { Elysia, t } from 'elysia'
import { db, redisCache } from '../db/connection'
import { rbacPlugin } from '../middleware/rbac'
import type { Project } from '../types/domain'

export const projectRoutes = new Elysia({ prefix: '/api/projects', name: 'project-routes' })
  .use(rbacPlugin)

  /**
   * GET /api/projects - List projects
   */
  .get('/', async ({ auth, query: { status, page = '1', limit = '20' } }) => {
    const pageNum = parseInt(page)
    const pageSize = parseInt(limit)
    const offset = (pageNum - 1) * pageSize

    try {
      let aqlFilter = `FOR p IN projects`
      const params: Record<string, any> = {}

      if (status) {
        aqlFilter += ` FILTER p.status == @status`
        params.status = status
      }

      // Non-admin: only show projects they're assigned to
      if (!auth.permissions.includes('admin:*') && !auth.permissions.includes('read:all_projects')) {
        aqlFilter += `
          LET userProjects = (
            FOR proj IN 1 OUTBOUND @userId assigned_to
              RETURN proj._key
          )
          FILTER p._key IN userProjects
        `
        params.userId = auth.userId
      }

      const countQuery = `${aqlFilter} RETURN COUNT(p)`
      const countCursor = await db.users().collection.db.query(countQuery, params)
      const total = (await countCursor.all())[0] || 0

      const dataQuery = `${aqlFilter} SORT p.name ASC LIMIT @offset, @limit RETURN p`
      params.offset = offset
      params.limit = pageSize

      const dataCursor = await db.users().collection.db.query(dataQuery, params)
      const projects = await dataCursor.all()

      return {
        success: true,
        data: projects,
        pagination: {
          page: pageNum,
          pageSize,
          total,
          hasMore: offset + pageSize < total,
        },
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      return { error: 'Failed to fetch projects', status: 500 }
    }
  })

  /**
   * GET /api/projects/:projectId - Get single project with team & skills
   */
  .get('/:projectId', async ({ params: { projectId } }) => {
    try {
      const project = (await db.projects().document(projectId)) as Project

      // Fetch team members
      const teamQuery = `
        FOR u IN 1 OUTBOUND @projectId assigned_to
          RETURN { id: u._key, name: u.username, email: u.email }
      `
      const teamCursor = await db.users().collection.db.query(teamQuery, {
        projectId: `projects/${projectId}`,
      })
      const team = await teamCursor.all()

      // Fetch required skills
      const skillsQuery = `
        FOR s IN 1 OUTBOUND @projectId uses_skill
          RETURN { id: s._key, name: s.name }
      `
      const skillsCursor = await db.users().collection.db.query(skillsQuery, {
        projectId: `projects/${projectId}`,
      })
      const skills = await skillsCursor.all()

      return {
        success: true,
        data: {
          project,
          team,
          skills,
        },
      }
    } catch (error) {
      console.error('Error fetching project:', error)
      return { error: 'Project not found', status: 404 }
    }
  })

  /**
   * POST /api/projects - Create project (admin/manager)
   */
  .post(
    '/',
    async ({ auth, body, set }) => {
      // Check permission
      if (
        !auth.permissions.includes('write:projects') &&
        !auth.permissions.includes('admin:*')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      try {
        const project: Project = {
          _key: crypto.randomUUID(),
          name: body.name,
          description: body.description,
          startDate: body.startDate,
          endDate: body.endDate,
          status: 'planning',
          budget: body.budget,
          client: body.client,
          requiredSkills: body.requiredSkills || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await db.projects().save(project)

        // Audit log
        await db.auditLogs().save({
          _key: crypto.randomUUID(),
          userId: auth.userId,
          action: 'create_project',
          resourceId: project._key,
          timestamp: new Date().toISOString(),
          success: true,
        })

        return { success: true, data: project, status: 201 }
      } catch (error) {
        console.error('Error creating project:', error)
        set.status = 500
        return { error: 'Failed to create project', status: 500 }
      }
    },
    {
      body: t.Object({
        name: t.String(),
        description: t.String(),
        startDate: t.String(),
        endDate: t.Optional(t.String()),
        budget: t.Number(),
        client: t.Optional(t.String()),
        requiredSkills: t.Optional(
          t.Array(
            t.Object({
              skillId: t.String(),
              requiredProficiency: t.Enum({
                beginner: 'beginner',
                intermediate: 'intermediate',
                expert: 'expert',
              }),
              allocationCount: t.Number(),
            })
          )
        ),
      }),
    }
  )

  /**
   * PATCH /api/projects/:projectId - Update project
   */
  .patch(
    '/:projectId',
    async ({ auth, params: { projectId }, body, set }) => {
      // Check permission
      if (
        !auth.permissions.includes('write:projects') &&
        !auth.permissions.includes('admin:*')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      try {
        const project = (await db.projects().document(projectId)) as Project

        const updated = {
          ...project,
          ...body,
          updatedAt: new Date().toISOString(),
        }

        await db.projects().update(projectId, updated)

        // Invalidate cache
        await redisCache.del(`project:${projectId}:*`)

        return { success: true, data: updated }
      } catch (error) {
        console.error('Error updating project:', error)
        set.status = 500
        return { error: 'Failed to update project', status: 500 }
      }
    },
    {
      body: t.Partial(
        t.Object({
          name: t.String(),
          description: t.String(),
          status: t.Enum({
            planning: 'planning',
            active: 'active',
            completed: 'completed',
            on_hold: 'on_hold',
          }),
          budget: t.Number(),
          client: t.String(),
        })
      ),
    }
  )

  /**
   * POST /api/projects/:projectId/assign - Assign employee to project
   */
  .post(
    '/:projectId/assign',
    async ({ auth, params: { projectId }, body, set }) => {
      // Check permission
      if (
        !auth.permissions.includes('write:projects') &&
        !auth.permissions.includes('admin:*')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      try {
        // Create edge: user assigned_to project
        await db
          .users()
          .collection.db.collection('assigned_to')
          .save({
            _from: `users/${body.userId}`,
            _to: `projects/${projectId}`,
            role: body.role || 'developer',
            allocatedHours: body.allocatedHours,
            assignedDate: new Date().toISOString(),
          })

        // Audit log
        await db.auditLogs().save({
          _key: crypto.randomUUID(),
          userId: auth.userId,
          action: 'assign_user_to_project',
          resourceId: projectId,
          timestamp: new Date().toISOString(),
          success: true,
          details: `User ${body.userId} assigned to project`,
        })

        return { success: true, message: 'User assigned to project' }
      } catch (error) {
        console.error('Error assigning user:', error)
        set.status = 500
        return { error: 'Failed to assign user', status: 500 }
      }
    },
    {
      body: t.Object({
        userId: t.String(),
        role: t.Optional(t.String()),
        allocatedHours: t.Optional(t.Number()),
      }),
    }
  )

export default projectRoutes
