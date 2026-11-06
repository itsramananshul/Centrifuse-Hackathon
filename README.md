# HealthGPS

AI-powered voice-based patient monitoring for clinical trials. Patients submit voice check-ins, AI (Gemini) analyzes transcripts into structured clinical insights, and researchers view alerts, patient status, and risk trends in a real-time dashboard.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase Postgres
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (audio uploads)
- **AI**: Google Gemini 2.0 Flash + ElevenLabs TTS
- **Deploy**: Vercel + Supabase

## Quick Start

### 1. Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run `apps/web/supabase/schema.sql` in the SQL Editor
3. Run `apps/web/supabase/seed.sql` for demo data
4. Copy your project URL and anon key

### 2. Environment Variables

```bash
cp .env.example apps/web/.env.local
```

Fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=           # optional
ELEVENLABS_API_KEY=       # optional
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Create Account

Visit `/signup` to create an account, then sign in at `/login`.

## Architecture

```
apps/web/                     # Single Next.js app
├── app/
│   ├── api/                  # API routes (Supabase queries)
│   │   ├── patients/
│   │   ├── checkins/
│   │   ├── ai/               # Gemini + ElevenLabs providers
│   │   ├── alerts/
│   │   └── analytics/
│   ├── (auth)/               # Login/signup pages
│   └── (app)/                # Protected dashboard pages
├── lib/
│   ├── supabase/             # Server + browser clients
│   ├── ai/                   # AI provider abstraction
│   └── api.ts                # Frontend API client
├── components/               # Reusable UI components
└── middleware.ts              # Auth protection
packages/
├── types/                    # Shared TypeScript types
└── config/                   # Shared configuration
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `GEMINI_API_KEY` | No | Google Gemini API key (mock fallback) |
| `ELEVENLABS_API_KEY` | No | ElevenLabs API key (mock fallback) |

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel
3. Set root directory to `apps/web`
4. Add environment variables
5. Deploy

# Mock Mode

Without AI API keys, the app uses mock providers that simulate analysis using keyword-based heuristics. The data contract is identical — same response shapes, same UI behavior.
