package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/pocketbase/pocketbase/core"
)

// MattermostPost represents the structure for posting a message to Mattermost
type MattermostPost struct {
	ChannelID string   `json:"channel_id"`
	Message   string   `json:"message"`
	UserIDs   []string `json:"user_ids,omitempty"` // Optional field for user mentions
}

// MattermostResponse represents the response from Mattermost API
type MattermostResponse struct {
	ID         string `json:"id"`
	CreateAt   int64  `json:"create_at"`
	UpdateAt   int64  `json:"update_at"`
	DeleteAt   int64  `json:"delete_at"`
	IsPinned   bool   `json:"is_pinned"`
	UserID     string `json:"user_id"`
	ChannelID  string `json:"channel_id"`
	RootID     string `json:"root_id"`
	ParentID   string `json:"parent_id"`
	OriginalID string `json:"original_id"`
	Message    string `json:"message"`
	Type       string `json:"type"`
	Props      struct {
		FromWebhook string `json:"from_webhook"`
	} `json:"props"`
	Hashtags string `json:"hashtags"`
	Filename []struct {
		Name string `json:"name"`
	} `json:"filenames"`
}

// MattermostError represents error response from Mattermost API
type MattermostError struct {
	ID          string `json:"id"`
	Message     string `json:"message"`
	RequestedAt string `json:"requested_at"`
	StatusCode  int    `json:"status_code"`
	IsOAuth     bool   `json:"is_oauth"`
}

// PostMessageToMattermost sends a message to a Mattermost channel with optional user mentions
// Parameters:
//   - botToken: Bearer token for authentication
//   - channelID: ID of the channel to post to
//   - message: Message content
//   - usernames: List of usernames to mention in the message (e.g., ["@user1", "@user2"])
//
// Returns:
//   - *MattermostResponse: Response from Mattermost API
//   - error: Any error encountered during the request
func PostMessageToMattermost(channelID, message string, usernames []string) (*MattermostResponse, error) {
	// Construct the message with mentions
	finalMessage := message
	if len(usernames) > 0 {
		// Add @ symbol to each username
		var mentions []string
		for _, username := range usernames {
			mentions = append(mentions, fmt.Sprintf("@%s", username))
		}
		mentionsStr := strings.Join(mentions, " ")
		finalMessage = fmt.Sprintf("%s\n%s", mentionsStr, message)
	}

	// Create the request body
	postData := MattermostPost{
		ChannelID: channelID,
		Message:   finalMessage,
	}

	// Convert to JSON
	jsonData, err := json.Marshal(postData)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request data: %w", err)
	}

	// Create HTTP request
	apiUrl := fmt.Sprintf("%s%s", os.Getenv("MATTERMOST_SERVER_URL"), "/api/v4/posts")
	req, err := http.NewRequest("POST", apiUrl, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Set headers
	botToken := os.Getenv("MATTERMOST_BOT_TOKEN")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", botToken))
	req.Header.Set("Content-Type", "application/json")

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send HTTP request: %w", err)
	}
	defer resp.Body.Close()

	// Check response status
	if resp.StatusCode != http.StatusCreated {
		var errorResponse MattermostError
		if err := json.NewDecoder(resp.Body).Decode(&errorResponse); err != nil {
			return nil, fmt.Errorf("request failed with status %d, failed to decode error response: %w", resp.StatusCode, err)
		}
		return nil, fmt.Errorf("request failed with status %d: %s", resp.StatusCode, errorResponse.Message)
	}

	// Decode successful response
	var response MattermostResponse
	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &response, nil
}

// Handle Mattermost post request
func HandleMattermostPost(c *core.RequestEvent) error {
	var requestBody struct {
		ChannelID string   `json:"channel_id"`
		Message   string   `json:"message"`
		Usernames []string `json:"usernames"`
	}

	// Bind request body
	if err := c.BindBody(&requestBody); err != nil {
		return c.JSON(400, map[string]string{
			"error": "Invalid request body",
		})
	}

	// Validate required fields
	if requestBody.ChannelID == "" || requestBody.Message == "" {
		return c.JSON(400, map[string]string{
			"error": "Missing required fields:  channel_id, message are required",
		})
	}

	// Call the Mattermost notification function
	response, err := PostMessageToMattermost(
		requestBody.ChannelID,
		requestBody.Message,
		requestBody.Usernames,
	)

	if err != nil {
		return c.JSON(500, map[string]string{
			"error":   "Failed to post message to Mattermost",
			"details": err.Error(),
		})
	}

	// Return success response
	return c.JSON(200, map[string]interface{}{
		"success": true,
		"message": "Message posted successfully to Mattermost",
		"data": map[string]string{
			"message_id": response.ID,
			"channel_id": response.ChannelID,
			"created_at": fmt.Sprintf("%d", response.CreateAt),
		},
	})
}
