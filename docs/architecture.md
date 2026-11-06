# HealthGPS Architecture

## Overview

HealthGPS is a Next.js full-stack application backed by Supabase for database, auth, and storage. It uses a modular API route structure with AI provider abstraction for Gemini and ElevenLabs.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React 19, Tailwind CSS |
| API | Next.js API Routes |
| Database | Supabase Postgres |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Google Gemini 2.0 Flash + ElevenLabs TTS |
| Deploy | Vercel + Supabase |

## Monorepo Structure

```
healthgps/
├── apps/web/                 # Single Next.js application
│   ├── app/
│   │   ├── api/              # API route handlers
│   │   ├── (auth)/           # Public auth pages (login, signup)
│   │   ├── (app)/            # Protected pages (dashboard, checkin, patient)
│   │   └── auth/callback/    # OAuth/email callback handler
│   ├── lib/
│   │   ├── supabase/         # Supabase clients (server, browser, middleware)
│   │   ├── ai/               # AI provider abstraction
│   │   ├── api.ts            # Frontend API client
│   │   ├── api-utils.ts      # Response helpers
│   │   └── db-mappers.ts     # DB row → TypeScript type mappers
│   ├── components/           # Reusable UI components
│   ├── middleware.ts          # Auth session refresh + route protection
│   └── supabase/             # SQL schema + seed files
├── packages/
│   ├── types/                # Shared TypeScript types
│   └── config/               # Shared constants
└── docs/
```

## Database Schema

4 tables: `patients`, `check_ins`, `ai_analyses`, `alerts`

- `ai_analyses` has JSONB `symptoms` column
- RLS enabled: all authenticated users can read/write all tables
- `checkin-audio` storage bucket for audio uploads

## Auth Flow

1. `middleware.ts` runs on every request via `@supabase/ssr`
2. Refreshes auth session cookie
3. Redirects unauthenticated users to `/login`
4. Redirects authenticated users away from auth pages
5. API routes verify auth via `supabase.auth.getUser()`

## AI Provider Abstraction

- `AiProvider` interface → `GeminiProvider` | `MockAiProvider`
- `TtsProvider` interface → `ElevenLabsProvider` | `MockTtsProvider`
- `AiService` singleton auto-selects based on environment variables
- Mock providers use keyword heuristics with simulated delays

## API Response Contract

All API responses use envelope:
```json
{ "success": boolean, "message": string, "data": T | null }
```

## Data Flow

1. Patient submits voice check-in (audio upload + transcript)
2. Audio stored in Supabase Storage, transcript saved to `check_ins`
3. AI module analyzes transcript via Gemini (or mock)
4. Analysis saved to `ai_analyses`, alerts generated in `alerts`
5. Dashboard queries Supabase for patients, alerts, analytics
6. Optional: ElevenLabs generates spoken summary
