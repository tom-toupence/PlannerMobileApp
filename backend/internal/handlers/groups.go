package handlers

import (
	"encoding/json"
	"net/http"

	"plannerapp-backend/internal/database"
	"plannerapp-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// GET /groups - List groups the user belongs to
func GetGroups(c *gin.Context) {
	userID := c.GetString("userId")

	// Get user's favorite group
	profData, _, _ := database.DB.SelectSingle("profiles", "?select=default_group_id&id=eq."+userID)
	var profile struct {
		DefaultGroupID *string `json:"default_group_id"`
	}
	json.Unmarshal(profData, &profile)

	// Get memberships
	membData, status, err := database.DB.Select("group_members", "?select=group_id&user_id=eq."+userID)
	if err != nil || status >= 400 {
		c.JSON(http.StatusOK, gin.H{"groups": []interface{}{}, "favoriteGroupId": profile.DefaultGroupID})
		return
	}

	var memberships []struct {
		GroupID string `json:"group_id"`
	}
	json.Unmarshal(membData, &memberships)

	if len(memberships) == 0 {
		c.JSON(http.StatusOK, gin.H{"groups": []interface{}{}, "favoriteGroupId": profile.DefaultGroupID})
		return
	}

	// Build group IDs filter
	ids := ""
	for i, m := range memberships {
		if i > 0 {
			ids += ","
		}
		ids += `"` + m.GroupID + `"`
	}

	groupsData, _, _ := database.DB.Select("groups", "?select=id,name,description&id=in.("+ids+")")
	var groups []models.Group
	json.Unmarshal(groupsData, &groups)

	c.JSON(http.StatusOK, gin.H{"groups": groups, "favoriteGroupId": profile.DefaultGroupID})
}

// POST /groups - Create a new group
func CreateGroup(c *gin.Context) {
	userID := c.GetString("userId")

	var req models.CreateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	body := map[string]interface{}{
		"name":        req.Name,
		"description": req.Description,
		"created_by":  userID,
	}

	data, status, err := database.DB.InsertSingle("groups", body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	var group models.Group
	json.Unmarshal(data, &group)

	// Add creator as admin
	memberBody := map[string]interface{}{
		"group_id": group.ID,
		"user_id":  userID,
		"role":     "admin",
		"color":    req.Description, // will be overridden by the color from request
	}
	database.DB.Insert("group_members", memberBody)

	c.JSON(http.StatusCreated, group)
}

// CreateGroupFull creates group and adds creator as admin with color
func CreateGroupFull(c *gin.Context) {
	userID := c.GetString("userId")

	var req struct {
		Name        string  `json:"name" binding:"required"`
		Description *string `json:"description"`
		Color       string  `json:"color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	body := map[string]interface{}{
		"name":        req.Name,
		"description": req.Description,
		"created_by":  userID,
	}

	data, status, err := database.DB.InsertSingle("groups", body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	var group models.Group
	json.Unmarshal(data, &group)

	// Add creator as admin with color
	memberBody := map[string]interface{}{
		"group_id": group.ID,
		"user_id":  userID,
		"role":     "admin",
		"color":    req.Color,
	}
	database.DB.Insert("group_members", memberBody)

	c.JSON(http.StatusCreated, group)
}

// GET /groups/:id
func GetGroup(c *gin.Context) {
	groupID := c.Param("id")

	data, status, err := database.DB.SelectSingle("groups", "?select=id,name,description,image_url,created_by,created_at&id=eq."+groupID)
	if err != nil || status >= 400 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Group not found"})
		return
	}

	var group models.Group
	json.Unmarshal(data, &group)
	c.JSON(http.StatusOK, group)
}

// PATCH /groups/:id
func UpdateGroup(c *gin.Context) {
	groupID := c.Param("id")

	var req models.UpdateGroupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	body := map[string]interface{}{}
	if req.Name != nil {
		body["name"] = *req.Name
	}
	if req.Description != nil {
		body["description"] = *req.Description
	}
	if req.ImageURL != nil {
		body["image_url"] = *req.ImageURL
	}

	data, status, err := database.DB.UpdateSingle("groups", "?id=eq."+groupID, body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update group"})
		return
	}

	var group models.Group
	json.Unmarshal(data, &group)
	c.JSON(http.StatusOK, group)
}
