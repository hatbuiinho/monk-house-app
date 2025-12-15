# Mattermost OAuth2 Integration với PocketBase

## Architecture Overview

```
Mattermost OAuth2 → PocketBase Backend → PocketBase Auth Token → Frontend
       ↓                    ↓                        ↓              ↓
  Get User Info      Map/Create PB User        Generate Token    React App
```

## Solution Design

### 1. Authentication Flow

1. **Frontend** redirect user to Mattermost OAuth2
2. **Mattermost** returns authorization code
3. **Backend** exchange code for access token + user info
4. **Backend** tìm hoặc tạo PocketBase user
5. **Backend** dùng superuser để impersonate user và generate token
6. **Frontend** nhận PocketBase token và sử dụng như bình thường

### 2. User Mapping Strategy

- **Primary Key**: Mattermost User ID
- **Unique Field**: Email address
- **Sync Fields**: name, username, avatar từ Mattermost
- **Auto-create**: Nếu user chưa có trong PocketBase

### 3. Security Model

- Backend giữ Mattermost OAuth2 credentials
- Frontend chỉ nhận PocketBase token
- Superuser impersonation để quản lý session
- Automatic token refresh mechanism

## Implementation Components

### Backend (PocketBase Go)

1. **OAuth2 Endpoints**:
   - `GET /auth/mattermost/login` - Redirect to Mattermost
   - `GET /auth/mattermost/callback` - Handle OAuth callback

2. **User Service**:
   - Map Mattermost user → PocketBase user
   - Auto-create missing users
   - Sync user data

3. **Impersonation Service**:
   - Use superuser to generate auth tokens
   - Session management
   - Token refresh handling

### Frontend (React/TypeScript)

1. **OAuth2 Handler**:
   - Handle redirect flow
   - Exchange authorization code for PocketBase token

2. **Auth Integration**:
   - Extend existing PocketBase auth system
   - Add Mattermost login button
   - Handle token refresh

## Environment Variables

```bash
# Mattermost OAuth2
MATTERMOST_CLIENT_ID=your_client_id
MATTERMOST_CLIENT_SECRET=your_client_secret
MATTERMOST_SERVER_URL=https://your-mattermost.com
MATTERMOST_REDIRECT_URI=http://localhost:8090/api/auth/mattermost/callback

# PocketBase
POCKETBASE_SUPERUSER_EMAIL=admin@monk.house
POCKETBASE_SUPERUSER_PASSWORD=super_secure_password

# App
APP_URL=http://localhost:5173
```

## Benefits

✅ **Secure**: OAuth2 credentials stay on backend
✅ **Seamless**: Frontend sử dụng PocketBase auth như bình thường
✅ **Flexible**: Có thể thêm OAuth2 providers khác
✅ **Maintainable**: Tận dụng PocketBase ecosystem
✅ **Scalable**: Support multiple users và teams

## Next Steps

1. Setup Mattermost OAuth2 app
2. Implement backend endpoints
3. Update frontend integration
4. Test authentication flow
5. Add session management
