/**
 * API Client Utility for Frontend
 * Handles all HTTP requests with automatic auth header injection and token refresh
 */

import { useAuth } from '../context/AuthContext'

export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  data?: T
}

// Track ongoing refresh to avoid simultaneous refresh requests
let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

export const useApiClient = () => {
  const { auth, refreshToken } = useAuth()

  const getAuthHeader = () => {
    if (!auth.token) {
      throw new Error('Not authenticated')
    }
    return {
      Authorization: `Bearer ${auth.token}`,
    }
  }

  const handleRefresh = async (): Promise<boolean> => {
    if (isRefreshing) {
      // Already refreshing, wait for it
      return refreshPromise || Promise.resolve(false)
    }

    isRefreshing = true
    refreshPromise = refreshToken()

    try {
      const success = await refreshPromise
      return success
    } finally {
      isRefreshing = false
      refreshPromise = null
    }
  }

  const handleResponse = async <T = any>(
    response: Response,
    originalRequest?: { method: string; path: string; data?: any }
  ): Promise<T> => {
    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401 && originalRequest) {
        // Token expired, try to refresh
        const refreshed = await handleRefresh()
        if (refreshed) {
          // Token refreshed, retry original request
          return retryRequest<T>(originalRequest)
        } else {
          // Refresh failed, user is logged out
          throw new Error('Session expired. Please login again.')
        }
      }
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  }

  const retryRequest = async <T = any>(request: {
    method: string
    path: string
    data?: any
  }): Promise<T> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    }

    const response = await fetch(request.path, {
      method: request.method,
      headers,
      body: request.data ? JSON.stringify(request.data) : undefined,
    })

    return handleResponse<T>(response)
  }

  return {
    /**
     * GET request
     */
    get: async <T = any>(path: string): Promise<T> => {
      const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      })
      return handleResponse<T>(response, { method: 'GET', path })
    },

    /**
     * POST request
     */
    post: async <T = any>(path: string, data?: any): Promise<T> => {
      const response = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: data ? JSON.stringify(data) : undefined,
      })
      return handleResponse<T>(response, { method: 'POST', path, data })
    },

    /**
     * PATCH request
     */
    patch: async <T = any>(path: string, data?: any): Promise<T> => {
      const response = await fetch(path, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: data ? JSON.stringify(data) : undefined,
      })
      return handleResponse<T>(response, { method: 'PATCH', path, data })
    },

    /**
     * DELETE request
     */
    delete: async <T = any>(path: string): Promise<T> => {
      const response = await fetch(path, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
      })
      return handleResponse<T>(response, { method: 'DELETE', path })
    },

    /**
     * Unauthenticated request (for login, etc.)
     */
    public: {
      post: async <T = any>(path: string, data?: any): Promise<T> => {
        const response = await fetch(path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        })
        const responseData = await response.json()

        if (!response.ok) {
          throw new Error(responseData.error || `HTTP ${response.status}`)
        }

        return responseData
      },
    },
  }
}
