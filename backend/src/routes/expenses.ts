import { Elysia, t } from 'elysia'
import { db, redisCache } from '../db/connection'
import { rbacPlugin } from '../middleware/rbac'
import type { Expense } from '../types/domain'

export const expenseRoutes = new Elysia({ prefix: '/api/expenses', name: 'expense-routes' })
  .use(rbacPlugin)

  /**
   * GET /api/expenses - List expenses
   * Employees see own, managers see department, admins see all
   */
  .get(
    '/',
    async ({ auth, query: { status = 'pending', page = '1', limit = '20' } }) => {
      const pageNum = parseInt(page)
      const pageSize = parseInt(limit)
      const offset = (pageNum - 1) * pageSize

      try {
        let aqlFilter = `FOR e IN expenses FILTER e.status == @status`
        const params: Record<string, any> = { status }

        // Determine scope
        if (!auth.permissions.includes('admin:*')) {
          if (auth.permissions.includes('read:department_reports')) {
            // Manager sees department expenses
            aqlFilter += `
              LET userInDept = (
                FOR u IN users FILTER u.department == @dept RETURN u._key
              )
              FILTER e.userId IN userInDept
            `
            params.dept = auth.department
          } else {
            // Employee sees own
            aqlFilter += ` FILTER e.userId == @userId`
            params.userId = auth.userId
          }
        }

        const countQuery = `${aqlFilter} RETURN COUNT(e)`
        const countCursor = await db.users().collection.db.query(countQuery, params)
        const total = (await countCursor.all())[0] || 0

        const dataQuery = `${aqlFilter} SORT e.date DESC LIMIT @offset, @limit RETURN e`
        params.offset = offset
        params.limit = pageSize

        const dataCursor = await db.users().collection.db.query(dataQuery, params)
        const expenses = await dataCursor.all()

        return {
          success: true,
          data: expenses,
          pagination: {
            page: pageNum,
            pageSize,
            total,
            hasMore: offset + pageSize < total,
          },
        }
      } catch (error) {
        console.error('Error fetching expenses:', error)
        return { error: 'Failed to fetch expenses', status: 500 }
      }
    },
    {
      query: t.Object({
        status: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /api/expenses/:expenseId - Get single expense
   */
  .get('/:expenseId', async ({ auth, params: { expenseId }, set }) => {
    try {
      const expense = (await db.expenses().document(expenseId)) as Expense

      // Check permission
      if (
        expense.userId !== auth.userId &&
        !auth.permissions.includes('read:department_reports') &&
        !auth.permissions.includes('admin:*')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      return { success: true, data: expense }
    } catch (error) {
      set.status = 404
      return { error: 'Expense not found', status: 404 }
    }
  })

  /**
   * POST /api/expenses - Create expense
   */
  .post(
    '/',
    async ({ auth, body, set }) => {
      // Check consent
      const usersColl = db.users()
      const cursor = await usersColl.query('FOR u IN users FILTER u._key == @id RETURN u', {
        id: auth.userId,
      })
      const user = (await cursor.all())[0] as any

      const hasExpenseConsent = user.consents?.some(
        (c: any) => c.type === 'expense_processing' && c.granted
      )

      if (!hasExpenseConsent) {
        set.status = 403
        return {
          error: 'User consent required for expense processing',
          status: 403,
        }
      }

      try {
        const expense: Expense = {
          _key: crypto.randomUUID(),
          userId: auth.userId,
          amount: body.amount,
          currency: 'EUR',
          category: body.category,
          date: body.date,
          description: body.description,
          receiptUrl: body.receiptUrl,
          projectId: body.projectId,
          taskId: body.taskId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        await db.expenses().save(expense)

        // Audit log
        await db.auditLogs().save({
          _key: crypto.randomUUID(),
          userId: auth.userId,
          action: 'create_expense',
          resourceId: expense._key,
          timestamp: new Date().toISOString(),
          success: true,
        })

        return { success: true, data: expense, status: 201 }
      } catch (error) {
        console.error('Error creating expense:', error)
        set.status = 500
        return { error: 'Failed to create expense', status: 500 }
      }
    },
    {
      body: t.Object({
        amount: t.Number({ minimum: 0.01 }),
        category: t.String(),
        date: t.String(),
        description: t.String(),
        receiptUrl: t.Optional(t.String()),
        projectId: t.Optional(t.String()),
        taskId: t.Optional(t.String()),
      }),
    }
  )

  /**
   * PATCH /api/expenses/:expenseId - Update expense (before approval)
   */
  .patch(
    '/:expenseId',
    async ({ auth, params: { expenseId }, body, set }) => {
      try {
        const expense = (await db.expenses().document(expenseId)) as Expense

        // Only owner or admin can edit
        if (expense.userId !== auth.userId && !auth.permissions.includes('admin:*')) {
          set.status = 403
          return { error: 'Forbidden', status: 403 }
        }

        // Cannot edit if approved
        if (expense.status !== 'pending') {
          set.status = 400
          return { error: 'Cannot edit non-pending expense', status: 400 }
        }

        const updated = {
          ...expense,
          ...body,
          updatedAt: new Date().toISOString(),
        }

        await db.expenses().update(expenseId, updated)

        return { success: true, data: updated }
      } catch (error) {
        console.error('Error updating expense:', error)
        set.status = 500
        return { error: 'Failed to update expense', status: 500 }
      }
    },
    {
      body: t.Partial(
        t.Object({
          amount: t.Number(),
          category: t.String(),
          description: t.String(),
          receiptUrl: t.String(),
        })
      ),
    }
  )

  /**
   * POST /api/expenses/:expenseId/approve - Approve expense (manager/admin only)
   */
  .post(
    '/:expenseId/approve',
    async ({ auth, params: { expenseId }, body, set }) => {
      // Check permission
      if (
        !auth.permissions.includes('admin:*') &&
        !auth.permissions.includes('write:expense_approval')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      try {
        const expense = (await db.expenses().document(expenseId)) as Expense

        const updated = {
          ...expense,
          status: 'approved',
          approvedBy: auth.userId,
          updatedAt: new Date().toISOString(),
        }

        await db.expenses().update(expenseId, updated)

        // Audit log
        await db.auditLogs().save({
          _key: crypto.randomUUID(),
          userId: auth.userId,
          action: 'approve_expense',
          resourceId: expenseId,
          timestamp: new Date().toISOString(),
          success: true,
          details: body.notes || '',
        })

        return { success: true, data: updated }
      } catch (error) {
        console.error('Error approving expense:', error)
        set.status = 500
        return { error: 'Failed to approve expense', status: 500 }
      }
    },
    {
      body: t.Object({
        notes: t.Optional(t.String()),
      }),
    }
  )

  /**
   * POST /api/expenses/:expenseId/reject - Reject expense
   */
  .post(
    '/:expenseId/reject',
    async ({ auth, params: { expenseId }, body, set }) => {
      // Check permission
      if (
        !auth.permissions.includes('admin:*') &&
        !auth.permissions.includes('write:expense_approval')
      ) {
        set.status = 403
        return { error: 'Forbidden', status: 403 }
      }

      try {
        const expense = (await db.expenses().document(expenseId)) as Expense

        const updated = {
          ...expense,
          status: 'rejected',
          rejectionReason: body.reason,
          updatedAt: new Date().toISOString(),
        }

        await db.expenses().update(expenseId, updated)

        // Audit log
        await db.auditLogs().save({
          _key: crypto.randomUUID(),
          userId: auth.userId,
          action: 'reject_expense',
          resourceId: expenseId,
          timestamp: new Date().toISOString(),
          success: true,
          details: body.reason,
        })

        return { success: true, data: updated }
      } catch (error) {
        console.error('Error rejecting expense:', error)
        set.status = 500
        return { error: 'Failed to reject expense', status: 500 }
      }
    },
    {
      body: t.Object({
        reason: t.String(),
      }),
    }
  )

export default expenseRoutes
