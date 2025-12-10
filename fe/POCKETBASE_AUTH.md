# PocketBase Password Authentication

This document explains how to use the new password authentication system implemented in the PocketBase client.

## Overview

The authentication system has been enhanced with a comprehensive `PocketBaseAuth` class that provides password-based authentication methods. This replaces the basic authentication handling with a more robust solution.

## Features

- **Password-based login/logout**
- **User registration with password confirmation**
- **Token refresh functionality**
- **Password reset with email confirmation**
- **Automatic session persistence**
- **Type-safe error handling**

## Usage

### Import the Authentication Instance

```typescript
import { auth } from '@/lib/pocketbase'
```

### Available Methods

#### 1. Login with Password

```typescript
const result = await auth.loginWithPassword(email, password)

if (result.success) {
  console.log('Logged in:', result.user)
  console.log('Auth token:', result.token)
} else {
  console.error('Login failed:', result.error)
}
```

#### 2. Register with Password

```typescript
const result = await auth.registerWithPassword(
  email,
  password,
  passwordConfirm,
  {
    name: 'John Doe',
    avatar: 'url-to-avatar.jpg'
  }
)

if (result.success) {
  console.log('Registered and logged in:', result.user)
} else {
  console.error('Registration failed:', result.error)
}
```

#### 3. Logout

```typescript
const result = await auth.logout()

if (result.success) {
  console.log('Logged out successfully')
  // Redirect to login page or update app state
}
```

#### 4. Refresh Authentication Token

```typescript
const result = await auth.refreshAuth()

if (result.success) {
  console.log('Token refreshed:', result.user)
} else {
  console.error('Token refresh failed:', result.error)
  // Handle token expiration (e.g., redirect to login)
}
```

#### 5. Request Password Reset

```typescript
const result = await auth.requestPasswordReset(email)

if (result.success) {
  console.log('Password reset email sent')
  // Show success message to user
} else {
  console.error('Password reset request failed:', result.error)
}
```

#### 6. Confirm Password Reset

```typescript
const result = await auth.confirmPasswordReset(
  resetToken,
  newPassword,
  newPasswordConfirm
)

if (result.success) {
  console.log('Password reset successful')
  // Redirect to login page
} else {
  console.error('Password reset failed:', result.error)
}
```

### Helper Properties

#### Get Current User

```typescript
const currentUser = auth.currentUser
console.log('Current user:', currentUser)
```

#### Check Authentication Status

```typescript
if (auth.isAuthenticated) {
  console.log('User is logged in')
} else {
  console.log('User is not logged in')
}
```

#### Get Auth Token

```typescript
const token = auth.authToken
console.log('Auth token:', token)
```

## Complete Authentication Service Example

```typescript
import { auth } from '@/lib/pocketbase'

export class AuthService {
  static async login(email: string, password: string) {
    const result = await auth.loginWithPassword(email, password)
    
    if (result.success) {
      // Store user data in your app state
      localStorage.setItem('user', JSON.stringify(result.user))
      return { success: true, user: result.user }
    } else {
      return { success: false, error: result.error }
    }
  }

  static async register(
    email: string, 
    password: string, 
    passwordConfirm: string,
    extraData?: Record<string, unknown>
  ) {
    const result = await auth.registerWithPassword(
      email, 
      password, 
      passwordConfirm, 
      extraData
    )
    
    if (result.success) {
      localStorage.setItem('user', JSON.stringify(result.user))
      return { success: true, user: result.user }
    } else {
      return { success: false, error: result.error }
    }
  }

  static async logout() {
    const result = await auth.logout()
    
    if (result.success) {
      localStorage.removeItem('user')
      return { success: true }
    } else {
      return { success: false, error: result.error }
    }
  }

  static getCurrentUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  static isAuthenticated() {
    return auth.isAuthenticated
  }
}
```

## React Integration Example

```tsx
import { useState, useEffect } from 'react'
import { auth } from '@/lib/pocketbase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated
    if (auth.isAuthenticated) {
      setUser(auth.currentUser)
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const result = await auth.loginWithPassword(email, password)
    
    if (result.success) {
      setUser(result.user)
    }
    
    return result
  }

  const logout = async () => {
    const result = await auth.logout()
    
    if (result.success) {
      setUser(null)
    }
    
    return result
  }

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout
  }
}
```

## Error Handling

All authentication methods return a consistent response format:

```typescript
{
  success: boolean
  user?: UserRecord
  token?: string
  error?: string
}
```

- `success: true` - Operation completed successfully
- `success: false` - Operation failed, check `error` field
- `user` - User object (when available)
- `token` - Authentication token (when available)
- `error` - Error message string (when success is false)

## Session Persistence

The authentication system automatically:

1. **Saves** authentication state to `localStorage` when user logs in
2. **Loads** saved state when the application starts
3. **Clears** state when user logs out
4. **Handles** invalid/expired tokens gracefully

## Security Considerations

- Always use HTTPS in production
- Implement proper password strength validation
- Use secure password reset tokens with expiration
- Consider implementing rate limiting for authentication attempts
- Regularly refresh authentication tokens

## Migration from Old System

If you were using the previous PocketBase client:

**Old way:**
```typescript
import { pb } from '@/lib/pocketbase'

// Manual authentication handling
await pb.collection('users').authWithPassword(email, password)
```

**New way:**
```typescript
import { auth } from '@/lib/pocketbase'

// Use the authentication service
const result = await auth.loginWithPassword(email, password)
```

## Dependencies

- PocketBase SDK (already included)
- No additional dependencies required

## Browser Support

- Modern browsers with ES2020+ support
- LocalStorage API support required
- Fetch API support required
