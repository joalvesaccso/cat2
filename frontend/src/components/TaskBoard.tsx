import { Component, For, Show, createSignal } from 'solid-js'
import { createQuery, createMutation } from '@tanstack/solid-query'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import { ErrorModal } from './ErrorModal'
import { taskStatusSchema } from '../lib/validation'
import styles from './TaskBoard.module.css'

interface TaskItem {
  _key: string
  name: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'review' | 'done'
  dueDate?: string
  estimatedDuration: number
  assigneeId?: string
  billable: boolean
}

export const TaskBoard: Component = () => {
  const { auth } = useAuth()
  const api = useApiClient()

  const [view, setView] = createSignal<'board' | 'list' | 'calendar'>('board')
  const [projectId, setProjectId] = createSignal<string>('')
  const [error, setError] = createSignal<string | null>(null)
  const [showErrorModal, setShowErrorModal] = createSignal(false)
  const [draggedTask, setDraggedTask] = createSignal<TaskItem | null>(null)
  const [dragOverStatus, setDragOverStatus] = createSignal<string | null>(null)

  // Fetch projects with TanStack Query
  const projectsQuery = createQuery(() => ({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const data = await api.get<{ success: boolean; data: any[] }>('/api/projects')
        if (data.data && data.data.length > 0) {
          setProjectId(data.data[0]._key)
        }
        return data.data || []
      } catch (error) {
        console.error('Error fetching projects:', error)
        return []
      }
    },
    enabled: auth.isAuthenticated,
  }))

  // Fetch tasks for selected project with TanStack Query
  const tasksQuery = createQuery(() => ({
    queryKey: ['tasks', projectId()],
    queryFn: async () => {
      try {
        const params = projectId() ? `?projectId=${projectId()}` : ''
        const data = await api.get<{ success: boolean; data: TaskItem[] }>(`/api/tasks${params}`)
        return data.data || []
      } catch (error) {
        console.error('Error fetching tasks:', error)
        return []
      }
    },
    enabled: auth.isAuthenticated && !!projectId(),
  }))

  // Mutation for updating task status with validation
  const updateTaskMutation = createMutation(() => ({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      // Validate status
      const validatedData = taskStatusSchema.parse({ status })
      return api.patch(`/api/tasks/${taskId}`, validatedData)
    },
    onSuccess: () => {
      tasksQuery.refetch()
    },
    onError: (error: any) => {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update task'
      setError(errorMsg)
      setShowErrorModal(true)
    },
  }))

  // Drag handlers for kanban board
  const handleDragStart = (task: TaskItem) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
  }

  const handleDragEnter = (status: string, e: DragEvent) => {
    e.preventDefault()
    setDragOverStatus(status)
  }

  const handleDragLeave = (e: DragEvent) => {
    // Only set to null if we're leaving the entire column
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !relatedTarget.closest('[data-column]')) {
      setDragOverStatus(null)
    }
  }

  const handleDrop = (status: string, e: DragEvent) => {
    e.preventDefault()
    const task = draggedTask()
    
    if (task && task.status !== status) {
      // Update the task status
      updateTaskMutation.mutate({ taskId: task._key, status })
    }
    
    setDraggedTask(null)
    setDragOverStatus(null)
  }

  const tasksByStatus = () => {
    const all = tasksQuery.data || []
    return {
      todo: all.filter((t) => t.status === 'todo'),
      in_progress: all.filter((t) => t.status === 'in_progress'),
      review: all.filter((t) => t.status === 'review'),
      done: all.filter((t) => t.status === 'done'),
    }
  }

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#f56565'
      case 'medium':
        return '#ed8936'
      case 'low':
        return '#48bb78'
      default:
        return '#cbd5e0'
    }
  }

  return (
    <div class={styles.taskBoard}>
      <div class={styles.header}>
        <h2>Tasks & Planning</h2>
        <div class={styles.controls}>
          <select
            value={projectId()}
            onChange={(e) => setProjectId(e.currentTarget.value)}
            class={styles.select}
          >
            <option value="">
              {projectsQuery.isLoading ? 'Loading...' : 'Select Project'}
            </option>
            {projectsQuery.data?.map((p) => (
              <option value={p._key}>{p.name}</option>
            ))}
          </select>

          <div class={styles.viewToggle}>
            <button
              onClick={() => setView('board')}
              class={view() === 'board' ? styles.active : ''}
            >
              📊 Board
            </button>
            <button
              onClick={() => setView('list')}
              class={view() === 'list' ? styles.active : ''}
            >
              📋 List
            </button>
            <button
              onClick={() => setView('calendar')}
              class={view() === 'calendar' ? styles.active : ''}
            >
              📅 Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board View */}
      <Show when={view() === 'board'}>
        <div class={styles.board}>
          {(
            ['todo', 'in_progress', 'review', 'done'] as const
          ).map((status) => (
            <div 
              class={`${styles.column} ${dragOverStatus() === status ? styles.dragOver : ''}`}
              data-column={status}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(status, e)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(status, e)}
            >
              <div class={styles.columnHeader}>
                <h3>{status.replace('_', ' ').toUpperCase()}</h3>
                <span class={styles.badge}>{tasksByStatus()[status].length}</span>
              </div>

              <div class={styles.tasks}>
                <For each={tasksByStatus()[status]}>
                  {(task) => (
                    <div
                      class={`${styles.card} ${draggedTask()?._key === task._key ? styles.dragging : ''}`}
                      draggable={true}
                      onDragStart={() => handleDragStart(task)}
                      style={{
                        'border-left': `4px solid ${priorityColor(task.priority)}`,
                        'cursor': 'grab',
                      }}
                    >
                      <h4>{task.name}</h4>
                      <p class={styles.description}>{task.description}</p>
                      <div class={styles.meta}>
                        <span class={styles.priority}>{task.priority}</span>
                        {task.billable && <span class={styles.billable}>💰 Billable</span>}
                      </div>
                      {task.dueDate && (
                        <div class={styles.dueDate}>
                          📅 {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                      <div class={styles.footer}>
                        <span>⏱ {Math.round(task.estimatedDuration / 60)}h</span>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            </div>
          ))}
        </div>
      </Show>

      {/* List View */}
      <Show when={view() === 'list'}>
        <div class={styles.listView}>
          <table class={styles.table}>
            <thead>
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Est. Hours</th>
              </tr>
            </thead>
            <tbody>
              <For each={tasks()}>
                {(task) => (
                  <tr>
                    <td class={styles.taskName}>{task.name}</td>
                    <td>
                      <span class={`${styles.badge} ${styles[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{task.priority}</td>
                    <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</td>
                    <td>{Math.round(task.estimatedDuration / 60)}h</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>

      <ErrorModal
        isOpen={showErrorModal()}
        title="TaskBoard Error"
        message={error() || 'An error occurred'}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  )
}
