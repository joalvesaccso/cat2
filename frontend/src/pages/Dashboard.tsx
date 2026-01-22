import { Component, createSignal, Show } from 'solid-js'
import { useAuth } from '../context/AuthContext'
import { Timer } from '../components/Timer'
import { TaskBoard } from '../components/TaskBoard'
import { TimeLog } from '../components/TimeLog'
import { Analytics } from './Analytics'
import { GDPR } from './GDPR'
import styles from './Dashboard.module.css'

type TabType = 'timer' | 'tasks' | 'logs' | 'analytics' | 'expenses' | 'gdpr'

export const Dashboard: Component = () => {
  const { auth, logout } = useAuth()
  const [activeTab, setActiveTab] = createSignal<TabType>('timer')
  const [sidebarOpen, setSidebarOpen] = createSignal(true)

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await logout()
    }
  }

  return (
    <div class={styles.dashboard}>
      {/* Sidebar */}
      <aside class={`${styles.sidebar} ${sidebarOpen() ? styles.open : styles.closed}`}>
        <div class={styles.sidebarHeader}>
          <h2>TimeTrack</h2>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen())}
            class={styles.closeBtn}
            aria-label="Toggle sidebar"
          >
            ✕
          </button>
        </div>

        <nav class={styles.nav}>
          <button
            onClick={() => setActiveTab('timer')}
            class={`${styles.navItem} ${activeTab() === 'timer' ? styles.active : ''}`}
          >
            ⏱️ Timer
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            class={`${styles.navItem} ${activeTab() === 'tasks' ? styles.active : ''}`}
          >
            📊 Tasks
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            class={`${styles.navItem} ${activeTab() === 'logs' ? styles.active : ''}`}
          >
            📋 Time Logs
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            class={`${styles.navItem} ${activeTab() === 'analytics' ? styles.active : ''}`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            class={`${styles.navItem} ${activeTab() === 'expenses' ? styles.active : ''}`}
          >
            💰 Expenses
          </button>
          <button
            onClick={() => setActiveTab('gdpr')}
            class={`${styles.navItem} ${activeTab() === 'gdpr' ? styles.active : ''}`}
          >
            🔒 Privacy
          </button>
        </nav>

        <div class={styles.sidebarFooter}>
          <div class={styles.userInfo}>
            <div class={styles.avatar}>{auth.username?.charAt(0).toUpperCase()}</div>
            <div class={styles.userDetails}>
              <p class={styles.userName}>{auth.username}</p>
              <p class={styles.userDept}>{auth.department}</p>
            </div>
          </div>
          <button onClick={handleLogout} class={styles.logoutBtn}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main class={styles.main}>
        <div class={styles.topBar}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen())}
            class={styles.hamburger}
            aria-label="Toggle menu"
          >
            ☰
          </button>
          <h1>{activeTab() === 'timer' && '⏱️ Timer'}</h1>
          <h1>{activeTab() === 'tasks' && '📊 Tasks & Planning'}</h1>
          <h1>{activeTab() === 'logs' && '📋 Time Logs'}</h1>
          <h1>{activeTab() === 'analytics' && '📊 Analytics & Reporting'}</h1>
          <h1>{activeTab() === 'expenses' && '💰 Expenses'}</h1>
          <h1>{activeTab() === 'gdpr' && '🔒 Privacy & GDPR'}</h1>
          <div class={styles.topBarSpacer} />
        </div>

        <div class={styles.content}>
          <Show when={activeTab() === 'timer'}>
            <Timer />
          </Show>

          <Show when={activeTab() === 'tasks'}>
            <TaskBoard />
          </Show>

          <Show when={activeTab() === 'logs'}>
            <TimeLog />
          </Show>

          <Show when={activeTab() === 'analytics'}>
            <Analytics />
          </Show>

          <Show when={activeTab() === 'expenses'}>
            <div class={styles.placeholder}>
              <h2>💰 Expenses</h2>
              <p>Expense management coming soon...</p>
            </div>
          </Show>

          <Show when={activeTab() === 'gdpr'}>
            <GDPR />
          </Show>
        </div>
      </main>
    </div>
  )
}
