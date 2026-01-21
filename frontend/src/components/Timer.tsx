import { createSignal, createEffect, Show, Component } from 'solid-js'
import { useAuth } from '../context/AuthContext'
import styles from './Timer.module.css'

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
  const [timer, setTimer] = createSignal<TimerState>({
    isRunning: false,
    elapsedSeconds: 0,
    projectId: '',
    description: '',
    billable: false,
    tags: [],
  })
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
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  })

  // Timer interval
  let intervalId: number | undefined
  createEffect(() => {
    if (timer().isRunning) {
      intervalId = setInterval(() => {
        setTimer('elapsedSeconds', (s) => s + 1)
      }, 1000)
    } else {
      if (intervalId) clearInterval(intervalId)
    }
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

    try {
      const response = await fetch('/api/time/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          projectId: currentTimer.projectId,
          taskId: currentTimer.taskId,
          description: currentTimer.description,
          startTime: new Date(Date.now() - currentTimer.elapsedSeconds * 1000).toISOString(),
          endTime: new Date().toISOString(),
          duration: currentTimer.elapsedSeconds,
          type: 'work',
          billable: currentTimer.billable,
          tags: currentTimer.tags,
        }),
      })

      if (response.ok) {
        alert('Time logged successfully!')
        setTimer({
          isRunning: false,
          elapsedSeconds: 0,
          projectId: '',
          description: '',
          billable: false,
          tags: [],
        })
      }
    } catch (error) {
      console.error('Error saving time log:', error)
    }
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
          <option value="">Select Project</option>
          {projects().map((p) => (
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
        <button onClick={stopAndSave} class={`${styles.btn} ${styles.btnSuccess}`} disabled={!timer().isRunning}>
          ✓ Stop & Save
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
