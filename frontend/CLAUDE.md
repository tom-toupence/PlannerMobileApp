# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PlannerApp is a React Native mobile app built with Expo for planning events with friends. Features include shared calendars, group messaging with inline photos, and Google OAuth authentication. A Go (Gin) backend handles all data operations and image uploads.

## Development Commands

```bash
# Frontend - Install dependencies
cd PlannerApp && npm install

# Start Expo dev server (use --tunnel for remote device testing)
npx expo start --tunnel --port 8081

# Platform-specific
npm run ios       # iOS simulator
npm run android   # Android emulator
npm run web       # Web browser

# Linting
npm run lint

# Backend - Run Go server
cd backend && go run main.go
```

## Tech Stack

- **Framework**: React Native 0.81 + Expo 54 + React 19
- **Routing**: Expo Router (file-based routing in `/app`)
- **Backend API**: Go (Gin) server in `/backend`
- **Database**: Supabase (PostgreSQL with Row Level Security), accessed via backend service_role key
- **Auth**: Google OAuth via Supabase (client-side), JWT verification in backend middleware
- **Storage**: Cloudflare R2 via backend S3 SDK (images, avatars, backgrounds)
- **Animations**: react-native-reanimated v4 (chat animations, keyboard, message entry)
- **Language**: TypeScript (strict mode) for frontend, Go for backend

## Architecture

### Backend (`/backend`)
- `main.go` - Gin server with routes and CORS
- `internal/config/` - Environment variable loading
- `internal/middleware/auth.go` - JWT verification via Supabase Auth API
- `internal/handlers/` - Route handlers (auth, profile, groups, members, events, messages, upload)
- `internal/database/supabase.go` - Supabase REST API client (service_role key, bypasses RLS)
- `internal/storage/r2.go` - Cloudflare R2 upload via S3 SDK
- `internal/models/` - Shared types and request/response structs

### File-Based Routing (`/app`)
- `_layout.tsx` - Root layout with auth-driven navigation
- `(tabs)/` - Bottom tab navigation (groups list, profile)
- `group/[id]/` - Dynamic group screens (calendar, chat)
- `login.tsx` - Google OAuth login

### Core Libraries (`/lib`)
- `supabase.ts` - Supabase client with SecureStore adapter (auth only)
- `auth-context.tsx` - Auth state provider (session, user, signOut)
- `api.ts` - API client for all backend calls (auto-attaches JWT from Supabase session)
- `colors.ts` - Member color palette for visual identification

### Database Schema (`/supabase/schema.sql`)
Tables: `profiles`, `groups`, `group_members`, `events`, `messages`, `group_photos`

All tables use RLS policies. Key relationships:
- `group_members.user_id` -> `profiles.id`
- `group_members.group_id` -> `groups.id`
- Events, messages reference both group and creator

## Environment Variables

Frontend `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=<supabase-project-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
EXPO_PUBLIC_API_URL=http://localhost:8080
```

Backend `.env`:
```
PORT=8080
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
SUPABASE_ANON_KEY=<anon-key>
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET_NAME=plannerapp-images
R2_PUBLIC_URL=<r2-public-url>
```

## Key Patterns

- **API Client**: All data calls go through `lib/api.ts` -> Go backend -> Supabase. `supabase.auth.*` stays client-side.
- **Auth Flow**: Login creates profile via `api.createProfileIfNeeded()`, then redirects to tabs
- **Group Colors**: Each member gets a random color stored in `group_members.color`
- **Multi-day Events**: Calendar shows continuous bars across days using `isStart`/`isEnd`/`isContinue` flags
- **French Locale**: Calendar and dates formatted in French
- **Image Upload**: All images uploaded via `api.upload()` -> backend `/upload` -> R2 (with MIME detection and 10MB limit)
- **Inverted Chat**: FlatList with `inverted={true}` for reliable auto-scroll to newest messages
- **Chat Animations**: reanimated send button pulse, spring keyboard animation, FadeInDown message entry
- **Group Tabs**: 2 tabs per group -- calendar and chat (photos are inline in chat)

## Path Alias

`@/*` maps to project root (e.g., `@/lib/supabase`, `@/components/...`)
