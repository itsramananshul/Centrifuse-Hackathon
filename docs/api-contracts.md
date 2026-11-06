# HealthGPS API Contracts

Base URL: `http://localhost:3000/api`

All responses follow the envelope:
```json
{ "success": boolean, "message": string, "data": ... }
```

---

## Health Check

### `GET /api/health`
```json
{ "status": "ok", "service": "voxvitals-api" }
```

---

## Patients

### `GET /api/patients`
Returns all patients.
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "id": "pt-001",
      "name": "Sarah Chen",
      "age": 34,
      "condition": "Rheumatoid Arthritis",
      "trialId": "TRIAL-RA-2024",
      "enrolledAt": "2024-11-15T00:00:00Z",
      "status": "active",
      "latestCheckInId": "chk-001"
    }
  ]
}
```

### `GET /api/patients/:id`
Returns a single patient by ID.

---

## Check-ins

### `GET /api/checkins`
Returns all check-ins with analysis data.

### `GET /api/checkins/:id`
Returns a single check-in.

### `GET /api/checkins/patient/:patientId`
Returns all check-ins for a specific patient.

### `POST /api/checkins`
Create a new check-in.

**Request:**
```json
{
  "patientId": "pt-001",
  "transcript": "Hi, I've been having headaches..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in created",
  "data": {
    "id": "generated-uuid",
    "patientId": "pt-001",
    "timestamp": "2025-01-15T10:30:00Z",
    "transcript": "Hi, I've been having headaches...",
    "analysis": null
  }
}
```

---

## AI

### `POST /api/ai/analyze`
Analyze a transcript using Gemini (or mock).

**Request:**
```json
{
  "transcript": "I've been having severe chest pain and stopped taking my medication..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcript analyzed successfully",
  "data": {
    "summary": "Patient reports chest pain and medication discontinuation...",
    "symptoms": [
      { "name": "Chest pain", "severity": 8 }
    ],
    "medicationAdherenceRisk": "high",
    "dropoutRisk": 0.78,
    "adverseEvent": true,
    "recommendedAction": "URGENT: Schedule immediate follow-up..."
  }
}
```

### `POST /api/ai/speech`
Generate spoken summary audio.

**Request:**
```json
{ "text": "Patient summary text..." }
```

**Response:** Binary audio data (audio/mpeg)

### `GET /api/ai/status`
Check which providers are active.
```json
{
  "success": true,
  "message": "Success",
  "data": { "ai": "mock", "tts": "mock" }
}
```

---

## Alerts

### `GET /api/alerts`
Returns all alerts.

### `GET /api/alerts/unacknowledged`
Returns only unacknowledged alerts.

### `GET /api/alerts/:id`
Returns a single alert.

### `GET /api/alerts/patient/:patientId`
Returns alerts for a specific patient.

### `PATCH /api/alerts/:id/acknowledge`
Acknowledge an alert.

---

## Analytics

### `GET /api/analytics/summary`
Returns aggregated analytics.
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "totalPatients": 5,
    "activePatients": 3,
    "flaggedPatients": 2,
    "averageDropoutRisk": 0.44,
    "recentAlerts": 5,
    "symptomTrends": [
      {
        "name": "Headache",
        "dataPoints": [{ "date": "2025-01-10", "avgSeverity": 6 }]
      }
    ]
  }
}
```
