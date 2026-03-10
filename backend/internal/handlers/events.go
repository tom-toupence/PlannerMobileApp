package handlers

import (
	"encoding/json"
	"net/http"

	"plannerapp-backend/internal/database"

	"github.com/gin-gonic/gin"
)

// GET /groups/:id/events
func GetEvents(c *gin.Context) {
	groupID := c.Param("id")

	data, status, err := database.DB.Select("events", "?select=*&group_id=eq."+groupID+"&order=start_time.asc")
	if err != nil || status >= 400 {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}

	var events []json.RawMessage
	json.Unmarshal(data, &events)
	if events == nil {
		events = []json.RawMessage{}
	}
	c.Data(http.StatusOK, "application/json", data)
}

// POST /groups/:id/events
func CreateEvent(c *gin.Context) {
	groupID := c.Param("id")
	userID := c.GetString("userId")

	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		StartTime   string  `json:"start_time" binding:"required"`
		EndTime     *string `json:"end_time"`
		AllDay      bool    `json:"all_day"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	body := map[string]interface{}{
		"group_id":    groupID,
		"title":       req.Title,
		"description": req.Description,
		"location":    req.Location,
		"start_time":  req.StartTime,
		"end_time":    req.EndTime,
		"all_day":     req.AllDay,
		"created_by":  userID,
	}

	data, status, err := database.DB.InsertSingle("events", body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	c.Data(http.StatusCreated, "application/json", data)
}

// GET /events/:eventId
func GetEvent(c *gin.Context) {
	eventID := c.Param("eventId")

	data, status, err := database.DB.SelectSingle("events", "?select=*&id=eq."+eventID)
	if err != nil || status >= 400 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	c.Data(http.StatusOK, "application/json", data)
}

// PATCH /events/:eventId
func UpdateEvent(c *gin.Context) {
	eventID := c.Param("eventId")

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Only allow updating known fields
	body := map[string]interface{}{}
	for _, k := range []string{"title", "description", "location", "start_time", "end_time", "all_day"} {
		if v, ok := req[k]; ok {
			body[k] = v
		}
	}

	data, status, err := database.DB.UpdateSingle("events", "?id=eq."+eventID, body)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	c.Data(http.StatusOK, "application/json", data)
}

// DELETE /events/:eventId
func DeleteEvent(c *gin.Context) {
	eventID := c.Param("eventId")

	_, status, err := database.DB.Delete("events", "?id=eq."+eventID)
	if err != nil || status >= 400 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
