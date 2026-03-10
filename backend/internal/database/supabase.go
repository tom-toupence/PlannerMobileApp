package database

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"plannerapp-backend/internal/config"
)

// Client wraps the Supabase REST API using the service_role key (bypasses RLS).
type Client struct {
	baseURL    string
	serviceKey string
	httpClient *http.Client
}

var DB *Client

func Init() {
	DB = &Client{
		baseURL:    config.Cfg.SupabaseURL + "/rest/v1",
		serviceKey: config.Cfg.SupabaseServiceRole,
		httpClient: &http.Client{},
	}
}

// GetUser validates a JWT and returns the user ID via Supabase Auth API.
func GetUser(token string) (string, error) {
	url := config.Cfg.SupabaseURL + "/auth/v1/user"
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("apikey", config.Cfg.SupabaseServiceRole)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("invalid token (status %d): %s", resp.StatusCode, string(body))
	}

	var user struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return "", err
	}
	return user.ID, nil
}

// Request helpers

func (c *Client) request(method, path string, body interface{}, headers map[string]string) ([]byte, int, error) {
	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, err
		}
		bodyReader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, c.baseURL+path, bodyReader)
	if err != nil {
		return nil, 0, err
	}

	req.Header.Set("apikey", c.serviceKey)
	req.Header.Set("Authorization", "Bearer "+c.serviceKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=representation")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, err
	}

	return data, resp.StatusCode, nil
}

// Select does a GET query. query is everything after the table, e.g. "?select=id,name&id=eq.xxx"
func (c *Client) Select(table, query string) ([]byte, int, error) {
	return c.request("GET", "/"+table+query, nil, nil)
}

// Insert does a POST.
func (c *Client) Insert(table string, body interface{}) ([]byte, int, error) {
	return c.request("POST", "/"+table, body, nil)
}

// Update does a PATCH with a filter query.
func (c *Client) Update(table, query string, body interface{}) ([]byte, int, error) {
	return c.request("PATCH", "/"+table+query, body, nil)
}

// Delete does a DELETE with a filter query.
func (c *Client) Delete(table, query string) ([]byte, int, error) {
	return c.request("DELETE", "/"+table+query, nil, nil)
}

// SelectSingle is like Select but requests a single object (not an array).
func (c *Client) SelectSingle(table, query string) ([]byte, int, error) {
	return c.request("GET", "/"+table+query, nil, map[string]string{
		"Accept": "application/vnd.pgrst.object+json",
	})
}

// InsertSingle inserts and returns a single object.
func (c *Client) InsertSingle(table string, body interface{}) ([]byte, int, error) {
	return c.request("POST", "/"+table, body, map[string]string{
		"Accept": "application/vnd.pgrst.object+json",
	})
}

// UpdateSingle updates and returns a single object.
func (c *Client) UpdateSingle(table, query string, body interface{}) ([]byte, int, error) {
	return c.request("PATCH", "/"+table+query, body, map[string]string{
		"Accept": "application/vnd.pgrst.object+json",
	})
}
