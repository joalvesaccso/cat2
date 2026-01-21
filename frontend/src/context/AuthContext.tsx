import { createSignal, createContext, useContext, Component, JSX, ParentComponent } from 'solid-js'
import { createStore } from 'solid-js/store'
import type { AuthContext } from '../../types/domain'

interface AuthState extends AuthContext {
  token?: string
  isLoading: boolean
  error?: string
}

interface AuthContextType {
  auth: AuthState
  setAuth: (auth: Partial<AuthState>) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: () => boolean
}

const AuthContext = createContext<AuthContextType>()

export const AuthProvider: ParentComponent = (props) => {
  const [auth, setAuth] = createStore<AuthState>({
    userId: '',
    username: '',
    email: '',
    roles: [],
    permissions: [],
    department: '',
    isAuthenticated: false,
    isLoading: false,
  })

  const login = async (email: string, password: string) => {
    setAuth('isLoading', true)
    setAuth('error', undefined)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()

      if (data.success) {
        const { token, user } = data
        setAuth({
          userId: user.id,
          username: user.username,
          email: user.email,
          department: user.department || '',
          roles: user.roles || [],
          token,
          isAuthenticated: true,
        })

        // Store token in localStorage (alternative: httpOnly cookie via backend)
        localStorage.setItem('auth_token', token)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setAuth('error', msg)
      throw error
    } finally {
      setAuth('isLoading', false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      setAuth({
        userId: '',
        username: '',
        email: '',
        roles: [],
        permissions: [],
        department: '',
        isAuthenticated: false,
        token: undefined,
      })
      localStorage.removeItem('auth_token')
    }
  }

  const isAuthenticated = () => auth.isAuthenticated

  return (
    <AuthContext.Provider
      value={{
        auth,
        setAuth,
        login,
        logout,
        isAuthenticated,
      }}
    >
      {props.children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
