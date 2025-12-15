# Integration Guide: Mattermost OAuth2 với PocketBase

## Summary

Đã hoàn thành việc tích hợp Mattermost OAuth2 với PocketBase. Solution bao gồm:

1. **Backend OAuth2 Server** (`be/pb/main.go`)
2. **Frontend Authentication Service** (`fe/src/lib/mattermost-oauth.ts`)
3. **React Components** (`fe/src/components/auth/mattermost-login-button.tsx`)
4. **Configuration & Documentation**

## Architecture

```
┌─────────────┐    OAuth2 Flow    ┌──────────────┐    Sync User    ┌─────────────┐
│   Frontend  │ ───────────────►  │  Backend PB  │ ──────────────► │   PocketBase│
│  (React)    │                   │  (Go)        │                 │   Database  │
└─────────────┘                   └──────────────┘                 └─────────────┘
        │                                  │                                │
        │                                  │                                │
        ▼                                  ▼                                ▼
   PocketBase Auth                 Mattermost OAuth2                User Records
```

## Implementation Details

### 1. Backend (PocketBase Go)

**File**: `be/pb/main.go`

**Features**:
- OAuth2 endpoints: `/api/auth/mattermost/login` và `/api/auth/mattermost/callback`
- User mapping logic từ Mattermost → PocketBase
- Auto-create user nếu chưa có
- Session management
- CSRF protection với state parameter

**Key Functions**:
- `handleMattermostLogin()`: Redirect user đến Mattermost
- `handleMattermostCallback()`: Xử lý OAuth2 callback
- `mapMattermostUserToPocketBase()`: Map user data
- `generatePocketBaseAuthToken()`: Generate auth token

### 2. Frontend Service

**File**: `fe/src/lib/mattermost-oauth.ts`

**Features**:
- Mattermost OAuth2 client
- User authentication flow
- PocketBase integration
- Session management
- Error handling

**Key Methods**:
- `loginWithMattermost()`: Complete OAuth2 flow
- `isMattermostAuthenticated()`: Check auth status
- `getMattermostUser()`: Get current user
- `logout()`: Sign out

### 3. React Components

**File**: `fe/src/components/auth/mattermost-login-button.tsx`

**Features**:
- Pre-built Mattermost login button
- Authentication state management
- User-friendly error handling
- Reusable components

**Components**:
- `MattermostLoginButton`: Standalone button
- `useMattermostAuth()`: React hook
- `MattermostAuthDemo`: Demo component

## Usage Examples

### 1. Simple Login Button

```tsx
import { MattermostLoginButton } from '@/components/auth/mattermost-login-button'

function LoginPage() {
  const handleSuccess = (user) => {
    console.log('User logged in:', user)
    // Redirect to dashboard
  }

  const handleError = (error) => {
    console.error('Login failed:', error)
  }

  return (
    <MattermostLoginButton 
      onSuccess={handleSuccess}
      onError={handleError}
      showCard={true}
    />
  )
}
```

### 2. Using Auth Hook

```tsx
import { useMattermostAuth } from '@/components/auth/mattermost-login-button'

function App() {
  const { user, isAuthenticated, login, logout } = useMattermostAuth()

  if (!isAuthenticated) {
    return <button onClick={login}>Sign in with Mattermost</button>
  }

  return (
    <div>
      <p>Welcome, {user.name}!</p>
      <button onClick={logout}>Sign out</button>
    </div>
  )
}
```

### 3. Direct Service Usage

```typescript
import { mattermostAuth } from '@/lib/mattermost-oauth'

async function handleLogin() {
  const result = await mattermostAuth.loginWithMattermost()
  
  if (result.success) {
    console.log('Logged in:', result.user)
  } else {
    console.error('Login failed:', result.error)
  }
}
```

## Configuration

### 1. Environment Variables

**Backend** (`be/pb/.env`):
```bash
MATTERMOST_CLIENT_ID=your_client_id
MATTERMOST_CLIENT_SECRET=your_client_secret
MATTERMOST_SERVER_URL=https://your-mattermost.com
MATTERMOST_REDIRECT_URI=http://localhost:8090/api/auth/mattermost/callback
POCKETBASE_SUPERUSER_EMAIL=admin@monk.house
POCKETBASE_SUPERUSER_PASSWORD=secure_password
```

