package mattermost

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
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

type mattermostTeamResponse struct {
	ID string `json:"id"`
}

type mattermostTeamMember struct {
	UserID string `json:"user_id"`
}

type mattermostChannelResponse struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
}

type mattermostCreateChannelPayload struct {
	TeamID      string `json:"team_id"`
	Name        string `json:"name"`
	DisplayName string `json:"display_name"`
	Type        string `json:"type"`
}

type createChannelsRequest struct {
	TeamName string   `json:"team_name"`
	Channels []string `json:"channels"`
}

type createChannelsResult struct {
	DisplayName string `json:"display_name"`
	ChannelName string `json:"channel_name"`
	ChannelID   string `json:"channel_id,omitempty"`
	Error       string `json:"error,omitempty"`
}

type mattermostNotFoundError struct {
	Message string
}

func (e mattermostNotFoundError) Error() string {
	return e.Message
}

type mattermostRequestError struct {
	Message string
	Code    string
}

func (e mattermostRequestError) Error() string {
	return e.Message
}

type sidebarCategoriesRequest struct {
	TeamName   string            `json:"team_name"`
	Categories map[string]string `json:"categories"`
}

type sidebarCategoriesResult struct {
	UserID          string            `json:"user_id"`
	NVCategoryID    string            `json:"nv_category_id,omitempty"`
	BGCategoryID    string            `json:"bg_category_id,omitempty"`
	AddedNV         int               `json:"added_nv"`
	AddedBG         int               `json:"added_bg"`
	CategoryIDs     map[string]string `json:"category_ids,omitempty"`
	AddedByCategory map[string]int    `json:"added_by_category,omitempty"`
	Error           string            `json:"error,omitempty"`
}

type clearEmptyCategoriesResult struct {
	UserID  string   `json:"user_id"`
	Deleted []string `json:"deleted"`
	Error   string   `json:"error,omitempty"`
}

type mattermostSidebarCategory struct {
	ID          string   `json:"id"`
	UserID      string   `json:"user_id"`
	TeamID      string   `json:"team_id"`
	DisplayName string   `json:"display_name"`
	Type        string   `json:"type"`
	SortOrder   int      `json:"sort_order"`
	Sorting     string   `json:"sorting"`
	Muted       bool     `json:"muted"`
	Collapsed   bool     `json:"collapsed"`
	ChannelIDs  []string `json:"channel_ids"`
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

func HandleMattermostCreateChannels(c *core.RequestEvent) error {
	var requestBody createChannelsRequest
	if err := c.BindBody(&requestBody); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	if strings.TrimSpace(requestBody.TeamName) == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "team_name is required"})
	}

	if len(requestBody.Channels) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "channels is required"})
	}

	serverURL := strings.TrimRight(os.Getenv("MATTERMOST_SERVER_URL"), "/")
	if serverURL == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_SERVER_URL is not set"})
	}

	token := os.Getenv("MATTERMOST_BOT_TOKEN")
	if token == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_BOT_TOKEN is not set"})
	}

	client := &http.Client{Timeout: 20 * time.Second}

	teamID, err := getMattermostTeamID(client, serverURL, token, requestBody.TeamName)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	userIDs, err := listMattermostTeamUserIDs(client, serverURL, token, teamID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	results := make([]createChannelsResult, 0, len(requestBody.Channels))

	for _, displayName := range requestBody.Channels {
		trimmed := strings.TrimSpace(displayName)
		if trimmed == "" {
			continue
		}

		channelName := makeMattermostChannelName(trimmed)
		result := createChannelsResult{
			DisplayName: trimmed,
			ChannelName: channelName,
		}

		channelID, err := createOrGetMattermostChannel(client, serverURL, token, teamID, channelName, trimmed)
		if err != nil {
			result.Error = err.Error()
			results = append(results, result)
			continue
		}

		if err := addMembersToMattermostChannel(client, serverURL, token, channelID, userIDs); err != nil {
			if isMattermostNotFoundError(err) {
				fallbackID, lookupErr := getMattermostChannelID(client, serverURL, token, teamID, channelName)
				if lookupErr == nil && fallbackID == "" {
					fallbackID, lookupErr = searchMattermostChannelID(client, serverURL, token, teamID, trimmed, channelName)
				}
				if lookupErr == nil && fallbackID != "" {
					if retryErr := addMembersToMattermostChannel(client, serverURL, token, fallbackID, userIDs); retryErr == nil {
						result.ChannelID = fallbackID
						results = append(results, result)
						continue
					}
				}
			}
			result.Error = err.Error()
			results = append(results, result)
			continue
		}

		result.ChannelID = channelID
		results = append(results, result)
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"team_id": teamID,
		"total":   len(results),
		"results": results,
	})
}

