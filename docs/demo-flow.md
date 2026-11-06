# TrialPulse Demo Flow

## Prerequisites

1. Run `npm install` at the repo root
2. Copy `.env.example` to `.env` (API keys optional — mock mode works without them)
3. Start backend: `npm run dev:api` (port 4000)
4. Start frontend: `npm run dev:web` (port 3000)

## Demo Script

### Scene 1: Dashboard Overview

1. Open `http://localhost:3000`
2. Show the stats cards: total patients, active, flagged, alerts
3. Point out the **Active Alerts** panel — James Rodriguez has a critical alert (adverse event + high dropout risk)
4. Show patient cards with dropout risk bars and AI summaries
5. Highlight the symptom trends section

### Scene 2: Patient Detail

1. Click on **James Rodriguez** (flagged patient)
2. Show his alert panel: critical adverse event, high dropout risk
3. Show the AI analysis: chest tightness, dyspnea, self-discontinued medication
4. Show the recommended action: urgent contact needed
5. Show check-in history with transcript

### Scene 3: Voice Check-in

1. Navigate to **Voice Check-in** page
2. Select a patient from the dropdown
3. Click the **record button** (simulates recording, fills demo transcript)
4. Or type/paste a custom transcript
5. Click **Submit & Analyze**
6. Watch the AI analysis appear:
   - Summary
   - Symptoms with severity bars
   - Dropout risk percentage
   - Medication adherence risk
   - Adverse event flag
   - Recommended action

### Scene 4: AI Provider Status

Hit `GET http://localhost:4000/api/ai/status` to show:
- `"ai": "mock"` or `"ai": "gemini"` based on API key
- `"tts": "mock"` or `"tts": "elevenlabs"` based on API key

## Mock Mode vs Real Mode

| Feature | Mock Mode | Real Mode |
|---------|-----------|-----------|
| AI Analysis | Keyword-based heuristic | Gemini 2.0 Flash |
| TTS | Empty WAV buffer | ElevenLabs audio |
| Latency | ~800ms simulated | Real API latency |
| Cost | Free | API credits |

Both modes return the same data structure and are fully demo-ready.