**Frontend** (`fe/.env`):
```bash
VITE_POCKETBASE_URL=http://localhost:8090
```

### 2. Mattermost App Setup

1. Go to Mattermost System Console
2. Enable OAuth 2.0 service
3. Create new OAuth2 app
4. Set callback URLs:
   - Development: `http://localhost:5173/api/auth/mattermost/callback`
   - Production: `https://yourdomain.com/api/auth/mattermost/callback`

## User Data Mapping

| Mattermost | PocketBase | Description |
|------------|------------|-------------|
| `id` | `mattermost_id` | Unique Mattermost ID |
| `email` | `email` | Primary identifier |
| `first_name + last_name` | `name` | Full name |
| `username` | `username` | Username |
| `avatar_url` | `avatar` | Profile picture |
| - | `status` | `active` (auto-set) |
| - | `role` | `member` (auto-set) |

## Security Features

1. **CSRF Protection**: State parameter validation
2. **Token Security**: OAuth2 tokens không được lưu ở frontend
3. **User Mapping**: Email là primary key để avoid duplicate users
4. **Session Management**: Automatic token refresh
5. **Error Handling**: Comprehensive error messages

## Testing

### 1. Mock Testing (Development)

```bash
# Test backend without Mattermost
curl -X POST http://localhost:8090/api/auth/test

# Response:
{
  "success": true,
  "user": { "id": "test-user-123", "email": "test@example.com" },
  "token": "test-token-123"
}
```

### 2. Full OAuth2 Testing

1. Configure Mattermost OAuth2 app
2. Set environment variables
3. Click "Sign in with Mattermost" button
4. Complete OAuth2 flow in Mattermost
5. User should be automatically logged in

## Integration với Existing App

### 1. Update Auth Store

Thêm Mattermost auth vào existing auth system:

```typescript
// src/stores/auth-store.ts
import { mattermostAuth } from '@/lib/mattermost-oauth'

export const useAuthStore = create((set, get) => ({
  // Existing state...
  
  // Mattermost auth methods
  loginWithMattermost: async () => {
    const result = await mattermostAuth.loginWithMattermost()
    if (result.success) {
      set({ user: result.user, isAuthenticated: true })
    }
    return result
  },
  
  logoutMattermost: async () => {
    await mattermostAuth.logout()
    set({ user: null, isAuthenticated: false })
  }
}))
```

### 2. Add Login Option

Update existing login components:

```tsx
// src/features/auth/sign-in/index.tsx
import { MattermostLoginButton } from '@/components/auth/mattermost-login-button'

export default function SignInPage() {
  return (
    <div className="space-y-4">
      {/* Existing password login */}
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      
      {/* Mattermost OAuth2 */}
      <MattermostLoginButton 
        onSuccess={(user) => navigate('/dashboard')}
        variant="outline"
        className="w-full"
      />
    </div>
  )
}
```

## Benefits

✅ **Seamless Integration**: Works với existing PocketBase auth system
✅ **User-Friendly**: One-click login với Mattermost
✅ **Secure**: Proper OAuth2 implementation với CSRF protection
✅ **Flexible**: Có thể thêm OAuth2 providers khác
✅ **Maintainable**: Tận dụng PocketBase ecosystem
✅ **Production-Ready**: Comprehensive error handling và logging

## Next Steps

1. **Test OAuth2 Flow**: Setup Mattermost app và test
2. **Customize UI**: Style Mattermost login button theo app design
3. **Add More Providers**: Extend với GitHub, Google, etc.
4. **Team Sync**: Sync Mattermost team membership
5. **Profile Updates**: Auto-sync user profile changes

## Files Created

1. **Backend**:
   - `be/pb/main.go` - OAuth2 server implementation
   - `be/pb/.env.example` - Environment configuration template

2. **Frontend**:
   - `fe/src/lib/mattermost-oauth.ts` - OAuth2 client service
   - `fe/src/components/auth/mattermost-login-button.tsx` - React components

3. **Documentation**:
   - `docs/mattermost-oauth2-integration.md` - Architecture overview
   - `fe/MATTERMOST_OAUTH_SETUP.md` - Setup guide
   - `docs/implementation-guide.md` - Integration guide (this file)

Solution đã sẵn sàng để sử dụng và có thể integrate ngay vào existing application!