func HandleMattermostSidebarCategories(c *core.RequestEvent) error {

	var requestBody sidebarCategoriesRequest
	rawBody, _ := io.ReadAll(c.Request.Body)
	_ = json.Unmarshal(rawBody, &requestBody)

	categoriesMap := requestBody.Categories
	if len(categoriesMap) == 0 {
		var rawMap map[string]string
		if err := json.Unmarshal(rawBody, &rawMap); err == nil && len(rawMap) > 0 {
			delete(rawMap, "team_name")
			categoriesMap = rawMap
		}
	}

	teamName := strings.TrimSpace(requestBody.TeamName)
	if teamName == "" {
		teamName = strings.TrimSpace(c.Request.URL.Query().Get("team_name"))
	}
	if teamName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "team_name is required"})
	}
	if len(categoriesMap) == 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "categories map is required"})
	}

	serverURL := strings.TrimRight(os.Getenv("MATTERMOST_SERVER_URL"), "/")
	if serverURL == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_SERVER_URL is not set"})
	}

	token := os.Getenv("MATTERMOST_BOT_TOKEN")
	if token == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_BOT_TOKEN is not set"})
	}

	client := &http.Client{Timeout: 20 * time.Second}

	teamID, err := getMattermostTeamID(client, serverURL, token, teamName)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	userIDs, err := listMattermostTeamUserIDs(client, serverURL, token, teamID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	teamChannels, err := listMattermostTeamChannels(client, serverURL, token, teamID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	categoryChannelIDs := groupChannelIDsByPrefix(teamChannels, categoriesMap)
	results := make([]sidebarCategoriesResult, 0, len(userIDs))
	for _, userID := range userIDs {
		result := sidebarCategoriesResult{
			UserID:          userID,
			CategoryIDs:     make(map[string]string),
			AddedByCategory: make(map[string]int),
		}

		categories, err := listMattermostSidebarCategories(client, serverURL, token, userID, teamID)
		if err != nil {
			result.Error = err.Error()
			results = append(results, result)
			continue
		}

		categoryIndex := buildSidebarCategoryIndex(categories)
		for _, prefix := range sortedPrefixKeys(categoriesMap) {
			displayName := categoriesMap[prefix]
			channelIDs := categoryChannelIDs[displayName]
			if displayName == "" {
				continue
			}

			category := categoryIndex[strings.ToLower(displayName)]
			if category == nil {
				category, err = createMattermostSidebarCategory(client, serverURL, token, userID, teamID, displayName, channelIDs)
				if err != nil {
					result.Error = err.Error()
					results = append(results, result)
					category = nil
					break
				}
				categories = append(categories, *category)
				categoryIndex[strings.ToLower(displayName)] = category
			}

			added, updated, err := updateSidebarCategoryChannelsIfNeeded(client, serverURL, token, userID, teamID, categories, category.ID, channelIDs)
			if err != nil {
				result.Error = err.Error()
				results = append(results, result)
				category = nil
				break
			}
			categories = updated
			result.CategoryIDs[displayName] = category.ID
			result.AddedByCategory[displayName] = added
		}

		if result.Error != "" {
			continue
		}

		results = append(results, result)
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"team_id": teamID,
		"total":   len(results),
		"results": results,
	})
}

