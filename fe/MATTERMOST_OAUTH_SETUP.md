# Mattermost OAuth2 Integration Setup Guide

This guide will help you set up Mattermost OAuth2 integration with your PocketBase application.

## Prerequisites

1. **Mattermost Server**: You need access to a Mattermost server with OAuth2 enabled
2. **PocketBase**: Your PocketBase backend with user collection
3. **Frontend**: React/TypeScript application

## Step 1: Configure Mattermost OAuth2 App

### 1.1 Create OAuth2 App in Mattermost

1. Go to your Mattermost server's System Console
2. Navigate to **OAuth 2.0** → **OAuth 2.0 Service**
3. Enable OAuth 2.0 service
4. Add a new OAuth2 application with these settings:

```json
{
  "name": "Your App Name",
  "description": "Description of your app",
  "icon_url": "https://your-domain.com/icon.png",
  "homepage": "https://your-domain.com",
  "allowed_origins": "https://your-domain.com",
  "callback_urls": [
    "https://your-domain.com/api/auth/mattermost/callback",
    "http://localhost:5173/api/auth/mattermost/callback"
  ],
  "trusted": false,
  "user_read": true,
  "user_invite": false,
  "user_read_only": true
}
```

### 1.2 Get OAuth2 Credentials

After creating the app, you'll receive:

- **Client ID**: `xxxxxxxxxxxxxxxxxx`
- **Client Secret**: `xxxxxxxxxxxxxxxxxx`

## Step 2: Configure Environment Variables

### 2.1 Backend Configuration (PocketBase)

Create `.env` file in `be/pb/`:

```bash
# Mattermost OAuth2 Configuration
MATTERMOST_CLIENT_ID=your_actual_client_id_here
MATTERMOST_CLIENT_SECRET=your_actual_client_secret_here
MATTERMOST_SERVER_URL=https://your-mattermost-server.com
MATTERMOST_REDIRECT_URI=http://localhost:8090/api/auth/mattermost/callback

# PocketBase Configuration
POCKETBASE_SUPERUSER_EMAIL=admin@monk.house
POCKETBASE_SUPERUSER_PASSWORD=your_super_secure_password

# Application Configuration
VERSION=1.0.0
APP_URL=http://localhost:5173
```

### 2.2 Frontend Configuration

Update `fe/.env`:

```bash
VITE_POCKETBASE_URL=http://localhost:8090
VITE_APP_URL=http://localhost:5173
```

## Step 3: Start the Application

### 3.1 Start PocketBase Backend

```bash
cd be/pb
go run main.go
```

The backend will be available at `http://localhost:8090`

### 3.2 Start Frontend

```bash
cd fe
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Step 4: Test the Integration

### 4.1 Test Backend Endpoints

```bash
# Test OAuth2 configuration
curl http://localhost:8090/api/auth/mattermost/login

# Test OAuth2 flow
curl -X POST http://localhost:8090/api/auth/test
```

### 4.2 Test Frontend Integration

1. Navigate to `http://localhost:5173`
2. Look for "Sign in with Mattermost" button
3. Click to test the OAuth2 flow

## Step 5: User Data Mapping

The integration maps these Mattermost user fields to PocketBase:

| Mattermost Field | PocketBase Field | Description |
|------------------|------------------|-------------|
| `id` | `mattermost_id` | Mattermost user ID |
| `email` | `email` | User email (primary key) |
| `first_name + last_name` | `name` | Full name |
| `username` | `username` | Username |
| `avatar_url` | `avatar` | Profile picture URL |
| `locale` | `locale` | User language |
| `timezone` | `timezone` | User timezone |

## Step 6: Security Considerations

### 6.1 CSRF Protection

- OAuth2 flow includes state parameter for CSRF protection
- State is validated on callback

### 6.2 Token Security

- Mattermost access tokens are not stored in frontend
- Only PocketBase auth tokens are used for API calls
- Tokens are stored securely in localStorage

### 6.3 User Data Protection

- Only necessary user data is synced from Mattermost
- Sensitive tokens are handled server-side only

## Step 7: Production Deployment

### 7.1 Environment Configuration

Update production environment variables:

```bash
# Production Mattermost OAuth2
MATTERMOST_CLIENT_ID=production_client_id
MATTERMOST_CLIENT_SECRET=production_client_secret
MATTERMOST_SERVER_URL=https://mattermost.yourcompany.com
MATTERMOST_REDIRECT_URI=https://yourdomain.com/api/auth/mattermost/callback

# Production PocketBase
POCKETBASE_SUPERUSER_EMAIL=admin@yourdomain.com
POCKETBASE_SUPERUSER_PASSWORD=production_super_password
```

### 7.2 HTTPS Configuration

Ensure all URLs use HTTPS in production:

- Mattermost server: `https://mattermost.yourcompany.com`
- Redirect URI: `https://yourdomain.com/api/auth/mattermost/callback`
- Frontend: `https://yourdomain.com`

### 7.3 CORS Configuration

Update Mattermost app settings to include your production domain:

```json
{
  "allowed_origins": "https://yourdomain.com,https://app.yourdomain.com"
}
```

## Troubleshooting

### Common Issues

1. **OAuth2 Configuration Error**

   ```
   Error: Missing authorization code
   ```

   - Check Mattermost app configuration
   - Verify redirect URI matches exactly

2. **Network Error**

   ```
   Failed to exchange authorization code
   ```

   - Check CORS settings in Mattermost
   - Verify server URL is correct

3. **User Creation Failed**

   ```
   Failed to create user account
   ```

   - Check PocketBase user collection schema
   - Verify required fields are mapped correctly

### Debug Mode

Enable debug logging in PocketBase:

```bash
LOG_LEVEL=debug
```

### Testing with Mock Data

For development, the system includes mock OAuth2 flow:

```bash
# This will simulate successful OAuth2 without Mattermost
curl -X POST http://localhost:8090/api/auth/test
```

## API Reference

### Backend Endpoints

- `GET /api/auth/mattermost/login` - Start OAuth2 flow
- `GET /api/auth/mattermost/callback` - Handle OAuth2 callback
- `POST /api/auth/test` - Test endpoint with mock data

### Frontend API

```typescript
import { mattermostAuth } from '@/lib/mattermost-oauth'

// Login with Mattermost
const result = await mattermostAuth.loginWithMattermost()

// Check authentication status
const isAuth = mattermostAuth.isMattermostAuthenticated()

// Get current user
const user = mattermostAuth.getMattermostUser()

// Logout
await mattermostAuth.logout()
```

## Next Steps

1. **Customize User Fields**: Add additional Mattermost fields to PocketBase
2. **Team Sync**: Sync Mattermost team membership
3. **Profile Sync**: Automatic profile updates
4. **Session Management**: Extended token refresh handling
5. **Multiple Providers**: Add other OAuth2 providers (GitHub, Google, etc.)
