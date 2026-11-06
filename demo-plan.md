# HealthGPS Demo Plan

## The Story

**"Patients speak. AI detects risk. Trials stay safe."**

30% of clinical trial patients drop out. Between scheduled visits, they suffer side effects, lose motivation, skip medication — and no one knows until it's too late. HealthGPS lets patients do a 30-second voice check-in. AI extracts symptoms, measures dropout risk, and flags adverse events. Coordinators see alerts before patients disappear.

---

## Problem → Solution → Impact (Medpace Context)

**Problem:** Clinical trials lose 30% of patients. Each dropout costs $20K-$50K and pushes back the entire trial. Patients experience side effects and frustration between visits. Coordinators discover problems too late — at the next scheduled visit, or worse, when the patient stops showing up. This is a daily reality at CROs like Medpace.

**Solution:** HealthGPS — AI-powered voice monitoring for clinical trials. Patients describe how they feel in natural speech. Gemini 2.0 Flash analyzes the transcript and extracts:
- Symptoms with severity (headache: 7/10)
- Dropout risk score (0-100%)
- Adverse event flags (safety-critical)
- Medication adherence signals

Alerts auto-generate for the coordinator. No manual review needed.

**Impact for Medpace:**
- Catch patients about to drop out *before* they disappear
- Detect adverse events hours/days faster than current manual processes
- Reduce coordinator workload — AI does the initial screening
- Every voice check-in becomes structured, queryable clinical data
- Directly improves trial retention, safety reporting speed, and data quality

---

## 60-90 Second Demo Script

*Practice this until it feels natural. Not word-for-word — know the beats.*

### Beat 1: The Problem (10 seconds)
> "Clinical trials lose 30% of their patients. Between visits, patients struggle with side effects and no one knows. By the time a coordinator finds out, the patient has already dropped out. HealthGPS changes that."

### Beat 2: The Dashboard (15 seconds)
*[Dashboard is already showing with patients and alerts]*
> "This is the coordinator's dashboard. Five patients in an active trial. Two are already flagged by the AI. These alerts were auto-generated from their voice check-ins — the coordinator didn't create them manually."

*[Point to a critical red alert]*
> "This one is critical — adverse event detected."

### Beat 3: Live Check-in (20 seconds)
*[Click "Voice Check-in" in sidebar → Select a patient → Paste transcript]*
> "Now let's see a new patient check-in come in. The patient describes how they've been feeling..."

*[Paste the demo transcript, click "Submit & Analyze"]*
> "One click. The AI analyzes the transcript in real-time."

*[Button shows "Saving check-in..." then "Running AI analysis..."]*

### Beat 4: The AI Moment (20 seconds — THIS IS THE WOW)
*[Results appear: summary, symptoms, risk bar, adverse event flag]*
> "Instantly — the AI extracted structured clinical data from natural speech."

*[Point to each section]*
> "Symptoms identified with severity. Dropout risk at 78% — that's high. Adverse event flagged. And a specific recommended action for the coordinator."

*[Pause 2 seconds. Let judges read the screen.]*
> "Unstructured voice became actionable clinical intelligence in seconds."

### Beat 5: The Alert (15 seconds)
*[Navigate back to Dashboard]*
> "Now look at the dashboard."

*[Point to the new red critical alert that just appeared]*
> "A critical alert just appeared. The system created it automatically because the AI detected an adverse event and high dropout risk. The coordinator didn't do anything — the system brought the problem to them."

### Beat 6: The Close (10 seconds)
> "HealthGPS turns patient voice into clinical insight. It catches patients who would otherwise disappear. Built with Next.js, Supabase, and Gemini 2.0 Flash."

**Total: ~90 seconds**

---

## Demo Transcript (copy this to clipboard before demo)

> I've been having really bad headaches for the past four days. They started after I increased the dosage like the doctor said. I almost didn't take my pills yesterday because the headaches were so bad. I'm not sure I want to continue with this if it keeps up.