func HandleMattermostClearEmptySidebarCategories(c *core.RequestEvent) error {
	var requestBody sidebarCategoriesRequest
	if err := c.BindBody(&requestBody); err != nil && c.Request.Body != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "invalid request body"})
	}

	teamName := strings.TrimSpace(requestBody.TeamName)
	if teamName == "" {
		teamName = strings.TrimSpace(c.Request.URL.Query().Get("team_name"))
	}
	if teamName == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "team_name is required"})
	}

	serverURL := strings.TrimRight(os.Getenv("MATTERMOST_SERVER_URL"), "/")
	if serverURL == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_SERVER_URL is not set"})
	}

	token := os.Getenv("MATTERMOST_BOT_TOKEN")
	if token == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "MATTERMOST_BOT_TOKEN is not set"})
	}

	client := &http.Client{Timeout: 20 * time.Second}

	teamID, err := getMattermostTeamID(client, serverURL, token, teamName)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	userIDs, err := listMattermostTeamUserIDs(client, serverURL, token, teamID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	results := make([]clearEmptyCategoriesResult, 0, len(userIDs))
	for _, userID := range userIDs {
		result := clearEmptyCategoriesResult{
			UserID:  userID,
			Deleted: []string{},
		}

		categories, err := listMattermostSidebarCategories(client, serverURL, token, userID, teamID)
		if err != nil {
			result.Error = err.Error()
			results = append(results, result)
			continue
		}

		for _, category := range categories {
			if category.Type != "custom" {
				continue
			}
			if len(category.ChannelIDs) > 0 {
				continue
			}
			if category.ID == "" {
				continue
			}
			if err := deleteMattermostSidebarCategory(client, serverURL, token, userID, teamID, category.ID); err != nil {
				result.Error = err.Error()
				break
			}
			result.Deleted = append(result.Deleted, category.ID)
		}

		results = append(results, result)
	}

	return c.JSON(http.StatusOK, map[string]any{
		"success": true,
		"team_id": teamID,
		"total":   len(results),
		"results": results,
	})
}

func getMattermostTeamID(client *http.Client, serverURL, token, teamName string) (string, error) {
	req, err := http.NewRequest(
		http.MethodGet,
		fmt.Sprintf("%s/api/v4/teams/name/%s", serverURL, teamName),
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("failed to build team request")
	}

	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("team request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return "", fmt.Errorf("team request failed: %s", errorResp.Message)
		}
		return "", fmt.Errorf("team request failed with status %d", resp.StatusCode)
	}

	var team mattermostTeamResponse
	if err := json.NewDecoder(resp.Body).Decode(&team); err != nil {
		return "", fmt.Errorf("failed to parse team response")
	}

	if team.ID == "" {
		return "", fmt.Errorf("missing team id in response")
	}

	return team.ID, nil
}

func listMattermostTeamUserIDs(client *http.Client, serverURL, token, teamID string) ([]string, error) {
	perPage := 200
	page := 0
	userIDs := make([]string, 0, perPage)

	for {
		req, err := http.NewRequest(
			http.MethodGet,
			fmt.Sprintf("%s/api/v4/teams/%s/members?per_page=%d&page=%d&exclude_deleted_users=true", serverURL, teamID, perPage, page),
			nil,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to build team members request")
		}

		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("team members request failed")
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errorResp mattermostErrorResponse
			if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
				return nil, fmt.Errorf("team members request failed: %s", errorResp.Message)
			}
			return nil, fmt.Errorf("team members request failed with status %d", resp.StatusCode)
		}

		var members []mattermostTeamMember
		if err := json.NewDecoder(resp.Body).Decode(&members); err != nil {
			return nil, fmt.Errorf("failed to parse team members response")
		}

		if len(members) == 0 {
			break
		}

		for _, member := range members {
			if member.UserID != "" {
				userIDs = append(userIDs, member.UserID)
			}
		}

		if len(members) < perPage {
			break
		}
		page++
	}

	if len(userIDs) == 0 {
		return nil, fmt.Errorf("no members found in team")
	}

	return userIDs, nil
}

