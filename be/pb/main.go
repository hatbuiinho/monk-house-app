package main

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/tools/types"
)

// OAuth2 Structures
type MattermostConfig struct {
	ClientID     string
	ClientSecret string
	ServerURL    string
	RedirectURI  string
}

type MattermostUser struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	Username    string `json:"username"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	Locale      string `json:"locale"`
	Timezone    any    `json:"timezone"`
	DeleteAt    int64  `json:"delete_at"`
	CreateAt    int64  `json:"create_at"`
	UpdateAt    int64  `json:"update_at"`
}

type OAuthTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

type AuthResponse struct {
	Success  bool                   `json:"success"`
	User     map[string]interface{} `json:"user,omitempty"`
	Token    string                 `json:"token,omitempty"`
	Error    string                 `json:"error,omitempty"`
	Redirect string                 `json:"redirect,omitempty"`
}

func main() {
	// Load .env
	_ = godotenv.Load()

	// Read version from ENV
	version := os.Getenv("VERSION")
	if version == "" {
		version = "unknown"
	}

	app := pocketbase.New()

	// fires only for "tasks" collections
	app.OnRecordCreateRequest("tasks").BindFunc(func(e *core.RecordRequestEvent) error {
		if !e.Auth.IsSuperuser() {
			e.Record.Set("createdBy", e.Auth.Id)
		}
		return e.Next()
	})

	// fires only for "tasks" collections
	app.OnRecordUpdateRequest("tasks").BindFunc(func(e *core.RecordRequestEvent) error {
		if !e.Auth.IsSuperuser() {
			e.Record.Set("updatedBy", e.Auth.Id)
		}
		return e.Next()
	})

	// Mattermost OAuth2 Routes
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		log.Println("PocketBase server starting with Mattermost OAuth2 integration...")

		// OAuth2 Login Route - Redirect to Mattermost
		e.Router.GET("/api/auth/mattermost/login", func(c *core.RequestEvent) error {
			return handleMattermostLogin(c, app)
		})

		// OAuth2 Callback Route - Handle Mattermost response
		e.Router.GET("/api/auth/mattermost/callback", func(c *core.RequestEvent) error {
			return handleMattermostCallback(c, app)
		})

		e.Router.POST("/api/auth/exchange", func(c *core.RequestEvent) error {
			return handleOAuthExchange(c, app)
		})

		// Health check
		e.Router.GET("/health", func(c *core.RequestEvent) error {
			return c.JSON(200, map[string]string{"status": "ok"})
		})

		// Version endpoint
		e.Router.GET("/version", func(c *core.RequestEvent) error {
			return c.JSON(200, map[string]string{
				"version": version,
			})
		})

		// Existing hello route
		e.Router.GET("/hello", func(c *core.RequestEvent) error {
			return c.String(200, "Hello world!")
		}).Bind(apis.RequireAuth())

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// Handle Mattermost OAuth2 Login
func handleMattermostLogin(c *core.RequestEvent, app *pocketbase.PocketBase) error {
	config := getMattermostConfig()

	// Generate state for CSRF protection
	state := generateState()

	// Store state in session/cookie (simplified for demo)
	// In production, use proper session management
	c.SetCookie(&http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	// Build Mattermost OAuth2 URL
	authURL := fmt.Sprintf("%s/oauth/authorize", config.ServerURL)
	params := url.Values{
		"client_id":     {config.ClientID},
		"redirect_uri":  {config.RedirectURI},
		"response_type": {"code"},
		"scope":         {"read"},
		"state":         {state},
	}

	redirectURL := fmt.Sprintf("%s?%s", authURL, params.Encode())

	return c.Redirect(302, redirectURL)
}

// Handle Mattermost OAuth2 Callback
func handleMattermostCallback(c *core.RequestEvent, app *pocketbase.PocketBase) error {
	// Get query parameters correctly
	queryParams := c.Request.URL.Query()
	code := queryParams.Get("code")
	state := queryParams.Get("state")

	// Verify state (CSRF protection)
	cookie, err := c.Request.Cookie("oauth_state")
	if err != nil || cookie.Value != state {
		return c.JSON(400, AuthResponse{
			Success: false,
			Error:   "Invalid state parameter",
		})
	}

	// Exchange code for token
	token, err := exchangeCodeForToken(code)
	if err != nil {
		log.Printf("Token exchange failed: %v", err)
		return c.JSON(400, AuthResponse{
			Success: false,
			Error:   "Failed to exchange authorization code",
		})
	}

	// Get user info from Mattermost
	mmUser, err := getMattermostUser(token.AccessToken)
	if err != nil {
		log.Printf("Failed to get Mattermost user: %v", err)
		return c.JSON(400, AuthResponse{
			Success: false,
			Error:   "Failed to get user information",
		})
	}

	// Map Mattermost user to PocketBase user
	user, err := mapMattermostUserToPocketBase(app, mmUser)
	if err != nil {
		log.Printf("Failed to map user to PocketBase: %v", err)
		return c.JSON(500, AuthResponse{
			Success: false,
			Error:   "Failed to create user account",
		})
	}

	// Clear OAuth state cookie
	c.SetCookie(&http.Cookie{
		Name:     "oauth_state",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	})

	collection, err := app.FindCollectionByNameOrId("oauth_sessions")
	if err != nil {
		return c.JSON(500, map[string]string{
			"error": "oauth sessions collection not found",
		})
	}

	frontendURL := os.Getenv("APP_URL")

	existingSession, _ := app.FindFirstRecordByFilter(
		collection,
		"state = {:state}",
		dbx.Params{"state": state},
	)

	if existingSession != nil {
		// Đã xử lý callback này rồi → chỉ redirect lại FE
		redirectURL := fmt.Sprintf("%s/oauth/callback?code=%s",
			frontendURL,
			url.QueryEscape(existingSession.GetString("code")),
		)
		return c.Redirect(302, redirectURL)
	}

	exchangeCode, err := createOAuthSession(app, user["id"].(string), state)
	if err != nil {
		return c.JSON(500, map[string]string{
			"error": "failed to create oauth session",
		})
	}

	redirectURL := fmt.Sprintf(
		"%s/oauth/callback?code=%s",
		frontendURL,
		url.QueryEscape(exchangeCode),
	)

	return c.Redirect(http.StatusFound, redirectURL)
}

// Exchange authorization code for access token
func exchangeCodeForToken(code string) (*OAuthTokenResponse, error) {
	config := getMattermostConfig()

	tokenURL := fmt.Sprintf("%s/oauth/access_token", config.ServerURL)

	data := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {config.ClientID},
		"client_secret": {config.ClientSecret},
		"code":          {code},
		"redirect_uri":  {config.RedirectURI},
	}

	resp, err := http.PostForm(tokenURL, data)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var token OAuthTokenResponse
	if err := json.Unmarshal(body, &token); err != nil {
		return nil, err
	}

	log.Printf("Code exchange ======: %v", token)

	return &token, nil
}

// Get user information from Mattermost
func getMattermostUser(accessToken string) (*MattermostUser, error) {
	config := getMattermostConfig()

	userURL := fmt.Sprintf("%s/api/v4/users/me", config.ServerURL)

	req, err := http.NewRequest("GET", userURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API request failed with status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var user MattermostUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

// Map Mattermost user to PocketBase user
func mapMattermostUserToPocketBase(app *pocketbase.PocketBase, mmUser *MattermostUser) (map[string]interface{}, error) {
	// Use PocketBase's built-in API to find or create user
	// This is a simplified implementation that demonstrates the database saving

	// Try to find existing user by email using PocketBase API
	collection, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return nil, fmt.Errorf("failed to find users collection: %v", err)
	}

	// Create a query to find existing user
	// existingRecords := []*models.Record{}
	// existingRecords := core.NewRecord(collection)
	existingRecord, err := app.FindFirstRecordByFilter(collection, "email = {:email}", dbx.Params{"email": mmUser.Email})
	// if err := app.DB().NewQuery(collection).
	// 	AndWhere(dbx.HashExp{"email": mmUser.Email}).
	// 	All(&existingRecords); err != nil {
	// 	return nil, fmt.Errorf("failed to query existing users: %v", err)
	// }

	userRecord := core.NewRecord(collection)

	if existingRecord != nil {
		// Update existing user
		userRecord = existingRecord
		userRecord.Set("name", fmt.Sprintf("%s %s", mmUser.FirstName, mmUser.LastName))
		userRecord.Set("username", mmUser.Username)
		userRecord.Set("avatar", mmUser.AvatarURL)
		userRecord.Set("updated", types.NowDateTime())

		if err := app.Save(userRecord); err != nil {
			return nil, fmt.Errorf("failed to update user: %v", err)
		}
	} else {
		// Create new user
		// userRecord = core.NewRecord(collection)
		roleIds, err := getRoleIdsByCodes(app, []string{"member"})
		if err != nil {
			return nil, err
		}

		userRecord.Set("id", mmUser.ID)
		userRecord.Set("email", mmUser.Email)
		userRecord.Set("name", fmt.Sprintf("%s %s", mmUser.FirstName, mmUser.LastName))
		userRecord.Set("username", mmUser.Username)
		userRecord.Set("avatar", mmUser.AvatarURL)
		userRecord.Set("status", "active")
		userRecord.Set("roles", roleIds)
		userRecord.Set("phoneNumber", "")
		userRecord.Set("created", types.NowDateTime())
		userRecord.Set("updated", types.NowDateTime())
		userRecord.Set("password", "tonkinhPhat1A@")
		userRecord.Set("verified", true)

		if err := app.Save(userRecord); err != nil {
			return nil, fmt.Errorf("failed to create user: %v", err)
		}
	}

	// Return user data
	user := map[string]any{
		"id":       userRecord.Id,
		"email":    userRecord.GetString("email"),
		"name":     userRecord.GetString("name"),
		"username": userRecord.GetString("username"),
		"avatar":   userRecord.GetString("avatar"),
		"role":     userRecord.GetString("role"),
	}

	return user, nil
}

// Get Mattermost configuration from environment
func getMattermostConfig() MattermostConfig {
	return MattermostConfig{
		ClientID:     os.Getenv("MATTERMOST_CLIENT_ID"),
		ClientSecret: os.Getenv("MATTERMOST_CLIENT_SECRET"),
		ServerURL:    os.Getenv("MATTERMOST_SERVER_URL"),
		RedirectURI:  os.Getenv("MATTERMOST_REDIRECT_URI"),
	}
}

// Generate random state for CSRF protection
func generateState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

func createOAuthSession(
	app *pocketbase.PocketBase,
	userId string,
	state string,
) (string, error) {

	collection, err := app.FindCollectionByNameOrId("oauth_sessions")
	if err != nil {
		return "", err
	}

	code := generateState()

	record := core.NewRecord(collection)
	record.Set("code", code)
	record.Set("user", userId)
	record.Set("used", false)
	record.Set("state", state)
	record.Set("expiresAt", time.Now().Add(2*time.Minute))

	if err := app.Save(record); err != nil {
		return "", err
	}

	return code, nil
}

func handleOAuthExchange(c *core.RequestEvent, app *pocketbase.PocketBase) error {
	var body struct {
		Code string `json:"code"`
	}

	if err := c.BindBody(&body); err != nil {
		return c.JSON(400, map[string]string{"error": "invalid request"})
	}

	collection, _ := app.FindCollectionByNameOrId("oauth_sessions")

	session, err := app.FindFirstRecordByFilter(
		collection,
		"code = {:code} && used = false",
		dbx.Params{"code": body.Code},
	)
	if err != nil {
		return c.JSON(400, map[string]string{"error": "invalid code"})
	}

	expires := session.GetDateTime("expiresAt")
	if expires.Time().Before(time.Now()) {
		return c.JSON(400, map[string]string{"error": "code expired"})
	}

	userId := session.GetString("user")
	user, err := app.FindRecordById("users", userId)

	if err != nil {
		return c.JSON(400, map[string]string{"error": "user not found"})
	}

	errs := app.ExpandRecord(user, []string{"roles"}, nil)
	if len(errs) > 0 {
		return fmt.Errorf("failed to expand: %v", errs)
	}

	roles := []map[string]string{}

	for _, r := range user.ExpandedAll("roles") {
		roles = append(roles, map[string]string{
			"id":   r.Id,
			"name": r.GetString("name"),
			"code": r.GetString("code"),
		})
	}

	token, err := user.NewAuthToken()
	if err != nil {
		return c.JSON(500, map[string]string{"error": "token error"})
	}

	session.Set("used", true)
	_ = app.Save(session)

	userInfo := map[string]interface{}{
		"id":       user.Id,
		"email":    user.GetString("email"),
		"name":     user.GetString("name"),
		"username": user.GetString("username"),
		"avatar":   user.GetString("avatar"),
		"roles":    roles,
	}

	// Return success response
	return c.JSON(200, AuthResponse{
		Success: true,
		User:    userInfo,
		Token:   token,
	})
}

func getRoleIdsByCodes(app *pocketbase.PocketBase, codes []string) ([]string, error) {
	collection, err := app.FindCollectionByNameOrId("roles")
	if err != nil {
		return nil, err
	}

	var ids []string
	for _, code := range codes {
		record, err := app.FindFirstRecordByFilter(
			collection,
			"code = {:code}",
			dbx.Params{"code": code},
		)
		if err != nil {
			return nil, fmt.Errorf("role not found: %s", code)
		}
		ids = append(ids, record.Id)
	}

	return ids, nil
}
