import { createSignal, createContext, useContext, Component, JSX, ParentComponent, createEffect, onCleanup } from 'solid-js'
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
  refreshToken: () => Promise<boolean>
  isAuthenticated: () => boolean
}

const AuthContext = createContext<AuthContextType>()

// Helper function to decode token
const decodeToken = (token: string): { exp: number } | null => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
  } catch {
    return null
  }
}

// Helper function to check if token is expired
const isTokenExpired = (token: string | undefined): boolean => {
  if (!token) return true
  const decoded = decodeToken(token)
  if (!decoded) return true
  return decoded.exp < Date.now()
}

// Helper function to get time until token expiration (in ms)
const getTimeUntilExpiration = (token: string | undefined): number => {
  if (!token) return 0
  const decoded = decodeToken(token)
  if (!decoded) return 0
  return Math.max(0, decoded.exp - Date.now())
}

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

  const [refreshInterval, setRefreshInterval] = createSignal<NodeJS.Timeout | null>(null)

  const login = async (email: string, password: string) => {
    setAuth('isLoading', true)
    setAuth('error', undefined)

    try {
      const response = await fetch('/auth/login', {
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

        // Store token in localStorage
        localStorage.setItem('auth_token', token)

        // Setup auto-refresh
        setupTokenRefresh(token)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      setAuth('error', msg)
      throw error
    } finally {
      setAuth('isLoading', false)
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    const currentToken = auth.token
    if (!currentToken) {
      return false
    }

    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
        credentials: 'include',
      })

      if (!response.ok) {
        // Token refresh failed, logout user
        await logout()
        return false
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

        // Update token in localStorage
        localStorage.setItem('auth_token', token)

        // Reset refresh interval with new token
        setupTokenRefresh(token)

        return true
      }

      return false
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
      return false
    }
  }

  const setupTokenRefresh = (token: string) => {
    // Clear existing interval
    const existingInterval = refreshInterval()
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    // Calculate refresh time (refresh when 5 minutes left)
    const timeUntilExpiration = getTimeUntilExpiration(token)
    const refreshTime = Math.max(1000, timeUntilExpiration - 5 * 60 * 1000) // Refresh 5 min before expiry

    const interval = setInterval(() => {
      refreshToken()
    }, refreshTime)

    setRefreshInterval(interval)
  }

  const logout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } finally {
      // Clear refresh interval
      const interval = refreshInterval()
      if (interval) {
        clearInterval(interval)
        setRefreshInterval(null)
      }

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

  // Initialize auth from localStorage and setup token refresh on mount
  createEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken && !isTokenExpired(storedToken)) {
      // Token exists and is valid
      const decoded = decodeToken(storedToken)
      if (decoded) {
        setAuth({
          token: storedToken,
          isAuthenticated: true,
        })
        setupTokenRefresh(storedToken)
      }
    } else if (storedToken) {
      // Token exists but is expired
      localStorage.removeItem('auth_token')
    }
  })

  // Cleanup on unmount
  onCleanup(() => {
    const interval = refreshInterval()
    if (interval) {
      clearInterval(interval)
    }
  })

  return (
    <AuthContext.Provider
      value={{
        auth,
        setAuth,
        login,
        logout,
        refreshToken,
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