func listMattermostTeamChannels(client *http.Client, serverURL, token, teamID string) ([]mattermostChannelResponse, error) {
	perPage := 200
	page := 0
	channels := make([]mattermostChannelResponse, 0, perPage)

	for {
		req, err := http.NewRequest(
			http.MethodGet,
			fmt.Sprintf("%s/api/v4/teams/%s/channels?per_page=%d&page=%d", serverURL, teamID, perPage, page),
			nil,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to build team channels request")
		}

		req.Header.Set("Authorization", "Bearer "+token)

		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("team channels request failed")
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errorResp mattermostErrorResponse
			if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
				return nil, fmt.Errorf("team channels request failed: %s", errorResp.Message)
			}
			return nil, fmt.Errorf("team channels request failed with status %d", resp.StatusCode)
		}

		var pageChannels []mattermostChannelResponse
		if err := json.NewDecoder(resp.Body).Decode(&pageChannels); err != nil {
			return nil, fmt.Errorf("failed to parse team channels response")
		}

		if len(pageChannels) == 0 {
			break
		}

		channels = append(channels, pageChannels...)
		if len(pageChannels) < perPage {
			break
		}
		page++
	}
	return channels, nil
}

func groupChannelIDsByPrefix(channels []mattermostChannelResponse, categoriesMap map[string]string) map[string][]string {
	grouped := make(map[string][]string, len(categoriesMap))
	prefixes := sortedPrefixKeys(categoriesMap)

	for _, channel := range channels {
		if channel.ID == "" {
			continue
		}
		displayName := strings.TrimSpace(channel.DisplayName)
		for _, prefix := range prefixes {
			if prefixMatchesDisplayName(displayName, prefix) {
				categoryName := categoriesMap[prefix]
				if categoryName == "" {
					break
				}
				grouped[categoryName] = append(grouped[categoryName], channel.ID)
				break
			}
		}
	}

	return grouped
}

func listMattermostSidebarCategories(client *http.Client, serverURL, token, userID, teamID string) ([]mattermostSidebarCategory, error) {
	req, err := http.NewRequest(
		http.MethodGet,
		fmt.Sprintf("%s/api/v4/users/%s/teams/%s/channels/categories", serverURL, userID, teamID),
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build sidebar categories request")
	}

	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sidebar categories request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return nil, fmt.Errorf("sidebar categories request failed: %s", errorResp.Message)
		}
		return nil, fmt.Errorf("sidebar categories request failed with status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read sidebar categories response")
	}

	var categories []mattermostSidebarCategory
	if err := json.Unmarshal(body, &categories); err == nil {
		return categories, nil
	}

	var wrapper struct {
		Categories []mattermostSidebarCategory `json:"categories"`
	}
	if err := json.Unmarshal(body, &wrapper); err == nil && wrapper.Categories != nil {
		return wrapper.Categories, nil
	}

	return nil, fmt.Errorf("failed to parse sidebar categories response")
}

func buildSidebarCategoryIndex(categories []mattermostSidebarCategory) map[string]*mattermostSidebarCategory {
	index := make(map[string]*mattermostSidebarCategory, len(categories))
	for i := range categories {
		category := &categories[i]
		if strings.TrimSpace(category.DisplayName) == "" {
			continue
		}
		index[strings.ToLower(category.DisplayName)] = category
	}
	return index
}

func createMattermostSidebarCategory(client *http.Client, serverURL, token, userID, teamID, displayName string, channelIDs []string) (*mattermostSidebarCategory, error) {
	category := map[string]any{
		"user_id":      userID,
		"team_id":      teamID,
		"display_name": displayName,
		"type":         "custom",
	}

	var lastErr error
	created, err := createMattermostSidebarCategoryWithPayload(client, serverURL, token, userID, teamID, category)
	if err == nil {
		return created, nil
	}
	lastErr = err
	if !isMattermostInvalidCategoryError(err) {
		return nil, err
	}

	return nil, lastErr
}

