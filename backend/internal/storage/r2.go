package storage

import (
	"context"
	"fmt"
	"math/rand"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"plannerapp-backend/internal/config"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

var s3Client *s3.Client

func Init() {
	if config.Cfg.R2AccountID == "" || config.Cfg.R2AccessKeyID == "" || config.Cfg.R2SecretAccessKey == "" {
		return
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", config.Cfg.R2AccountID)

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			config.Cfg.R2AccessKeyID,
			config.Cfg.R2SecretAccessKey,
			"",
		)),
		awsconfig.WithRegion("auto"),
	)
	if err != nil {
		panic(fmt.Sprintf("failed to load R2 config: %v", err))
	}

	s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
	})
}

func UploadFile(file multipart.File, header *multipart.FileHeader, folder string) (string, error) {
	if s3Client == nil {
		return "", fmt.Errorf("R2 storage not configured")
	}

	ext := strings.TrimPrefix(filepath.Ext(header.Filename), ".")
	if ext == "" {
		ext = "jpg"
	}

	key := fmt.Sprintf("%s/%d-%s.%s", folder, time.Now().UnixMilli(), randomString(6), ext)

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = detectMIME(ext)
	}

	_, err := s3Client.PutObject(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(config.Cfg.R2BucketName),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("r2 upload failed: %w", err)
	}

	return fmt.Sprintf("%s/%s", config.Cfg.R2PublicURL, key), nil
}

func detectMIME(ext string) string {
	switch strings.ToLower(ext) {
	case "png":
		return "image/png"
	case "gif":
		return "image/gif"
	case "webp":
		return "image/webp"
	case "svg":
		return "image/svg+xml"
	default:
		return "image/jpeg"
	}
}

func randomString(n int) string {
	const letters = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, n)
	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}
	return string(b)
}
