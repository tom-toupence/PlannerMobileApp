package main

import (
	"log"

	"plannerapp-backend/internal/config"
	"plannerapp-backend/internal/database"
	"plannerapp-backend/internal/handlers"
	"plannerapp-backend/internal/middleware"
	"plannerapp-backend/internal/storage"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.Load()
	database.Init()
	storage.Init()

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true,
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// All routes require auth
	auth := r.Group("/")
	auth.Use(middleware.Auth())
	{
		// Auth / profile creation
		auth.POST("/auth/profile", handlers.CreateProfileIfNeeded)

		// Profile
		auth.GET("/profile", handlers.GetProfile)
		auth.PATCH("/profile", handlers.UpdateProfile)
		auth.PATCH("/profile/avatar", handlers.UpdateAvatar)
		auth.PATCH("/profile/favorite-group", handlers.UpdateFavoriteGroup)

		// Groups
		auth.GET("/groups", handlers.GetGroups)
		auth.POST("/groups", handlers.CreateGroupFull)
		auth.GET("/groups/:id", handlers.GetGroup)
		auth.PATCH("/groups/:id", handlers.UpdateGroup)

		// Members
		auth.POST("/groups/:id/join", handlers.JoinGroup)
		auth.GET("/groups/:id/members", handlers.GetMembers)

		// Events
		auth.GET("/groups/:id/events", handlers.GetEvents)
		auth.POST("/groups/:id/events", handlers.CreateEvent)
		auth.GET("/events/:eventId", handlers.GetEvent)
		auth.PATCH("/events/:eventId", handlers.UpdateEvent)
		auth.DELETE("/events/:eventId", handlers.DeleteEvent)

		// Messages
		auth.GET("/groups/:id/messages", handlers.GetMessages)
		auth.POST("/groups/:id/messages", handlers.SendMessage)

		// Upload
		auth.POST("/upload", handlers.Upload)
	}

	log.Printf("Server starting on port %s", config.Cfg.Port)
	if err := r.Run(":" + config.Cfg.Port); err != nil {
		log.Fatal(err)
	}
}
