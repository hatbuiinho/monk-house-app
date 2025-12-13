package main

import (
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
		Name:  "oauth_state",
		Value: state,
		Path:  "/",
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

	// Generate PocketBase auth token using superuser impersonation
	authToken, err := generatePocketBaseAuthToken(app, user["email"].(string))
	if err != nil {
		log.Printf("Failed to generate auth token: %v", err)
		return c.JSON(500, AuthResponse{
			Success: false,
			Error:   "Failed to generate authentication token",
		})
	}

	// Clear OAuth state cookie
	c.SetCookie(&http.Cookie{
		Name:   "oauth_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	// Return success response
	return c.JSON(200, AuthResponse{
		Success: true,
		User:    user,
		Token:   authToken,
	})
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
		userRecord.Set("id", mmUser.ID)
		log.Println("ID của mattermost là ======= %s", mmUser.ID)
		userRecord.Set("email", mmUser.Email)
		userRecord.Set("name", fmt.Sprintf("%s %s", mmUser.FirstName, mmUser.LastName))
		userRecord.Set("username", mmUser.Username)
		userRecord.Set("avatar", mmUser.AvatarURL)
		userRecord.Set("status", "active")
		userRecord.Set("role", "member")
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
	user := map[string]interface{}{
		"id":       userRecord.Id,
		"email":    userRecord.GetString("email"),
		"name":     userRecord.GetString("name"),
		"username": userRecord.GetString("username"),
		"avatar":   userRecord.GetString("avatar"),
	}

	return user, nil
}

// Generate PocketBase auth token using superuser impersonation
func generatePocketBaseAuthToken(app *pocketbase.PocketBase, email string) (string, error) {
	// Authenticate as superuser
	// superuserEmail := os.Getenv("POCKETBASE_SUPERUSER_EMAIL")
	// superuserPassword := os.Getenv("POCKETBASE_SUPERUSER_PASSWORD")

	// if superuserEmail == "" || superuserPassword == "" {
	// 	return "", fmt.Errorf("superuser credentials not configured")
	// }
	authUser, err := app.FindAuthRecordByEmail("users", email)
	if err != nil {
		log.Println("find auth %s, user id: %s", err, email)
	}
	// For this implementation, we'll use a simplified approach
	// that generates a token representing an impersonated user session
	// This demonstrates the impersonation concept without requiring
	// complex PocketBase internal API usage

	// Create a token that represents an impersonated user session
	// Format: pb_impersonation_<userID>_<timestamp>_<duration>
	token, err2 := authUser.NewAuthToken()
	if err2 != nil {
		log.Println("create auth %s", err)
	}
	fmt.Sprintf("pb_impersonation_%s_%d_3600", email, token)

	return token, nil
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
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
