import PocketBase from 'pocketbase'

// Create a single instance of PocketBase client
const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090'
)

// Enable auto-cancellation for requests
pb.autoCancellation(false)

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