func createMattermostSidebarCategoryWithPayload(client *http.Client, serverURL, token, userID, teamID string, payload map[string]any) (*mattermostSidebarCategory, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal sidebar category request")
	}
	req, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/api/v4/users/%s/teams/%s/channels/categories", serverURL, userID, teamID),
		bytes.NewBuffer(body),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to build sidebar category request")
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("sidebar category request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return nil, mattermostRequestError{
				Message: fmt.Sprintf("sidebar category request failed: %s", errorResp.Message),
				Code:    errorResp.ID,
			}
		}
		return nil, fmt.Errorf("sidebar category request failed with status %d", resp.StatusCode)
	}

	var category mattermostSidebarCategory
	if err := json.NewDecoder(resp.Body).Decode(&category); err != nil {
		return nil, fmt.Errorf("failed to parse sidebar category response")
	}

	if category.ID == "" {
		return nil, fmt.Errorf("missing sidebar category id in response")
	}

	return &category, nil
}

func deleteMattermostSidebarCategory(client *http.Client, serverURL, token, userID, teamID, categoryID string) error {
	req, err := http.NewRequest(
		http.MethodDelete,
		fmt.Sprintf("%s/api/v4/users/%s/teams/%s/channels/categories/%s", serverURL, userID, teamID, categoryID),
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to build sidebar category delete")
	}

	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("sidebar category delete failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNoContent || resp.StatusCode == http.StatusOK {
		return nil
	}

	if resp.StatusCode == http.StatusNotFound {
		return nil
	}

	var errorResp mattermostErrorResponse
	if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
		return fmt.Errorf("sidebar category delete failed: %s", errorResp.Message)
	}
	return fmt.Errorf("sidebar category delete failed with status %d", resp.StatusCode)
}

func updateSidebarCategoryChannelsIfNeeded(client *http.Client, serverURL, token, userID, teamID string, categories []mattermostSidebarCategory, categoryID string, channelIDs []string) (int, []mattermostSidebarCategory, error) {
	if len(channelIDs) == 0 {
		return 0, categories, nil
	}

	index := -1
	defaultIndex := -1
	for i := range categories {
		if categories[i].ID == categoryID {
			index = i
		}
		if categories[i].Type == "channels" || strings.EqualFold(categories[i].DisplayName, "Channels") {
			defaultIndex = i
		}
		if index != -1 && defaultIndex != -1 {
			break
		}
	}
	if index == -1 {
		return 0, categories, nil
	}

	mergedChannelIDs, added := mergeChannelIDs(categories[index].ChannelIDs, channelIDs)
	if added == 0 {
		return 0, categories, nil
	}

	categories[index].ChannelIDs = mergedChannelIDs
	for i := range categories {
		if i == index {
			continue
		}
		categories[i].ChannelIDs = removeChannelIDs(categories[i].ChannelIDs, channelIDs)
	}

	body, err := json.Marshal(categories)
	if err != nil {
		return 0, categories, fmt.Errorf("failed to marshal sidebar category update")
	}

	req, err := http.NewRequest(
		http.MethodPut,
		fmt.Sprintf("%s/api/v4/users/%s/teams/%s/channels/categories", serverURL, userID, teamID),
		bytes.NewBuffer(body),
	)
	if err != nil {
		return 0, categories, fmt.Errorf("failed to build sidebar category update")
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return 0, categories, fmt.Errorf("sidebar category update failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return 0, categories, fmt.Errorf("sidebar category update failed: %s", errorResp.Message)
		}
		return 0, categories, fmt.Errorf("sidebar category update failed with status %d", resp.StatusCode)
	}

	return added, categories, nil
}

