import { Component, createSignal } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { useAuth } from '../context/AuthContext'
import { ErrorModal } from '../components/ErrorModal'
import { loginSchema, getValidationError } from '../lib/validation'
import styles from './Login.module.css'

export const Login: Component = () => {
  const navigate = useNavigate()
  const { login, auth } = useAuth()

  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<string | null>(null)
  const [showErrorModal, setShowErrorModal] = createSignal(false)
  const [fieldErrors, setFieldErrors] = createSignal<Record<string, string>>({})

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    // Validate input with Zod
    try {
      const validatedData = loginSchema.parse({
        email: email(),
        password: password(),
      })

      await login(validatedData.email, validatedData.password)
      navigate('/', { replace: true })
    } catch (err: any) {
      if (err.errors && err.errors[0]) {
        // Zod validation error
        const errorMessage = getValidationError(err)
        setError(errorMessage)
        setShowErrorModal(true)

        // Set field-specific errors
        const fieldErrs: Record<string, string> = {}
        err.errors.forEach((error: any) => {
          const fieldName = error.path?.[0]
          if (fieldName) {
            fieldErrs[fieldName] = error.message
          }
        })
        setFieldErrors(fieldErrs)
      } else {
        // Login error
        const errorMessage = err instanceof Error ? err.message : 'Login failed'
        setError(errorMessage)
        setShowErrorModal(true)
      }
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
              class={`${styles.input} ${fieldErrors().email ? styles.inputError : ''}`}
              disabled={auth.isLoading}
            />
            {fieldErrors().email && (
              <span class={styles.fieldError}>{fieldErrors().email}</span>
            )}
          </div>

          <div class={styles.formGroup}>
            <label for="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class={`${styles.input} ${fieldErrors().password ? styles.inputError : ''}`}
              disabled={auth.isLoading}
            />
            {fieldErrors().password && (
              <span class={styles.fieldError}>{fieldErrors().password}</span>
            )}
          </div>

          <button type="submit" class={styles.button} disabled={auth.isLoading}>
            {auth.isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div class={styles.footer}>
          <p>Demo Credentials:</p>
          <code>admin@example.com / admin123</code>
          <p class={styles.disclaimer}>
            💡 In production, this will use Microsoft Entra ID (Azure AD) SSO with Microsoft Authenticator MFA.
          </p>
        </div>
      </div>

      <ErrorModal
        isOpen={showErrorModal()}
        title="Login Error"
        message={error() || 'An error occurred'}
        onClose={() => setShowErrorModal(false)}
      />
    </div>
  )
}
