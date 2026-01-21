import { Component, For, createSignal, createEffect } from 'solid-js'
import { useAuth } from '../context/AuthContext'
import styles from './TimeLog.module.css'

interface TimeLogItem {
  _key: string
  projectId: string
  description: string
  duration: number
  startTime: string
  type: 'work' | 'travel' | 'holiday' | 'sick'
  billable: boolean
}

export const TimeLog: Component = () => {
  const { auth } = useAuth()
  const [logs, setLogs] = createSignal<TimeLogItem[]>([])
  const [filter, setFilter] = createSignal<{ startDate: string; endDate: string }>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  // Fetch time logs
  const fetchLogs = async () => {
    if (!auth.isAuthenticated) return

    try {
      const params = new URLSearchParams({
        startDate: filter().startDate,
        endDate: filter().endDate,
      })

      const response = await fetch(`/api/time/logs?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    }
  }

  createEffect(() => {
    fetchLogs()
  })

  const totalHours = () => {
    const total = logs().reduce((sum, log) => sum + log.duration, 0)
    return Math.round((total / 60) * 100) / 100
  }

  const billableHours = () => {
    const total = logs()
      .filter((l) => l.billable)
      .reduce((sum, log) => sum + log.duration, 0)
    return Math.round((total / 60) * 100) / 100
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div class={styles.timeLog}>
      <h2>Time Logs</h2>

      <div class={styles.filters}>
        <input
          type="date"
          value={filter().startDate}
          onChange={(e) => setFilter({ ...filter(), startDate: e.currentTarget.value })}
          class={styles.input}
        />
        <span>to</span>
        <input
          type="date"
          value={filter().endDate}
          onChange={(e) => setFilter({ ...filter(), endDate: e.currentTarget.value })}
          class={styles.input}
        />
      </div>

      <div class={styles.summary}>
        <div class={styles.summaryCard}>
          <span class={styles.label}>Total Hours</span>
          <span class={styles.value}>{totalHours()}h</span>
        </div>
        <div class={styles.summaryCard}>
          <span class={styles.label}>Billable Hours</span>
          <span class={styles.value}>{billableHours()}h</span>
        </div>
        <div class={styles.summaryCard}>
          <span class={styles.label}>Entries</span>
          <span class={styles.value}>{logs().length}</span>
        </div>
      </div>

      <div class={styles.list}>
        <For each={logs()}>
          {(log) => (
            <div class={styles.item}>
              <div class={styles.itemHeader}>
                <h4>{log.description}</h4>
                <span class={styles.duration}>{formatDuration(log.duration)}</span>
              </div>
              <div class={styles.itemMeta}>
                <span class={styles.date}>
                  {new Date(log.startTime).toLocaleDateString()}{' '}
                  {new Date(log.startTime).toLocaleTimeString()}
                </span>
                {log.billable && <span class={styles.billable}>💰 Billable</span>}
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