func mergeChannelIDs(existing, incoming []string) ([]string, int) {
	seen := make(map[string]bool, len(existing)+len(incoming))
	merged := make([]string, 0, len(existing)+len(incoming))

	for _, id := range existing {
		if strings.TrimSpace(id) == "" {
			continue
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		merged = append(merged, id)
	}

	added := 0
	for _, id := range incoming {
		if strings.TrimSpace(id) == "" {
			continue
		}
		if seen[id] {
			continue
		}
		seen[id] = true
		merged = append(merged, id)
		added++
	}

	return merged, added
}

func removeChannelIDs(existing, remove []string) []string {
	if len(existing) == 0 || len(remove) == 0 {
		return existing
	}
	removeSet := make(map[string]bool, len(remove))
	for _, id := range remove {
		if strings.TrimSpace(id) == "" {
			continue
		}
		removeSet[id] = true
	}

	kept := make([]string, 0, len(existing))
	for _, id := range existing {
		if strings.TrimSpace(id) == "" {
			continue
		}
		if removeSet[id] {
			continue
		}
		kept = append(kept, id)
	}

	return kept
}

func sortedPrefixKeys(categoriesMap map[string]string) []string {
	prefixes := make([]string, 0, len(categoriesMap))
	for prefix := range categoriesMap {
		trimmed := strings.TrimSpace(prefix)
		if trimmed == "" {
			continue
		}
		prefixes = append(prefixes, trimmed)
	}
	sort.Slice(prefixes, func(i, j int) bool {
		if len(prefixes[i]) == len(prefixes[j]) {
			return prefixes[i] < prefixes[j]
		}
		return len(prefixes[i]) > len(prefixes[j])
	})
	return prefixes
}

func prefixMatchesDisplayName(displayName, prefix string) bool {
	if displayName == "" || prefix == "" {
		return false
	}
	trimmedName := strings.TrimSpace(displayName)
	upperName := strings.ToUpper(trimmedName)
	upperPrefix := strings.ToUpper(strings.TrimSpace(prefix))
	if !strings.HasPrefix(upperName, upperPrefix) {
		return false
	}
	if len(upperName) == len(upperPrefix) {
		return true
	}
	nextChar := upperName[len(upperPrefix)]
	return nextChar == ' ' || nextChar == '.' || nextChar == '-' || nextChar == '_' || (nextChar >= '0' && nextChar <= '9')
}

func createOrGetMattermostChannel(client *http.Client, serverURL, token, teamID, channelName, displayName string) (string, error) {
	channelID, err := getMattermostChannelID(client, serverURL, token, teamID, channelName)
	if err != nil {
		return "", err
	}
	if channelID != "" {
		return channelID, nil
	}

	payload := mattermostCreateChannelPayload{
		TeamID:      teamID,
		Name:        channelName,
		DisplayName: displayName,
		Type:        "O",
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("failed to marshal channel request")
	}

	req, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/api/v4/channels", serverURL),
		bytes.NewBuffer(body),
	)
	if err != nil {
		return "", fmt.Errorf("failed to build channel request")
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("channel request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusCreated {
		var channel mattermostChannelResponse
		if err := json.NewDecoder(resp.Body).Decode(&channel); err != nil {
			return "", fmt.Errorf("failed to parse channel response")
		}
		if channel.ID == "" {
			return "", fmt.Errorf("missing channel id in response")
		}
		return channel.ID, nil
	}

	if resp.StatusCode == http.StatusBadRequest || resp.StatusCode == http.StatusConflict {
		channelID, err := getMattermostChannelID(client, serverURL, token, teamID, channelName)
		if err == nil && channelID != "" {
			return channelID, nil
		}
	}

	var errorResp mattermostErrorResponse
	if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
		if isMattermostChannelExistsError(errorResp) {
			channelID, err := getMattermostChannelID(client, serverURL, token, teamID, channelName)
			if err == nil && channelID != "" {
				return channelID, nil
			}
			channelID, err = searchMattermostChannelID(client, serverURL, token, teamID, displayName, channelName)
			if err == nil && channelID != "" {
				return channelID, nil
			}
		}
		return "", fmt.Errorf("channel request failed: %s", errorResp.Message)
	}
	return "", fmt.Errorf("channel request failed with status %d", resp.StatusCode)
}

