# HealthGPS — Final Steps Before Demo

The app is built. The pipeline works. Everything below is about making the demo **land** with judges.

---

## CRITICAL (must do before demo)

### 1. Remove "[MOCK]" Prefix from Mock AI Provider
**Why:** If judges see "[MOCK] Patient check-in analysis based on transcript keywords" they'll think the whole thing is fake. This is the single easiest fix with the highest demo impact.
**File:** `apps/web/lib/ai/providers/mock-ai.provider.ts`
**What to change:** Find the summary string that starts with `[MOCK]`. Remove the prefix. Rewrite the summary template to sound like a clinical note:
- Before: `"[MOCK] Patient check-in analysis based on transcript keywords. 2 symptom(s) detected."`
- After: `"Patient reports symptoms consistent with medication side effects. Analysis indicates elevated risk requiring clinical attention."`
**How to verify:** Run the app without `GEMINI_API_KEY`, submit a check-in, read the summary — it should look professional.
**Done when:** No visible "[MOCK]" anywhere in the analysis output.

### 2. Load Seed Data
**Why:** Empty dashboard = dead demo.
**How:** Supabase dashboard → SQL Editor → paste `apps/web/supabase/seed.sql` → Run
**Verify:** Login → Dashboard shows 5 patients, stat cards with numbers, alerts in panel
**Done when:** Dashboard has data on first load.

### 3. Test Full Pipeline 3 Times
**Why:** Must be 100% confident it works. No surprises on demo day.
**How:**
1. Login → Dashboard → Voice Check-in
2. Select an "active" patient
3. Paste: *"I've been having really bad headaches for the past four days. They started after I increased the dosage like the doctor said. I almost didn't take my pills yesterday because the headaches were so bad. I'm not sure I want to continue with this if it keeps up."*
4. Click "Submit & Analyze"
5. See: analysis results (summary, symptoms, risk, adverse event)
6. Navigate to Dashboard → new critical alert visible
7. Click patient → check-in and analysis in history
**Verify:** Check Supabase tables — `check_ins`, `ai_analyses`, `alerts` all have new rows
**Done when:** 3 runs, 0 failures.

### 4. Test Auth Flow
**Why:** If login breaks during demo, everything stops.
**How:** Incognito → /login → sign in → dashboard loads → sign out → sign back in
**Done when:** Smooth login/logout, no infinite redirects, no errors.

### 5. Set Vercel Environment Variables (if deploying)
**Why:** Deployed app shows 500 MIDDLEWARE_INVOCATION_FAILED without env vars.
**How:** Vercel → Project → Settings → Environment Variables → add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Done when:** Deployed URL loads without 500 error (or localhost is the demo plan).

---

## IMPORTANT (do after critical tasks)

### 6. Verify Alert Visual Impact
**Why:** Judges need to instantly see that something urgent happened when they look at the dashboard.
**File:** `apps/web/app/(app)/page.tsx`
**What to check:** Critical alerts should have red left border + red background tint. This is already coded — just verify it looks strong on screen. If the red isn't bold enough, increase the border width or tint opacity.
**How to verify:** Submit a high-risk check-in → navigate to dashboard → the new alert must visually jump out.
**Done when:** Critical alert is the first thing your eye is drawn to on the dashboard.

### 7. Practice Demo Script
**Why:** The difference between winning and losing is how confidently you present.
**How:** Read the 90-second script in `demo-plan.md` out loud 5 times. Then do it from memory while clicking through the app. Time it.
**Target:** Under 90 seconds, smooth, no fumbling, no "uh"s.
**Done when:** You can deliver the demo naturally while navigating the app.

### 8. Prepare Fallback
**Why:** If pipeline breaks live, you need plan B.
**How:**
- Bookmark a patient detail page with seed data analysis
- Know the line: "Here's what the AI found from a previous check-in" and navigate directly
- Have dashboard with seed alerts as the visual backup
**Done when:** You can demo even if the live submission fails.

---

## OPTIONAL (only if all above is done)

### 9. Animated Analysis Reveal
**File:** `apps/web/app/(app)/checkin/page.tsx`
**What:** Stagger the analysis reveal using CSS transitions — summary fades in first (0ms), symptoms (200ms), risk bar fills (400ms), adverse event flag (600ms). No new libraries.
**Done when:** Analysis appears with smooth cascade instead of instant pop.

### 10. Critical Alert Pulse Animation
**File:** `apps/web/app/globals.css`
**What:** Add `@keyframes pulse-red` animation to `.badge-critical` — subtle red glow that draws attention.
**Done when:** Critical badges on dashboard have a gentle pulse.

---

## Execution Plan (strict order)

| # | Task | Time | Priority |
|---|------|------|----------|
| 1 | Fix mock AI "[MOCK]" prefix | 10 min | CRITICAL |
| 2 | Load seed data | 5 min | CRITICAL |
| 3 | Test pipeline 3x | 15 min | CRITICAL |
| 4 | Test auth flow | 5 min | CRITICAL |
| 5 | Vercel env vars | 5 min | CRITICAL |
| 6 | Verify alert visuals | 5 min | IMPORTANT |
| 7 | Practice demo 5x | 25 min | IMPORTANT |
| 8 | Prepare fallback | 5 min | IMPORTANT |
| 9 | Animated reveal | 20 min | OPTIONAL |
| 10 | Alert pulse CSS | 10 min | OPTIONAL |

**Critical: ~40 min**
**Important: ~35 min**
**Optional: ~30 min**
**Total: ~1 hour 45 min**

---

## Verification After Each Step

| After | Check |
|-------|-------|
| #1 | AI summary reads as clinical prose, no "[MOCK]" |
| #2 | Dashboard has 5 patients + alerts |
| #3 | Pipeline works 3/3 times, Supabase has data |
| #4 | Login/logout smooth |
| #5 | Vercel loads (or localhost confirmed) |
| #6 | Critical alerts visually pop on dashboard |
| #7 | Demo under 90 seconds from memory |
| #8 | Can show seed data patient as fallback |
