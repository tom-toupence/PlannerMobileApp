package handlers

import (
	"encoding/json"
	"net/http"

	"plannerapp-backend/internal/database"

	"github.com/gin-gonic/gin"
)

// GET /groups/:id/messages
func GetMessages(c *gin.Context) {
	groupID := c.Param("id")

	data, status, err := database.DB.Select("messages", "?select=*&group_id=eq."+groupID+"&order=created_at.asc")
	if err != nil || status >= 400 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	var messages []json.RawMessage
	json.Unmarshal(data, &messages)
	if messages == nil {
		messages = []json.RawMessage{}
	}
	c.Data(http.StatusOK, "application/json", data)
}

// POST /groups/:id/messages
func SendMessage(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetString("userId")

	var req struct {
		Content  string  `json:"content"`
		ImageURL *string `json:"image_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Content == "" && req.ImageURL == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Content or image required"})
		return
	}

	content := req.Content
	if content == "" && req.ImageURL != nil {
		content = "Photo"
	}

	body := map[string]interface{}{
		"group_id":   groupID,
		"content":    content,
		"image_url":  req.ImageURL,
		"created_by": userID,
	}

	data, status, err := database.DB.InsertSingle("messages", body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send message"})
		return
	}

	c.Data(http.StatusCreated, "application/json", data)
}
