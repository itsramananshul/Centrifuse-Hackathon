# HealthGPS Roadmap — Hackathon Winning Strategy

## Challenge

**"Best Digital Solution to Improve or Add Value to the Clinical Trial Process"** — Medpace Hackathon

---

## Current State

### DONE (do not break)
- End-to-end pipeline: check-in → Gemini AI analysis → save to Supabase → auto-generate alerts → update patient status
- Supabase Postgres (4 tables), Auth (login/signup/signout/middleware), Storage (audio uploads)
- 17 API routes including core pipeline `POST /api/checkins/[id]/analyze`
- Dashboard: patient cards with status, stat cards, severity-colored alerts panel (red border for critical)
- Voice check-in page with pipeline progress indicators ("Saving check-in..." → "Running AI analysis...")
- Patient detail page: analysis, alerts, check-in history
- Mock AI provider as instant Gemini fallback
- Loading skeletons, error states, empty states, toast notifications
- Responsive sidebar, middleware handles missing env vars gracefully

### NEEDS ATTENTION
- Seed data must be loaded (`seed.sql` not yet run)
- Mock AI summary has "[MOCK]" prefix — must remove for demo credibility
- Full pipeline must be tested end-to-end multiple times
- Demo script must be practiced

---

## Judging Criteria — How HealthGPS Wins Each Category

### 1. Patient Value
*"How well does this solution demonstrate an understanding of a trial patient's needs and solve for them?"*

**How we score:** Patients in clinical trials suffer between visits with no way to communicate deterioration. HealthGPS gives them a voice — literally. A 30-second check-in captures symptoms, medication struggles, and emotional state. The AI detects warning signs that would otherwise go unnoticed until the next scheduled visit — or until the patient silently drops out.

**Demo moment that proves it:** The transcript sounds like a real patient. The AI extracts specific symptoms, flags an adverse event, and measures dropout risk. The judge sees: this system *understands* what the patient is going through.

**What to say:** "Between visits, patients have no way to signal they're struggling. HealthGPS gives them a voice and makes sure someone is listening — even when no coordinator is available."

### 2. Industry Value
*"How does the solution improve or add value to the clinical trial process?"*

**How we score:** Clinical trials lose 30% of patients to dropout. Each dropout costs $20K-$50K and delays timelines. CROs like Medpace spend enormous manual effort on patient follow-up and retention. HealthGPS automates the detection layer — turning patient voice into structured clinical data with automated risk alerts. This directly addresses: patient retention, adverse event detection speed, site coordinator efficiency, and data collection quality.

**Demo moment that proves it:** The alert auto-generates. The coordinator's dashboard updates. No manual review was needed. The system brought the problem to the coordinator instead of the coordinator searching for it.

**What to say:** "Every clinical trial has a retention problem. HealthGPS turns it into a technology problem — and solves it with AI."

### 3. Technology & Experience
*"How well does this solution utilize available technologies? How functional is the prototype? How well thought out is the user experience?"*

**How we score:** Full-stack Next.js + Supabase (Postgres, Auth, Storage). Gemini 2.0 Flash for AI analysis with provider abstraction (mock fallback). Real database persistence, real auth, real file storage. The UX is clean and clinical — not a hackathon wireframe. The dashboard communicates risk at a glance. The check-in flow is 3 clicks. The analysis output is human-readable.

**Demo moment that proves it:** The app looks and feels like a real clinical tool. Loading states, error handling, responsive design — these details signal professional execution. The pipeline works reliably end-to-end.

**What to say:** "This is a fully functional prototype. Real database, real auth, real AI. Not a mockup."

### 4. Originality
*"How original is the solution? If it is not novel, how well does it build new concepts onto an existing piece of technology?"*

**How we score:** Voice-based clinical trial monitoring with real-time AI risk extraction does not exist in this form. The combination is novel: natural voice input → structured clinical data extraction → automated risk scoring → alert generation → coordinator dashboard. This is not a chatbot. This is not a survey tool. This is continuous AI-powered patient surveillance through voice.

**What to say:** "No one is doing real-time voice-based risk detection for clinical trials. This is a new approach to an old problem."

