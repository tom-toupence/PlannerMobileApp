package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	SupabaseURL         string
	SupabaseServiceRole string
	SupabaseAnonKey     string
	R2AccountID         string
	R2AccessKeyID       string
	R2SecretAccessKey   string
	R2BucketName        string
	R2PublicURL         string
}

var Cfg Config

func Load() {
	_ = godotenv.Load()

	Cfg = Config{
		Port:                getEnv("PORT", "8080"),
		SupabaseURL:         mustEnv("SUPABASE_URL"),
		SupabaseServiceRole: mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
		SupabaseAnonKey:     mustEnv("SUPABASE_ANON_KEY"),
		R2AccountID:         getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:       getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey:   getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2BucketName:        getEnv("R2_BUCKET_NAME", "plannerapp-images"),
		R2PublicURL:         getEnv("R2_PUBLIC_URL", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("Required env var %s is not set", key)
	}
	return v
}