This transcript triggers:
- Headache symptom (severity ~6-7)
- High medication adherence risk (almost didn't take pills)
- High dropout risk ("not sure I want to continue")
- Potential adverse event (headaches after dosage increase)

---

## Exact Click-by-Click Flow

### Setup (15 min before)
1. App running (localhost:3000 or deployed URL)
2. Already logged in — dashboard visible
3. Seed data loaded (5 patients, alerts visible)
4. Browser: 100% zoom, no other tabs, no dev tools
5. Demo transcript copied to clipboard

### Live Sequence

| # | Action | What Judge Sees | Judging Criterion Hit |
|---|--------|-----------------|----------------------|
| 1 | Show dashboard (already visible) | Patient cards, stat cards, red critical alerts | Technology & Experience, Presentation |
| 2 | Point to existing alerts | Red-bordered critical alert with severity badge | Industry Value (auto-detection) |
| 3 | Click "Voice Check-in" in sidebar | Clean check-in interface loads | Technology & Experience (UX) |
| 4 | Select patient from dropdown | Patient list from Supabase | Technology (real database) |
| 5 | Paste transcript (Ctrl+V) | Patient's words appear in textarea | Patient Value (real patient voice) |
| 6 | Click "Submit & Analyze" | "Saving check-in..." → "Running AI analysis..." | Technology (real pipeline) |
| 7 | Results appear | Summary, symptoms, risk bar, adverse event, recommended action | Patient Value + Originality |
| 8 | Click Dashboard in sidebar | NEW critical alert visible, patient now "flagged" | Industry Value (automated alerting) |
| 9 | Click patient card | Full history: check-in, analysis, alerts | Technology & Experience |

---

## WOW Moments — What Makes Judges Stop and Pay Attention

### WOW 1: AI Transforms Voice into Clinical Data (Beat 4)
**What they see:** Unstructured patient speech → structured clinical data in seconds. Symptoms with severity bars. Red dropout risk bar. Adverse event flag. Specific recommended action.
**What they feel:** "This actually works. The AI understood a real patient."
**Why it wins:** Proves Patient Value (understands patient needs) + Originality (novel approach) + Technology (functional prototype)

### WOW 2: Alert Auto-Generates on Dashboard (Beat 5)
**What they see:** A new red critical alert that was NOT there 30 seconds ago. No human created it.
**What they feel:** "The system acts autonomously. This is how clinical monitoring should work."
**Why it wins:** Proves Industry Value (improves clinical trial process) + Technology (end-to-end pipeline works)

### WOW 3: Dashboard Communicates Risk at a Glance (Beat 2)
**What they see:** Clean, professional clinical dashboard. Patient risk levels obvious. Alerts panel with severity coloring. Stat cards with real numbers.
**What they feel:** "This doesn't look like a hackathon prototype. This looks like a real product."
**Why it wins:** Proves Technology & Experience (well thought out UX) + Presentation (clear communication)

---

## What Judges Should Feel

| Moment | Feeling | Criterion |
|--------|---------|-----------|
| Hear the problem statement | "This is a real problem. 30% dropout is huge." | Patient Value |
| See the dashboard | "This is polished. Serious team." | Technology & Experience |
| See the patient transcript | "This sounds like someone who's struggling." | Patient Value |
| See AI analysis appear | "It actually understood the patient. Impressive." | Originality |
| See dropout risk bar fill red | "That's alarming. This patient is about to leave." | Industry Value |
| See adverse event flag | "That's a safety issue. Urgent." | Patient Value |
| See auto-generated alert | "The system caught it without human input. Powerful." | Industry Value |
| Hear closing statement | "This could save trials money and patients' lives." | Presentation |

---

## Key Phrases (use naturally, don't force)

- "Real-time risk detection from patient voice"
- "Catches patients before they disappear"
- "The coordinator doesn't search for problems — the system brings problems to them"
- "From unstructured voice to actionable clinical intelligence"
- "Adverse events detected in seconds, not days"
- "Every check-in becomes structured clinical data — automatically"
- "Built for the reality of how patients actually communicate"

---

## Failure Fallback Plan

| Problem | Fallback |
|---------|----------|
| AI takes >5 seconds | Use mock provider (remove `GEMINI_API_KEY`). Responds instantly with realistic clinical data. |
| Pipeline fails (no alert created) | Point to seed data alerts: "Here's an auto-generated alert from an earlier check-in. The system caught chest tightness and medication discontinuation." |
| Dashboard empty | Run `seed.sql` again. Or say "Let me show the check-in flow" and focus on the AI analysis result. |
| Login fails | Have second browser tab already logged in. |
| Vercel down | Demo on localhost. Always have `npm run dev` ready. |
| Presenter freezes | Know the 4 beats: Problem → Dashboard → AI → Alert. Even without words, clicking through tells the story. |

---

## Pre-Demo Checklist (15 minutes before)

- [ ] App running and accessible (localhost or Vercel)
- [ ] Logged in — dashboard visible with data
- [ ] At least 2 alerts visible on dashboard (seed data)
- [ ] Demo transcript in clipboard
- [ ] Know which patient to select (one with "active" status)
- [ ] Browser: 100% zoom, no other tabs, no dev tools
- [ ] Mock provider confirmed working (or Gemini tested and fast)
- [ ] Demo practiced at least 3 times
- [ ] Verbal narrative smooth — under 90 seconds
- [ ] Backup plan understood: show seed data if pipeline fails
