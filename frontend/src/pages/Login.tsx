import { Component, createSignal } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useAuth } from '../context/AuthContext'
import styles from './Login.module.css'

export const Login: Component = () => {
  const navigate = useNavigate()
  const { login, auth } = useAuth()

  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError(null)

    if (!email() || !password()) {
      setError('Please enter both email and password')
      return
    }

    try {
      await login(email(), password())
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  return (
    <div class={styles.loginContainer}>
      <div class={styles.card}>
        <div class={styles.header}>
          <h1>Time & Project Management</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} class={styles.form}>
          <div class={styles.formGroup}>
            <label for="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class={styles.input}
              disabled={auth.isLoading}
            />
          </div>

          <div class={styles.formGroup}>
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class={styles.input}
              disabled={auth.isLoading}
            />
          </div>

          {error() && <div class={styles.error}>{error()}</div>}

          <button type="submit" class={styles.button} disabled={auth.isLoading}>
            {auth.isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div class={styles.footer}>
          <p>Demo Credentials:</p>
          <code>user@example.com / password123</code>
          <p class={styles.disclaimer}>
            💡 In production, this will use Microsoft Entra ID (Azure AD) SSO with Microsoft Authenticator MFA.
          </p>
        </div>
      </div>
    </div>
  )
}
