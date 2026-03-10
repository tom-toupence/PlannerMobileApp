package handlers

import (
	"encoding/json"
	"net/http"

	"plannerapp-backend/internal/database"
	"plannerapp-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// POST /auth/profile - Create profile if not exists (after OAuth)
func CreateProfileIfNeeded(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.CreateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if profile already exists
	data, status, _ := database.DB.SelectSingle("profiles", "?select=id&id=eq."+userID)
	if status == 200 {
		var existing models.Profile
		if json.Unmarshal(data, &existing) == nil && existing.ID != "" {
			c.JSON(http.StatusOK, gin.H{"message": "profile already exists", "profile": existing})
			return
		}
	}

	// Create profile
	body := map[string]interface{}{
		"id":           userID,
		"display_name": req.DisplayName,
		"avatar_url":   req.AvatarURL,
	}
	data, status, err := database.DB.InsertSingle("profiles", body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile"})
		return
	}

	var profile models.Profile
	json.Unmarshal(data, &profile)
	c.JSON(http.StatusCreated, profile)
}
