import { Component, For, Show, createSignal, createEffect } from 'solid-js'
import { useAuth } from '../context/AuthContext'
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
  const [tasks, setTasks] = createSignal<TaskItem[]>([])
  const [view, setView] = createSignal<'board' | 'list' | 'calendar'>('board')
  const [projectId, setProjectId] = createSignal<string>('')
  const [projects, setProjects] = createSignal<any[]>([])

  // Fetch projects
  createEffect(async () => {
    if (!auth.isAuthenticated) return

    try {
      const response = await fetch('/api/projects', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setProjects(data.data)
        if (data.data.length > 0) {
          setProjectId(data.data[0]._key)
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  })

  // Fetch tasks for selected project
  createEffect(async () => {
    if (!projectId() || !auth.isAuthenticated) return

    try {
      const response = await fetch(`/api/tasks?projectId=${projectId()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setTasks(data.data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  })

  const tasksByStatus = () => {
    const all = tasks()
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
            <option value="">Select Project</option>
            {projects().map((p) => (
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
            <div class={styles.column}>
              <div class={styles.columnHeader}>
                <h3>{status.replace('_', ' ').toUpperCase()}</h3>
                <span class={styles.badge}>{tasksByStatus()[status].length}</span>
              </div>

              <div class={styles.tasks}>
                <For each={tasksByStatus()[status]}>
                  {(task) => (
                    <div
                      class={styles.card}
                      style={{
                        'border-left': `4px solid ${priorityColor(task.priority)}`,
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
    </div>
  )
}
