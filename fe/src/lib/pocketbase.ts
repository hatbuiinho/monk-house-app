import PocketBase from 'pocketbase'

// Create a single instance of PocketBase client
const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'
)

// Enable auto-cancellation for requests
pb.autoCancellation(false)

// Add request interceptor for token validation and auto-refresh
pb.beforeSend = async (url, options) => {
  // Skip token validation for auth-related endpoints
  if (
    url.includes('/api/admins/auth-with-password') ||
    url.includes('/api/collections/users/auth-with-password') ||
    url.includes('/api/collections/users/auth-refresh')
  ) {
    return { url, options }
  }

  // Check if token is valid
  if (pb.authStore.isValid) {
    // Check if token is about to expire (within 5 minutes)
    const token = pb.authStore.token
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        const expiresAt = payload.exp * 1000 // Convert to milliseconds
        const currentTime = Date.now()
        const bufferTime = 5 * 60 * 1000 // 5 minutes buffer

        // If token is expired or about to expire, try to refresh
        if (expiresAt <= currentTime + bufferTime) {
          try {
            await pb.collection('users').authRefresh()
            return { url, options }
          } catch (_refreshError) {
            // Clear the invalid token and redirect to login
            pb.authStore.clear()
            localStorage.removeItem('pb_auth')
            
            // Redirect to login page
            if (typeof window !== 'undefined') {
              window.location.href = '/sign-in'
            }
            
            // Throw error to stop the original request
            throw new Error('Session expired. Please login again.')
          }
        }
      } catch (_decodeError) {
        // If we can't decode the token, it's invalid
        pb.authStore.clear()
        localStorage.removeItem('pb_auth')
        
        if (typeof window !== 'undefined') {
          window.location.href = '/sign-in'
        }
        
        throw new Error('Invalid token. Please login again.')
      }
    }
  } else {
    // No valid token, redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in'
    }

    throw new Error('No valid session. Please login.')
  }

  return { url, options }
}

// Authentication state management
class PocketBaseAuth {
  private static instance: PocketBaseAuth
  private pbInstance: PocketBase

  private constructor(pbInstance: PocketBase) {
    this.pbInstance = pbInstance

    // Add request interceptor for auth headers
    this.pbInstance.authStore.onChange(() => {
      // Persist auth state to localStorage
      if (this.pbInstance.authStore.isValid) {
        localStorage.setItem(
          'pb_auth',
          JSON.stringify(this.pbInstance.authStore.exportToCookie())
        )
      } else {
        localStorage.removeItem('pb_auth')
      }
    })

    // Load stored auth state on initialization
  }

  static getInstance(pbInstance?: PocketBase): PocketBaseAuth {
    if (!PocketBaseAuth.instance) {
      PocketBaseAuth.instance = new PocketBaseAuth(pbInstance || pb)
    }
    return PocketBaseAuth.instance
  }

  // Password authentication methods
  async loginWithPassword(email: string, password: string) {
    try {
      const authData = await this.pbInstance
        .collection('users')
        .authWithPassword(email, password)
      return {
        success: true,
        user: authData.record,
        token: authData.token,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }
    }
  }

  async registerWithPassword(
    email: string,
    password: string,
    passwordConfirm: string,
    extraData?: Record<string, unknown>
  ) {
    try {
      await this.pbInstance.collection('users').create({
        email,
        password,
        passwordConfirm,
        ...extraData,
      })

      // Auto-login after registration
      const loginResult = await this.loginWithPassword(email, password)

      return {
        success: true,
        user: loginResult.user,
        token: loginResult.token,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }
    }
  }

  async logout() {
    try {
      this.pbInstance.authStore.clear()
      localStorage.removeItem('pb_auth')
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      }
    }
  }

  async refreshAuth() {
    try {
      if (this.pbInstance.authStore.isValid) {
        const refreshData = await this.pbInstance
          .collection('users')
          .authRefresh()
        return {
          success: true,
          user: refreshData.record,
          token: refreshData.token,
        }
      }
      return { success: false, error: 'No valid auth token' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auth refresh failed',
      }
    }
  }

  // Helper methods
  get currentUser() {
    return this.pbInstance.authStore.record
  }

  get isAuthenticated() {
    return this.pbInstance.authStore.isValid
  }

  get authToken() {
    return this.pbInstance.authStore.token
  }

  // Password reset functionality
  async requestPasswordReset(email: string) {
    try {
      await this.pbInstance.collection('users').requestPasswordReset(email)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Password reset request failed',
      }
    }
  }

  async confirmPasswordReset(
    resetToken: string,
    newPassword: string,
    newPasswordConfirm: string
  ) {
    try {
      await this.pbInstance
        .collection('users')
        .confirmPasswordReset(resetToken, newPassword, newPasswordConfirm)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Password reset confirmation failed',
      }
    }
  }
}

// Initialize authentication instance
const auth = PocketBaseAuth.getInstance()

export { pb, auth }

// Types for our PocketBase collections
export interface TaskRecord {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done' | 'canceled' | 'backlog'
  priority: 'low' | 'medium' | 'high'
  label?: string
  assignee?: string
  due_date?: string
  created?: string
  updated?: string
}

export interface UserRecord {
  id: string
  email: string
  name?: string
  avatar?: string
  created?: string
  updated?: string
}
