import { Component, Show } from 'solid-js'
import { Router, Route, Navigate } from '@solidjs/router'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import styles from './App.module.css'

const ProtectedRoute: Component<{ children: any }> = (props) => {
  const { auth } = useAuth()

  return (
    <Show when={auth.isAuthenticated} fallback={<Navigate href="/login" />}>
      {props.children}
    </Show>
  )
}

export const App: Component = () => {
  return (
    <Router
      root={(props) => (
        <AuthProvider>
          <div class={styles.app}>{props.children}</div>
        </AuthProvider>
      )}
    >
      <Route path="/login" component={Login} />
      <Route
        path="/*"
        component={() => (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      />
    </Router>
  )
}

export default App