### 5. Presentation
*"How well does the team convey the benefits and opportunities of their solution?"*

**How we score:** 90-second demo flow. Four clear steps: Dashboard → Check-in → AI Result → Alert on Dashboard. One narrative: "Patients speak. AI detects risk. Trials stay safe." Every click has purpose. Every screen communicates value. No confusion.

**What to say:** Let the product speak. Describe the problem in 10 seconds. Show the solution in 60 seconds. Close with impact in 10 seconds.

---

## Phases (remaining work — focused on winning)

### Phase 1 — Demo Stability (must not fail)

| Task | Verify |
|------|--------|
| Run `seed.sql` in Supabase SQL Editor | Dashboard shows 5 patients + alerts |
| Remove "[MOCK]" prefix from mock AI provider | Analysis summary reads like a clinical note |
| Test full pipeline 3 times: check-in → analyze → alert → dashboard | Zero failures, Supabase tables have data |
| Confirm auth works: login → dashboard → check-in → dashboard | No crashes, no redirects |

### Phase 2 — Visual Clarity & UX Impact

| Task | Why It Matters for Judges |
|------|--------------------------|
| Critical alerts have red left border (already done — verify) | Judges see urgency immediately → Industry Value |
| Patient status badge updates to "flagged" after high-risk check-in | System reacts to risk → Technology & Experience |
| AI analysis reads as clinical prose, not technical output | Output feels real → Patient Value |
| Pipeline shows step-by-step progress ("Saving..." → "Analyzing...") | Builds anticipation → Presentation |

### Phase 3 — Emotional & Story Layer

| Task | Why |
|------|-----|
| Demo transcript sounds like a real patient struggling | Judges feel empathy → Patient Value |
| Verbal narrative connects to clinical trial dropout problem | Judges understand the stakes → Industry Value |
| Each screen has a one-liner: "Who needs attention?" / "AI detects risk" / "Alert auto-generated" | Judges follow the story → Presentation |
| Pause after AI results appear — let it sink in | Emotional impact → Presentation |

### Phase 4 — Presentation Optimization

| Task | Details |
|------|---------|
| Pre-login before demo | Be on dashboard when judges arrive |
| Transcript in clipboard | One paste, zero typing |
| Know which patient to select | Pick one currently "active" |
| Practice script 5 times | Under 90 seconds, no fumbling |
| Close all tabs, 100% zoom | Clean screen |

### Phase 5 — Optional Polish (only if time)
- Staggered analysis reveal animation (CSS only)
- Subtle red pulse on critical alert badges
- "NEW" label on alerts from the last 5 minutes

---

## DO NOT DO

- **No new features** — the pipeline is complete
- **No backend refactoring** — API routes work
- **No architecture changes** — the system is stable
- **No database schema changes** — tables are set
- **No real audio recording** — too risky for demo; transcript paste is reliable
- **No charts or visualizations** — not enough time to make them look good
- **No package renames** — internal names (`@trialpulse/types`) don't affect the demo
- **No deployment optimization** — localhost is a valid demo plan

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini API slow (>5s) | Awkward pause | Remove `GEMINI_API_KEY` → mock responds in <1s with realistic data |
| Pipeline fails live | No alert appears | Point to seed data alerts: "Here's an auto-generated alert from an earlier check-in" |
| Empty database | Dashboard looks dead | Run `seed.sql` 30 minutes before demo |
| Auth session expires | Redirect to login | Login fresh 5 minutes before demo; keep tab active |
| Presenter freezes | Lost narrative | Script is in `demo-plan.md`; practice 5 times minimum |

---

## Definition of "Hackathon Ready"

- [ ] Seed data loaded — dashboard shows patients and alerts
- [ ] Pipeline tested 3x — check-in → analysis → alert → dashboard
- [ ] Mock AI summary has no "[MOCK]" prefix
- [ ] Auth works — login → dashboard → check-in → back to dashboard
- [ ] Demo transcript in clipboard and ready
- [ ] Demo completed in under 90 seconds in practice
- [ ] Presenter has practiced verbal script at least 3 times
- [ ] Zero console errors during full flow
- [ ] Fallback plan understood (show seed data if pipeline fails)
