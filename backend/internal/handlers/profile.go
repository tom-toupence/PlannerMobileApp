package handlers

import (
	"encoding/json"
	"net/http"

	"plannerapp-backend/internal/database"
	"plannerapp-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GET /profile
func GetProfile(c *gin.Context) {
	userID := c.GetString("userId")

	data, status, err := database.DB.SelectSingle("profiles", "?select=id,username,display_name,avatar_url,default_group_id,created_at,updated_at&id=eq."+userID)
	if err != nil || status >= 400 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	var profile models.Profile
	json.Unmarshal(data, &profile)
	c.JSON(http.StatusOK, profile)
}

// PATCH /profile
func UpdateProfile(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	body := map[string]interface{}{}
	if req.DisplayName != nil {
		body["display_name"] = *req.DisplayName
	}

	data, status, err := database.DB.UpdateSingle("profiles", "?id=eq."+userID, body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}

	var profile models.Profile
	json.Unmarshal(data, &profile)
	c.JSON(http.StatusOK, profile)
}

// PATCH /profile/avatar
func UpdateAvatar(c *gin.Context) {
	userID := c.GetString("userId")

	var req struct {
		AvatarURL string `json:"avatar_url" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	body := map[string]interface{}{"avatar_url": req.AvatarURL}
	data, status, err := database.DB.UpdateSingle("profiles", "?id=eq."+userID, body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update avatar"})
		return
	}

	var profile models.Profile
	json.Unmarshal(data, &profile)
	c.JSON(http.StatusOK, profile)
}

// PATCH /profile/favorite-group
func UpdateFavoriteGroup(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.UpdateFavoriteGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	body := map[string]interface{}{"default_group_id": req.DefaultGroupID}
	data, status, err := database.DB.UpdateSingle("profiles", "?id=eq."+userID, body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update favorite group"})
		return
	}

	var profile models.Profile
	json.Unmarshal(data, &profile)
	c.JSON(http.StatusOK, profile)
}
