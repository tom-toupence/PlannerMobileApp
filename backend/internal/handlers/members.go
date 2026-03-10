package handlers

import (
	"encoding/json"
	"net/http"

	"plannerapp-backend/internal/database"
	"plannerapp-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// POST /groups/:id/join
func JoinGroup(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetString("userId")

	var req models.JoinGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if group exists
	_, status, _ := database.DB.SelectSingle("groups", "?select=id&id=eq."+groupID)
	if status >= 400 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	// Check if already a member
	existData, status, _ := database.DB.Select("group_members", "?select=user_id&group_id=eq."+groupID+"&user_id=eq."+userID)
	var existing []struct{ UserID string `json:"user_id"` }
	json.Unmarshal(existData, &existing)
	if len(existing) > 0 {
		c.JSON(http.StatusOK, gin.H{"message": "already a member", "group_id": groupID})
		return
	}

	// Join
	body := map[string]interface{}{
		"group_id": groupID,
		"user_id":  userID,
		"role":     "member",
		"color":    req.Color,
	}
	_, status, err := database.DB.Insert("group_members", body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to join group"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "joined", "group_id": groupID})
}

// GET /groups/:id/members
func GetMembers(c *gin.Context) {
	groupID := c.Param("id")

	// Get members
	membData, status, err := database.DB.Select("group_members", "?select=user_id,color,role&group_id=eq."+groupID)
	if err != nil || status >= 400 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	var members []struct {
		UserID string  `json:"user_id"`
		Color  *string `json:"color"`
		Role   string  `json:"role"`
	}
	json.Unmarshal(membData, &members)

	if len(members) == 0 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	// Get all profiles
	ids := ""
	for i, m := range members {
		if i > 0 {
			ids += ","
		}
		ids += `"` + m.UserID + `"`
	}

	profData, _, _ := database.DB.Select("profiles", "?select=id,display_name,avatar_url&id=in.("+ids+")")
	var profiles []struct {
		ID          string  `json:"id"`
		DisplayName *string `json:"display_name"`
		AvatarURL   *string `json:"avatar_url"`
	}
	json.Unmarshal(profData, &profiles)

	profileMap := map[string]models.ProfileInfo{}
	for _, p := range profiles {
		profileMap[p.ID] = models.ProfileInfo{DisplayName: p.DisplayName, AvatarURL: p.AvatarURL}
	}

	// Combine
	result := make([]models.MemberWithProfile, len(members))
	for i, m := range members {
		color := ""
		if m.Color != nil {
			color = *m.Color
		}
		prof := profileMap[m.UserID]
		result[i] = models.MemberWithProfile{
			UserID:  m.UserID,
			Color:   color,
			Role:    m.Role,
			Profile: prof,
		}
	}

	c.JSON(http.StatusOK, result)
}
