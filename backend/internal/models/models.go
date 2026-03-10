package models

import "time"

type Profile struct {
	ID             string  `json:"id"`
	Username       *string `json:"username"`
	DisplayName    *string `json:"display_name"`
	AvatarURL      *string `json:"avatar_url"`
	DefaultGroupID *string `json:"default_group_id"`
	CreatedAt      string  `json:"created_at"`
	UpdatedAt      string  `json:"updated_at"`
}

type Group struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	ImageURL    *string `json:"image_url"`
	CreatedBy   *string `json:"created_by"`
	CreatedAt   string  `json:"created_at"`
}

type GroupMember struct {
	GroupID  string  `json:"group_id"`
	UserID   string  `json:"user_id"`
	Role     string  `json:"role"`
	Color    *string `json:"color"`
	JoinedAt string  `json:"joined_at"`
}

type MemberWithProfile struct {
	UserID  string  `json:"user_id"`
	Color   string  `json:"color"`
	Role    string  `json:"role"`
	Profile ProfileInfo `json:"profile"`
}

type ProfileInfo struct {
	DisplayName *string `json:"display_name"`
	AvatarURL   *string `json:"avatar_url"`
}

type Event struct {
	ID          string    `json:"id"`
	GroupID     string    `json:"group_id"`
	Title       string    `json:"title"`
	Description *string   `json:"description"`
	Location    *string   `json:"location"`
	StartTime   time.Time `json:"start_time"`
	EndTime     *time.Time `json:"end_time"`
	AllDay      bool      `json:"all_day"`
	CreatedBy   *string   `json:"created_by"`
	CreatedAt   string    `json:"created_at"`
}

type Message struct {
	ID        string  `json:"id"`
	GroupID   string  `json:"group_id"`
	Content   string  `json:"content"`
	ImageURL  *string `json:"image_url"`
	CreatedBy *string `json:"created_by"`
	CreatedAt string  `json:"created_at"`
}

// Request/Response types

type CreateProfileRequest struct {
	DisplayName *string `json:"display_name"`
	AvatarURL   *string `json:"avatar_url"`
}

type UpdateProfileRequest struct {
	DisplayName *string `json:"display_name"`
}

type UpdateFavoriteGroupRequest struct {
	DefaultGroupID *string `json:"default_group_id"`
}

type CreateGroupRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
}

type UpdateGroupRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	ImageURL    *string `json:"image_url"`
}

type JoinGroupRequest struct {
	Color string `json:"color"`
}

type CreateEventRequest struct {
	Title       string  `json:"title" binding:"required"`
	Description *string `json:"description"`
	Location    *string `json:"location"`
	StartTime   string  `json:"start_time" binding:"required"`
	EndTime     *string `json:"end_time"`
	AllDay      bool    `json:"all_day"`
}

type UpdateEventRequest struct {
	Title       *string `json:"title"`
	Description *string `json:"description"`
	Location    *string `json:"location"`
	StartTime   *string `json:"start_time"`
	EndTime     *string `json:"end_time"`
	AllDay      *bool   `json:"all_day"`
}

type SendMessageRequest struct {
	Content  string  `json:"content"`
	ImageURL *string `json:"image_url"`
}

type UploadResponse struct {
	URL string `json:"url"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