func getMattermostChannelID(client *http.Client, serverURL, token, teamID, channelName string) (string, error) {
	req, err := http.NewRequest(
		http.MethodGet,
		fmt.Sprintf("%s/api/v4/channels/name/%s/%s", serverURL, teamID, channelName),
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("failed to build channel lookup request")
	}

	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("channel lookup request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return "", nil
	}

	if resp.StatusCode != http.StatusOK {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return "", fmt.Errorf("channel lookup failed: %s", errorResp.Message)
		}
		return "", fmt.Errorf("channel lookup failed with status %d", resp.StatusCode)
	}

	var channel mattermostChannelResponse
	if err := json.NewDecoder(resp.Body).Decode(&channel); err != nil {
		return "", fmt.Errorf("failed to parse channel lookup response")
	}

	if channel.ID == "" {
		return "", fmt.Errorf("missing channel id in response")
	}

	return channel.ID, nil
}

func searchMattermostChannelID(client *http.Client, serverURL, token, teamID, displayName, channelName string) (string, error) {
	terms := []string{displayName, channelName}
	for _, term := range terms {
		term = strings.TrimSpace(term)
		if term == "" {
			continue
		}

		payload := map[string]string{
			"team_id": teamID,
			"term":    term,
		}

		body, err := json.Marshal(payload)
		if err != nil {
			return "", fmt.Errorf("failed to marshal channel search request")
		}

		req, err := http.NewRequest(
			http.MethodPost,
			fmt.Sprintf("%s/api/v4/channels/search", serverURL),
			bytes.NewBuffer(body),
		)
		if err != nil {
			return "", fmt.Errorf("failed to build channel search request")
		}

		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			return "", fmt.Errorf("channel search request failed")
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			var errorResp mattermostErrorResponse
			if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
				return "", fmt.Errorf("channel search failed: %s", errorResp.Message)
			}
			return "", fmt.Errorf("channel search failed with status %d", resp.StatusCode)
		}

		var channels []mattermostChannelResponse
		if err := json.NewDecoder(resp.Body).Decode(&channels); err != nil {
			return "", fmt.Errorf("failed to parse channel search response")
		}

		if len(channels) == 0 {
			continue
		}

		normalizedDisplay := strings.ToLower(strings.TrimSpace(displayName))
		normalizedName := strings.ToLower(strings.TrimSpace(channelName))
		for _, channel := range channels {
			if channel.ID == "" {
				continue
			}
			if strings.ToLower(channel.Name) == normalizedName ||
				strings.ToLower(strings.TrimSpace(channel.DisplayName)) == normalizedDisplay {
				return channel.ID, nil
			}
		}
	}

	return "", nil
}

func isMattermostChannelExistsError(errorResp mattermostErrorResponse) bool {
	if errorResp.ID == "store.sql_channel.save.channel_exists" {
		return true
	}
	message := strings.ToLower(errorResp.Message)
	return strings.Contains(message, "already exists") || strings.Contains(message, "channel exists")
}

func isMattermostNotFoundError(err error) bool {
	_, ok := err.(mattermostNotFoundError)
	return ok
}

func isMattermostInvalidCategoryError(err error) bool {
	requestErr, ok := err.(mattermostRequestError)
	if !ok {
		return false
	}
	message := strings.ToLower(requestErr.Message)
	return strings.Contains(message, "invalid or missing category")
}

func isMattermostMemberExistsError(errorResp mattermostErrorResponse) bool {
	if errorResp.ID == "store.sql_channel.save_member.exists" {
		return true
	}
	message := strings.ToLower(errorResp.Message)
	return strings.Contains(message, "already a member") || strings.Contains(message, "member exists")
}

func addMembersToMattermostChannel(client *http.Client, serverURL, token, channelID string, userIDs []string) error {
	if len(userIDs) == 0 {
		return nil
	}

	const batchSize = 200
	for i := 0; i < len(userIDs); i += batchSize {
		end := i + batchSize
		if end > len(userIDs) {
			end = len(userIDs)
		}

		if err := addMembersToMattermostChannelBatch(client, serverURL, token, channelID, userIDs[i:end]); err != nil {
			if isMattermostNotFoundError(err) {
				return addMembersToMattermostChannelIndividually(client, serverURL, token, channelID, userIDs)
			}
			return err
		}
	}

	return nil
}

