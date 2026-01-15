package mattermost

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/pocketbase/pocketbase/core"
	"github.com/xuri/excelize/v2"
)

type createUserPayload struct {
	Email       string `json:"email"`
	Username    string `json:"username"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name,omitempty"`
	LastName    string `json:"last_name,omitempty"`
	Locale      string `json:"locale,omitempty"`
	Nickname    string `json:"nickname,omitempty"`
	Position    string `json:"position,omitempty"`
	AuthService string `json:"auth_service,omitempty"`
	AuthData    string `json:"auth_data,omitempty"`
	Timezone    string `json:"timezone,omitempty"`
}

type mattermostUserResponse struct {
	ID string `json:"id"`
}

type mattermostErrorResponse struct {
	Message    string `json:"message"`
	ID         string `json:"id"`
	StatusCode int    `json:"status_code"`
}

type importRowResult struct {
	Row      int    `json:"row"`
	Email    string `json:"email,omitempty"`
	Username string `json:"username,omitempty"`
	UserID   string `json:"user_id,omitempty"`
	Error    string `json:"error,omitempty"`
}

func HandleMattermostImportUsers(c *core.RequestEvent) error {
	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid multipart form"})
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing file field"})
	}
	defer file.Close()

	f, err := excelize.OpenReader(file)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid excel file"})
	}
	defer f.Close()

	sheet := f.GetSheetName(0)
	if sheet == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "no sheet found in excel"})
	}

	rows, err := f.GetRows(sheet)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "failed to read excel rows"})
	}
	if len(rows) < 2 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "excel file has no data rows"})
	}

	header := buildHeaderIndex(rows[0])
	if len(header) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "missing header row"})
	}

	serverURL := strings.TrimRight(os.Getenv("MATTERMOST_SERVER_URL"), "/")
	if serverURL == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_SERVER_URL is not set"})
	}

	token := os.Getenv("MATTERMOST_BOT_TOKEN")
	if token == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_BOT_TOKEN is not set"})
	}

	client := &http.Client{Timeout: 15 * time.Second}
	results := make([]importRowResult, 0, len(rows)-1)
	createdCount := 0

	for i := 1; i < len(rows); i++ {
		row := rows[i]
		if isRowEmpty(row) {
			continue
		}

		payload := createUserPayload{
			Email:       getCell(row, header, "email"),
			Username:    getCell(row, header, "username"),
			Password:    getCell(row, header, "password"),
			FirstName:   getCell(row, header, "first_name"),
			LastName:    getCell(row, header, "last_name"),
			Locale:      getCell(row, header, "locale"),
			Nickname:    getCell(row, header, "nickname"),
			Position:    getCell(row, header, "position"),
			AuthService: getCell(row, header, "auth_service"),
			AuthData:    getCell(row, header, "auth_data"),
			Timezone:    getCell(row, header, "timezone"),
		}

		result := importRowResult{
			Row:      i + 1,
			Email:    payload.Email,
			Username: payload.Username,
		}

		if payload.Email == "" || payload.Username == "" || payload.Password == "" {
			result.Error = "missing required fields: email, username, password"
			results = append(results, result)
			continue
		}

		userID, err := createMattermostUser(client, serverURL, token, payload)
		if err != nil {
			result.Error = err.Error()
			results = append(results, result)
			continue
		}

		result.UserID = userID
		results = append(results, result)
		createdCount++
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"total":   len(results),
		"created": createdCount,
		"failed":  len(results) - createdCount,
		"results": results,
	})
}

func createMattermostUser(client *http.Client, serverURL string, token string, payload createUserPayload) (string, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request")
	}

	req, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/api/v4/users", serverURL),
		bytes.NewBuffer(body),
	)
	if err != nil {
		return "", fmt.Errorf("failed to build request")
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return "", fmt.Errorf("Create user failed: %s", errorResp.Message)
		}
		return "", fmt.Errorf("request failed with status %d", resp.StatusCode)
	}

	var user mattermostUserResponse
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return "", fmt.Errorf("failed to parse response")
	}

	if user.ID == "" {
		return "", fmt.Errorf("missing user id in response")
	}

	return user.ID, nil
}

func buildHeaderIndex(headerRow []string) map[string]int {
	index := make(map[string]int, len(headerRow))
	for i, cell := range headerRow {
		key := normalizeHeader(cell)
		if key == "" {
			continue
		}
		index[key] = i
	}
	return index
}

func normalizeHeader(value string) string {
	key := strings.ToLower(strings.TrimSpace(value))
	if key == "" {
		return ""
	}
	key = strings.ReplaceAll(key, " ", "_")
	key = strings.ReplaceAll(key, "-", "_")
	switch key {
	case "firstname":
		return "first_name"
	case "lastname":
		return "last_name"
	case "authservice":
		return "auth_service"
	case "authdata":
		return "auth_data"
	default:
		return key
	}
}

func getCell(row []string, header map[string]int, key string) string {
	idx, ok := header[key]
	if !ok || idx < 0 || idx >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[idx])
}

func isRowEmpty(row []string) bool {
	for _, cell := range row {
		if strings.TrimSpace(cell) != "" {
			return false
		}
	}
	return true
}
