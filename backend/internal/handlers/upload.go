package handlers

import (
	"net/http"

	"plannerapp-backend/internal/storage"

	"github.com/gin-gonic/gin"
)

const maxUploadSize = 10 << 20 // 10 MB

var allowedMIMETypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/gif":  true,
	"image/webp": true,
}

// POST /upload
func Upload(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadSize)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided or file too large (max 10MB)"})
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if !allowedMIMETypes[contentType] {
		// Try to be lenient - accept if it starts with image/
		if len(contentType) < 6 || contentType[:6] != "image/" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Only image files are allowed (jpeg, png, gif, webp)"})
			return
		}
	}

	folder := c.DefaultPostForm("folder", "uploads")

	url, err := storage.UploadFile(file, header, folder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Upload failed: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"url": url})
}
