import { createSignal, createEffect, Show, Component, onCleanup } from 'solid-js'
import { createQuery, createMutation } from '@tanstack/solid-query'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import styles from './Timer.module.css'

interface Project {
  _key: string
  name: string
}

interface TimerState {
  isRunning: boolean
  elapsedSeconds: number
  projectId: string
  description: string
  taskId?: string
  billable: boolean
  tags: string[]
}

export const Timer: Component = () => {
  const { auth } = useAuth()
  const api = useApiClient()

  const [timer, setTimer] = createSignal<TimerState>({
    isRunning: false,
    elapsedSeconds: 0,
    projectId: '',
    description: '',
    billable: false,
    tags: [],
  })

  // Fetch projects with TanStack Query
  const projectsQuery = createQuery(() => ({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const data = await api.get<{ success: boolean; data: Project[] }>('/api/projects')
        return data.data || []
      } catch (error) {
        console.error('Error fetching projects:', error)
        return []
      }
    },
    enabled: auth.isAuthenticated,
  }))

  // Mutation for saving time log
  const createTimeLogMutation = createMutation(() => ({
    mutationFn: async (data: any) => {
      return api.post('/api/time/logs', data)
    },
    onSuccess: () => {
      alert('Time logged successfully!')
      setTimer({
        isRunning: false,
        elapsedSeconds: 0,
        projectId: '',
        description: '',
        billable: false,
        tags: [],
      })
    },
    onError: (error: any) => {
      alert(`Error: ${error.message}`)
    },
  }))

  // Timer interval
  createEffect(() => {
    if (!timer().isRunning) return

    const intervalId = setInterval(() => {
      setTimer('elapsedSeconds', (s) => s + 1)
    }, 1000)

    onCleanup(() => clearInterval(intervalId))
  })

  const toggleTimer = () => {
    setTimer('isRunning', (r) => !r)
  }

  const stopAndSave = async () => {
    const currentTimer = timer()
    setTimer('isRunning', false)

    if (!currentTimer.projectId || !currentTimer.description) {
      alert('Please select a project and add a description')
      return
    }

    createTimeLogMutation.mutate({
      projectId: currentTimer.projectId,
      taskId: currentTimer.taskId,
      description: currentTimer.description,
      startTime: new Date(Date.now() - currentTimer.elapsedSeconds * 1000).toISOString(),
      endTime: new Date().toISOString(),
      duration: currentTimer.elapsedSeconds,
      type: 'work',
      billable: currentTimer.billable,
      tags: currentTimer.tags,
    })
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <div class={styles.timerContainer}>
      <div class={styles.timerDisplay}>
        <h1>{formatTime(timer().elapsedSeconds)}</h1>
      </div>

      <div class={styles.timerInputs}>
        <input
          type="text"
          placeholder="What are you working on?"
          value={timer().description}
          onInput={(e) => setTimer('description', e.currentTarget.value)}
          class={styles.input}
        />

        <select
          value={timer().projectId}
          onChange={(e) => setTimer('projectId', e.currentTarget.value)}
          class={styles.select}
        >
          <option value="">
            {projectsQuery.isLoading ? 'Loading projects...' : 'Select Project'}
          </option>
          {projectsQuery.data?.map((p) => (
            <option value={p._key}>{p.name}</option>
          ))}
        </select>

        <label class={styles.checkbox}>
          <input
            type="checkbox"
            checked={timer().billable}
            onChange={(e) => setTimer('billable', e.currentTarget.checked)}
          />
          Billable
        </label>
      </div>

      <div class={styles.timerControls}>
        <button onClick={toggleTimer} class={`${styles.btn} ${styles.btnPrimary}`}>
          {timer().isRunning ? '⏸ Pause' : '▶ Start'}
        </button>
        <button
          onClick={stopAndSave}
          class={`${styles.btn} ${styles.btnSuccess}`}
          disabled={!timer().isRunning || createTimeLogMutation.isPending}
        >
          {createTimeLogMutation.isPending ? '💾 Saving...' : '✓ Stop & Save'}
        </button>
        <button
          onClick={() => setTimer('elapsedSeconds', 0)}
          class={`${styles.btn} ${styles.btnDanger}`}
        >
          ↺ Reset
        </button>
      </div>
    </div>
  )
}
