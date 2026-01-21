/**
 * API Client Utility for Frontend
 * Handles all HTTP requests with automatic auth header injection
 */

import { useAuth } from '../context/AuthContext'

export interface ApiResponse<T = any> {
  success: boolean
  error?: string
  data?: T
}

export const useApiClient = () => {
  const { auth } = useAuth()

  const getAuthHeader = () => {
    if (!auth.token) {
      throw new Error('Not authenticated')
    }
    return {
      Authorization: `Bearer ${auth.token}`,
    }
  }

  const handleResponse = async <T = any>(response: Response): Promise<T> => {
    const data = await response.json()

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid - logout?
        throw new Error('Unauthorized: ' + (data.error || 'Invalid token'))
      }
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
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
      return handleResponse<T>(response)
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
      return handleResponse<T>(response)
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
      return handleResponse<T>(response)
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
      return handleResponse<T>(response)
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
        return handleResponse<T>(response)
      },
    },
  }
}