func addMembersToMattermostChannelBatch(client *http.Client, serverURL, token, channelID string, userIDs []string) error {
	payload := map[string][]string{
		"user_ids": userIDs,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal channel members request")
	}

	req, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/api/v4/channels/%s/members/batch", serverURL, channelID),
		bytes.NewBuffer(body),
	)
	if err != nil {
		return fmt.Errorf("failed to build channel members request")
	}

	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("channel members request failed")
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return mattermostNotFoundError{Message: fmt.Sprintf("channel members request failed: %s", errorResp.Message)}
		}
		return mattermostNotFoundError{Message: "channel members request failed: channel not found"}
	}

	if resp.StatusCode != http.StatusOK {
		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			return fmt.Errorf("channel members request failed: %s", errorResp.Message)
		}
		return fmt.Errorf("channel members request failed with status %d, channel id: %s", resp.StatusCode, channelID)
	}

	return nil
}

func addMembersToMattermostChannelIndividually(client *http.Client, serverURL, token, channelID string, userIDs []string) error {
	for _, userID := range userIDs {
		if strings.TrimSpace(userID) == "" {
			continue
		}

		payload := map[string]string{
			"user_id": userID,
		}

		body, err := json.Marshal(payload)
		if err != nil {
			return fmt.Errorf("failed to marshal channel member request")
		}

		req, err := http.NewRequest(
			http.MethodPost,
			fmt.Sprintf("%s/api/v4/channels/%s/members", serverURL, channelID),
			bytes.NewBuffer(body),
		)
		if err != nil {
			return fmt.Errorf("failed to build channel member request")
		}

		req.Header.Set("Authorization", "Bearer "+token)
		req.Header.Set("Content-Type", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("channel member request failed")
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusCreated || resp.StatusCode == http.StatusOK {
			continue
		}

		var errorResp mattermostErrorResponse
		if err := json.NewDecoder(resp.Body).Decode(&errorResp); err == nil && errorResp.Message != "" {
			if isMattermostMemberExistsError(errorResp) {
				continue
			}
			return fmt.Errorf("channel member request failed: %s, user id: %s", errorResp.Message, payload)
		}
		return fmt.Errorf("channel member request failed with status %d, channel id: %s", resp.StatusCode, channelID)
	}

	return nil
}

func makeMattermostChannelName(displayName string) string {
	name := strings.TrimSpace(strings.ToLower(displayName))
	if name == "" {
		return "channel"
	}

	name = strings.Map(replaceVietnameseRune, name)

	var builder strings.Builder
	builder.Grow(len(name))
	prevDash := false

	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			builder.WriteRune(r)
			prevDash = false
			continue
		}

		if r == '-' {
			if !prevDash {
				builder.WriteRune('-')
				prevDash = true
			}
			continue
		}

		if !prevDash {
			builder.WriteRune('-')
			prevDash = true
		}
	}

	finalName := strings.Trim(builder.String(), "-")
	if finalName == "" {
		finalName = "channel"
	}

	const maxLen = 64
	if len(finalName) > maxLen {
		finalName = strings.Trim(finalName[:maxLen], "-")
	}

	if finalName == "" {
		finalName = "channel"
	}

	return finalName
}

func replaceVietnameseRune(r rune) rune {
	switch r {
	case 'à', 'á', 'ả', 'ã', 'ạ', 'ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ', 'â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ':
		return 'a'
	case 'è', 'é', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ề', 'ế', 'ể', 'ễ', 'ệ':
		return 'e'
	case 'ì', 'í', 'ỉ', 'ĩ', 'ị':
		return 'i'
	case 'ò', 'ó', 'ỏ', 'õ', 'ọ', 'ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ', 'ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ':
		return 'o'
	case 'ù', 'ú', 'ủ', 'ũ', 'ụ', 'ư', 'ừ', 'ứ', 'ử', 'ữ', 'ự':
		return 'u'
	case 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ':
		return 'y'
	case 'đ':
		return 'd'
	default:
		return r
	}
}
