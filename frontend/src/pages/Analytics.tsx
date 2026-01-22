import { Component, For, Show, createSignal } from 'solid-js'
import { createQuery } from '@tanstack/solid-query'
import { useAuth } from '../context/AuthContext'
import { useApiClient } from '../lib/apiClient'
import styles from './Analytics.module.css'

interface ProjectStat {
  id: string
  name: string
  status: string
  createdAt: string
  tasksByStatus: Record<string, number>
  totalTimeLogged: number
  totalHours: number
}

interface TimeSummary {
  period: number
  totalSeconds: number
  totalHours: number
  averagePerDay: number
  byDate: Record<string, number>
  byActivity: Record<string, number>
}

interface TaskMetrics {
  total: number
  completed: number
  completionRate: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  details: any[]
}

export const Analytics: Component = () => {
  const { auth } = useAuth()
  const api = useApiClient()

  const [period, setPeriod] = createSignal('7')
  const [selectedProject, setSelectedProject] = createSignal<string>('')

  // Fetch project statistics
  const projectsQuery = createQuery(() => ({
    queryKey: ['analytics', 'projects'],
    queryFn: async () => {
      try {
        const data = await api.get<{ success: boolean; data: ProjectStat[] }>(
          '/api/analytics/projects'
        )
        return data.data || []
      } catch (error) {
        console.error('Error fetching project analytics:', error)
        return []
      }
    },
    enabled: auth.isAuthenticated,
  }))

  // Fetch time tracking summary
  const timeSummaryQuery = createQuery(() => ({
    queryKey: ['analytics', 'time', period(), selectedProject()],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          period: period(),
          ...(selectedProject() && { projectId: selectedProject() }),
        })
        const data = await api.get<{ success: boolean; data: TimeSummary }>(
          `/api/analytics/time?${params}`
        )
        return data.data
      } catch (error) {
        console.error('Error fetching time analytics:', error)
        return null
      }
    },
    enabled: auth.isAuthenticated,
  }))

  // Fetch task metrics
  const taskMetricsQuery = createQuery(() => ({
    queryKey: ['analytics', 'tasks', selectedProject()],
    queryFn: async () => {
      try {
        const params = selectedProject() ? `?projectId=${selectedProject()}` : ''
        const data = await api.get<{ success: boolean; data: TaskMetrics }>(
          `/api/analytics/tasks${params}`
        )
        return data.data
      } catch (error) {
        console.error('Error fetching task metrics:', error)
        return null
      }
    },
    enabled: auth.isAuthenticated,
  }))

  const SimpleBar = (props: { value: number; max: number; label: string; color: string }) => {
    const percentage = (props.value / props.max) * 100
    return (
      <div class={styles.barContainer}>
        <div class={styles.barLabel}>
          <span>{props.label}</span>
          <span class={styles.barValue}>{props.value}</span>
        </div>
        <div class={styles.barTrack}>
          <div
            class={styles.barFill}
            style={{
              width: `${percentage}%`,
              'background-color': props.color,
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div class={styles.analytics}>
      <div class={styles.header}>
        <h2>📊 Analytics & Reporting</h2>
        <div class={styles.controls}>
          <div>
            <label>Time Period (days):</label>
            <select value={period()} onChange={(e) => setPeriod(e.currentTarget.value)}>
              <option value="7">Last 7 Days</option>
              <option value="14">Last 14 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>
          </div>
          <div>
            <label>Filter Project:</label>
            <select value={selectedProject()} onChange={(e) => setSelectedProject(e.currentTarget.value)}>
              <option value="">All Projects</option>
              <For each={projectsQuery.data || []}>
                {(project) => (
                  <option value={project.id}>{project.name}</option>
                )}
              </For>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div class={styles.grid2}>
        {/* Time Tracking Summary */}
        <Show when={timeSummaryQuery.data}>
          {(data) => (
            <div class={styles.card}>
              <h3>⏱ Time Tracking Summary</h3>
              <div class={styles.metrics}>
                <div class={styles.metricItem}>
                  <span class={styles.label}>Total Hours</span>
                  <span class={styles.value}>{data().totalHours}h</span>
                </div>
                <div class={styles.metricItem}>
                  <span class={styles.label}>Average per Day</span>
                  <span class={styles.value}>{data().averagePerDay}h</span>
                </div>
                <div class={styles.metricItem}>
                  <span class={styles.label}>Days Tracked</span>
                  <span class={styles.value}>{data().period}</span>
                </div>
              </div>

              {/* Top Activities */}
              <div class={styles.section}>
                <h4>Top Activities</h4>
                <div class={styles.activityList}>
                  <For each={Object.entries(data().byActivity).slice(0, 5)}>
                    {([activity, hours]) => (
                      <div class={styles.activityItem}>
                        <span>{activity}</span>
                        <span class={styles.hours}>{hours}h</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          )}
        </Show>

        {/* Task Metrics */}
        <Show when={taskMetricsQuery.data}>
          {(data) => (
            <div class={styles.card}>
              <h3>✅ Task Completion</h3>
              <div class={styles.metrics}>
                <div class={styles.metricItem}>
                  <span class={styles.label}>Completion Rate</span>
                  <span class={`${styles.value} ${styles.large}`}>{data().completionRate}%</span>
                </div>
                <div class={styles.metricItem}>
                  <span class={styles.label}>
                    {data().completed} of {data().total} Tasks
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div class={styles.progressSection}>
                <SimpleBar
                  value={data().completed}
                  max={data().total || 1}
                  label="Completed Tasks"
                  color="#48bb78"
                />
              </div>

              {/* Status Breakdown */}
              <div class={styles.section}>
                <h4>By Status</h4>
                <div class={styles.statusBreakdown}>
                  <For each={Object.entries(data().byStatus)}>
                    {([status, count]) => (
                      <div class={styles.statusItem}>
                        <span class={styles.statusLabel}>{status}</span>
                        <span class={styles.statusCount}>{count}</span>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </div>
          )}
        </Show>
      </div>

      {/* Project Details */}
      <div class={styles.projectsSection}>
        <h3>📌 Project Details</h3>
        <Show when={projectsQuery.isLoading}>
          <p>Loading project analytics...</p>
        </Show>
        <Show when={!projectsQuery.isLoading && projectsQuery.data}>
          <div class={styles.projectsGrid}>
            <For each={projectsQuery.data || []}>
              {(project) => (
                <div class={styles.projectCard}>
                  <div class={styles.projectHeader}>
                    <h4>{project.name}</h4>
                    <span class={styles.badge}>{project.status}</span>
                  </div>

                  <div class={styles.projectMetrics}>
                    <div class={styles.metric}>
                      <span>Total Time</span>
                      <span class={styles.value}>{project.totalHours}h</span>
                    </div>
                    <div class={styles.metric}>
                      <span>Tasks</span>
                      <span class={styles.value}>
                        {Object.values(project.tasksByStatus).reduce((a, b) => a + b, 0)}
                      </span>
                    </div>
                  </div>

                  {/* Task Status Distribution */}
                  <div class={styles.statusGrid}>
                    <For each={Object.entries(project.tasksByStatus)}>
                      {([status, count]) => (
                        <div class={styles.statusBox}>
                          <div class={`${styles.statusDot} ${styles[status]}`} />
                          <span class={styles.statusText}>{status}</span>
                          <span class={styles.count}>{count}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}
