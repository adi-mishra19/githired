# GitHired — Interview Preparation Guide

> A companion document to walk through the project end-to-end and defend every
> design decision in an interview setting. Every claim below can be traced to a
> file/line in the repo.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
   - What it is
   - Who it's for
   - Feature map by role
   - High-level architecture
   - Data model at a glance
   - End-to-end request flow
2. [Frontend — Interview Q&A](#2-frontend--interview-qa)
3. [Backend & API — Interview Q&A](#3-backend--api--interview-qa)
4. [Database & ORM — Interview Q&A](#4-database--orm--interview-qa)
5. [Authentication & Authorization — Interview Q&A](#5-authentication--authorization--interview-qa)
6. [AI / LLM Layer — Interview Q&A](#6-ai--llm-layer--interview-qa)
7. [Testing & Quality — Interview Q&A](#7-testing--quality--interview-qa)
8. [Infra, Tooling & Tradeoffs — Interview Q&A](#8-infra-tooling--tradeoffs--interview-qa)
9. [Cross-cutting "Why X over Y" Cheatsheet](#9-cross-cutting-why-x-over-y-cheatsheet)
10. [Whiteboard-Ready Diagrams](#10-whiteboard-ready-diagrams)

---

## 1. Project Overview

### 1.1 What is GitHired?

**GitHired** is a full-stack AI-powered job placement platform that connects
three user types: **students** (applicants), **companies** (recruiters), and
**admins** (platform moderators). It combines standard applicant-tracking-system
(ATS) workflows with AI features: natural-language-to-SQL analytics,
LLM-driven resume ATS scoring, and profile gap analysis.

Think of it as **LinkedIn Jobs + Handshake + a Metabase-style analytics
assistant, but built for a campus / placement-cell context**.

### 1.2 Who it's for

| Role | Primary use cases |
|------|-------------------|
| **Student** | Build profile, upload resumes, browse eligible jobs, apply, track applications on a kanban board, get AI ATS scores + profile-gap suggestions, compare with peers |
| **Company** | Verify org, post jobs, view ranked applicants, schedule interview rounds, update application statuses, get hiring-funnel analytics |
| **Admin** | Approve/reject/ban students and companies, verify SRNs, monitor all jobs & applications, oversee platform |

### 1.3 Feature map

**Student**
- Profile builder with education, experience, projects, skills, certifications
- Multi-resume upload (S3 presigned URLs, PDF)
- Job discovery with **eligibility filtering** (CGPA cutoff, course, degree)
- One-click apply with cover letter + resume selection
- Application tracker + **kanban board** across statuses
- Interview calendar (per round: OA → R1 → R2 → R3 → HR)
- **AI ATS Scan** — LLM analyzes resume text (extracted via `pdf2json`) against JD
- **Profile-gap analyzer** — LLM suggests missing skills/projects vs market demand
- **Peer comparison** — pure-SQL analytics: percentile of CGPA, applications, skills, profile completeness
- **AI Assistant** (⌘K modal) — ask questions like *"jobs I'm eligible for but haven't applied to"*

**Company**
- Company profile with tech stack, benefits, culture, office locations
- Post jobs with rich Tiptap-based "About the role", eligibility filters, deadline
- **Auto-notify** eligible students via email when job is posted
- Applicant list **ranked by CGPA×10 + skills-match %**
- Schedule interviews per round; status auto-advances (`round_1` → `interview_round_1`)
- Update application status → student gets branded email
- Toggle job active ↔ stopped

**Admin**
- Approve/reject/ban students & companies with admin notes
- SRN validation (PES1UG20CS001 format regex)
- Bulk moderation with per-item success/failure tracking (`Promise.allSettled`)
- Platform-wide job + application views

### 1.4 High-level architecture

```
                       ┌───────────────────────────┐
                       │      Browser (React 19)   │
                       │   Next.js 15 App Router   │
                       │   • RSC + Client Comp     │
                       │   • Tailwind 4 + shadcn   │
                       └────────────┬──────────────┘
                                    │  fetch / server actions
                                    ▼
                       ┌───────────────────────────┐
                       │     Next.js API Routes    │
                       │  /app/api/{admin,company, │
                       │      student,ai,auth}     │
                       │  • Session check          │
                       │  • Role guard             │
                       │  • Zod validation         │
                       └──────┬──────────┬─────────┘
                              │          │
                              ▼          ▼
              ┌───────────────────┐ ┌───────────────────┐
              │  Server modules   │ │  lib/ai/*         │
              │  server/*.ts      │ │  • llm-provider   │
              │  (business logic) │ │  • query-generator│
              │                   │ │  • sql-validator  │
              │                   │ │  • ats-analyzer   │
              └────────┬──────────┘ └────────┬──────────┘
                       │                     │
                       │   Drizzle ORM       │  Gemini / OpenAI /
                       ▼                     ▼   Anthropic / Custom
              ┌───────────────────┐ ┌───────────────────┐
              │  Neon Postgres    │ │   LLM Providers   │
              │  (serverless HTTP)│ │                   │
              │  12 tables        │ │                   │
              └───────────────────┘ └───────────────────┘

External:  Resend (email)  ·  AWS S3 (resumes)  ·  Google OAuth
```

### 1.5 Data model at a glance

12 tables. Auth from Better Auth (`user`, `session`, `account`, `verification`)
plus 8 domain tables:

- `students` — profile + `analytics` JSONB, `resumes[]` JSONB, `status`
- `companies` — profile + `analytics` JSONB, `verified`, `status`
- `jobs` — belongs to company, eligibility rules, `analytics` JSONB
- `applications` — junction (student × job) with **snapshot fields**
  (`studentCgpa`, `studentCourse`, `studentDegree` frozen at apply time)
- `interviews` — belongs to application, per-round scheduling
- `aiQueries` — NL query history + generated SQL + insights + chart type
- `queryTemplates` — prebuilt NL queries per role
- `atsScans` — LLM ATS analysis results per resume
- `profileSuggestions` — cached LLM gap analysis per student

All FKs cascade on delete. Indices on `status + createdAt DESC` for admin
lists, `(jobId, studentId)` unique on applications.

Full schema in `db/schema.ts`.

### 1.6 End-to-end request flow: "Student applies to a job"

1. **Client**: `POST /api/student/jobs/:id/apply` with `{ coverLetter, resumeUrl, resumeLabel }`
2. **Middleware** (`middleware.ts`) — checks session, verifies role=`student`, status=`approved`
3. **API route** — parses body, calls `applyToJob()` in `server/applications.ts`
4. **Business logic**:
   - Load job + student
   - Reject if job stopped / deadline passed
   - `checkEligibility()` — CGPA ≥ cutoff, course ∈ eligible, degree ∈ eligible
   - Reject if duplicate application (`(jobId, studentId)` unique index catches this too)
   - INSERT `applications` row with **snapshot** of student's CGPA/course/degree
   - `UPDATE jobs SET analytics = jsonb_set(...)` and same on `students`
5. **Response** — 201 with application id
6. **Company sees it** — `GET /api/company/jobs/:id/applications` returns ranked list
7. **Company updates status** — `PATCH /api/company/applications/:id/status`
   → `updateApplicationStatus()` also **sends a Resend email** with a React
   Email template (`ApplicationStatusUpdateEmail`)

---

## 2. Frontend — Interview Q&A

### Q. Walk me through the frontend architecture.

**A.** Next.js 15 App Router. Routes are grouped by role: `/dashboard` for
students, `/dashboard/company/*` for companies, `/dashboard/admin/*` for
admins. A single dashboard layout (`app/dashboard/layout.tsx`) wraps every
authenticated page with a `SidebarProvider` and a role-aware `<AppSidebar>`
that server-renders the correct nav based on the session's `user.role`.

Public routes: `/`, `/login`, `/signup`, `/forgot-password`,
`/reset-password`, `/verify-email`, `/select-role`.

UI is **shadcn/ui** components on top of **Radix UI primitives**, styled with
**Tailwind CSS v4**. Rich text is **Tiptap 3**. Charts are **Recharts**.
Animations are **motion** (Framer Motion). Toasts are **Sonner**.

### Q. Why shadcn/ui + Radix instead of MUI / Chakra?

**A.** shadcn/ui is a *copy-into-your-repo* pattern — no runtime dependency,
components live in `components/ui/*` and are fully editable. Radix supplies
accessibility (ARIA, focus traps, keyboard nav) for free. MUI/Chakra are
runtime dependencies that ship large CSS-in-JS runtimes and are harder to
theme with Tailwind. With shadcn we own the source and can tailor variants
via `class-variance-authority`.

### Q. How is form validation handled?

**A.** `react-hook-form` + `zod` via `@hookform/resolvers/zod`. Each form
(`login-form.tsx`, `signup-form.tsx`, etc.) defines a `zodResolver` and
declares a schema (e.g., email format, password 8+). The same Zod schemas
could be reused server-side — the pattern is single-source-of-truth for
input contracts.

**Why zod over yup / joi?**
- TypeScript-first (types are inferred, not annotated)
- Composable (`.merge`, `.pick`, `.omit`, `.extend`)
- Works client + server + in tRPC-style API contracts
- Better tree-shaking

### Q. What state management library are you using?

**A.** Minimal: no Redux / Zustand. Server state goes through **TanStack
Query** where cached, otherwise plain `fetch` + `useState`/`useEffect` (the
codebase leans on RSC for initial data and only reaches for React Query on
interactive dashboards). URL state (search filters) uses **nuqs** —
a Next.js-native `useState`-like hook that persists to the querystring, so
sidebar search survives reloads and is shareable via URL.

### Q. How does the dark/light theme work?

**A.** `next-themes` with a `ThemeProvider`. `mode-toggle.tsx` writes to
localStorage + a `data-theme` attribute; Tailwind's `dark:` variants pick
that up. SSR-safe (no flash of wrong theme thanks to `next-themes`'
`suppressHydrationWarning` pattern).

### Q. What's in the AI Assistant modal?

**A.** `components/ai-assistant-modal.tsx`. Cmd/Ctrl+K opens it. Three tabs:
**Templates** (role-specific canned queries), **History** (past queries),
**Results** (SQL + chart). It POSTs to `/api/ai/query`, receives
`{ sql, data, insights, chartType, visualization }`, and renders a
`<DynamicChart>` (Recharts bar/line/pie/radar/funnel/table). CSV export is
built-in.

### Q. Rich text editor — why Tiptap?

**A.** Tiptap wraps **ProseMirror**, which is the same engine behind Notion,
Confluence, and the New York Times editor. Tradeoff vs Slate: Tiptap has
better plugin ecosystem, cleaner React bindings, and less "fight the
framework" quirks. Slate is more flexible but you'll write more glue.

---

## 3. Backend & API — Interview Q&A

### Q. Walk me through the backend layers.

**A.** Three layers:

1. **API routes** (`app/api/**`) — thin adapters. Parse request, call a
   server-module function, return JSON. HTTP status codes, no business logic.
2. **Server modules** (`server/*.ts`) — pure business logic. `applyToJob()`,
   `updateApplicationStatus()`, `scheduleInterview()`, etc. These functions
   do the auth check + Drizzle queries + side effects (emails).
3. **DB layer** — Drizzle schema in `db/schema.ts`, Neon serverless driver in
   `db/drizzle.ts`.

This separation makes the server modules unit-testable in isolation (mock
Drizzle, no HTTP needed) and keeps API routes tiny.

### Q. How do you handle authorization inside API routes?

**A.** Every server-module function starts with:
```ts
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) throw new Error("Unauthorized");
if (session.user.role !== "company") throw new Error("Forbidden");
```
Plus middleware.ts guards routes at the edge (redirects unauthenticated
users). Defense in depth: middleware protects routes, server modules
re-check on every call.

### Q. Why not tRPC or GraphQL?

**A.** Next.js App Router API routes are a good fit for a role-based CRUD
app of this size. tRPC is nice for end-to-end type safety but adds a build
step and RPC-style thinking that doesn't buy much when the frontend already
lives in the same repo (types are shared via `import`). GraphQL is overkill
— we don't have client-driven query composition needs; every screen has
predictable data requirements.

### Q. How does file upload work? Why presigned URLs?

**A.** `lib/storage.ts` generates **S3 presigned PUT URLs** (15-min TTL).
Flow:
1. Client: `POST /api/student/resume/presigned-url` with filename + type
2. Server: mints presigned URL scoped to `resumes/{userId}/{ts}-{name}`
3. Client: `PUT` the PDF **directly to S3** (no bytes through our server)
4. Client: `PATCH /api/student/profile` with the S3 URL

**Why this pattern:**
- No server bandwidth for uploads (huge scale win)
- No serverless runtime hitting Next.js body-size limits
- Direct S3 puts are faster (bypass Vercel edge)
- Presigned URLs expire, so links are single-use

CDN via CloudFront if `AWS_CLOUDFRONT_URL` is set, else direct S3.

### Q. Rate limits & retries in the notification flow?

**A.** When a company posts a job, we fan out emails to eligible students.
The code catches Resend rate-limit errors and continues gracefully so a job
post doesn't fail because of email throttling
(`server/jobs.ts::createJob`).

### Q. How is the applicant list ranked?

**A.** In `server/applications.ts::getJobApplications`:

```
rank_score = studentCgpa * 10 + skillsMatchPercent
```

Skills-match uses **bidirectional substring matching** so "React" matches
"ReactJS" and "JS" matches "JavaScript". Not vector similarity — chosen for
determinism (an interviewer can reproduce the rank by hand).

### Q. Emails — architecture?

**A.** **Resend** for delivery, **React Email** (`@react-email/components`)
for templates. Templates live in `components/emails/*.tsx` — a `Button`,
`Text`, `Container` from React Email compile to inline-styled HTML that
renders correctly in Gmail/Outlook. Four templates: verification, password
reset, application-status-update, new-job-notification.

---

## 4. Database & ORM — Interview Q&A

### Q. Why Drizzle over Prisma?

**A.** Three reasons:

1. **Edge/serverless friendly.** Drizzle is a thin query builder; no
   generated client, no engine binary. Prisma's Rust engine adds cold-start
   latency and doesn't run on some edge runtimes cleanly.
2. **SQL-centric.** Drizzle's API mirrors SQL (`select().from().where()`)
   so complex joins, CTEs, and window functions are ergonomic. Prisma
   abstracts SQL away and leans on nested `include`s.
3. **Zero-runtime types.** Types come from schema inference at compile
   time, no `prisma generate` needed after every schema tweak.

**Tradeoff:** Prisma has better migration UX and a nicer Studio. Drizzle
Kit's migration story is less polished.

### Q. Why Neon serverless over classic Postgres?

**A.** Neon exposes Postgres over **HTTP**, not the wire protocol. That
means:
- **No connection pooling nightmares** on serverless runtimes. Each
  Vercel/Lambda invocation opens an HTTP request (stateless), not a TCP
  connection to the DB.
- **Branching** for preview environments (dev/staging/prod isolation).
- **Auto-scale to zero** in dev.

**Tradeoff:** HTTP has higher per-query latency than direct TCP (~10-30ms
overhead). For a high-QPS OLTP hot path you'd still use pooled TCP
(PgBouncer). For this app, the tradeoff is worth it.

### Q. Explain the "snapshot" pattern on applications.

**A.** When a student applies, we copy `studentCgpa`, `studentCourse`,
`studentDegree` **into the applications row**. This freezes the application
data at apply time so that:
- If a student later updates their profile, historical applications still
  reflect what was submitted.
- Ranking / filtering by the company is consistent even if the student
  edits their profile mid-cycle.
- Auditability — an admin can see exactly what was true when the applicant
  applied.

This is a common pattern in job apps, healthcare records, and finance —
called **temporal snapshotting** or **event-time capture**.

### Q. How do you prevent duplicate applications?

**A.** Composite unique index on `(jobId, studentId)` in `applications`.
The business-logic layer also checks first for a friendlier error, but the
DB is the ultimate guard.

### Q. What's stored in JSONB vs relational columns?

**A.**
- **JSONB**: `analytics` (denormalized counters), `resumes` (array of
  `{label,url,uploadedAt}`), `education`, `experience`, `projects`,
  `certifications`, `benefits`, `officeLocations`, `aboutRole` (Tiptap JSON).
- **Relational**: everything with foreign keys or that we'd filter/sort by
  frequently (cgpa, status, skills, etc.).

**Why JSONB for education/experience/projects?** They're heterogeneous
(multiple entries per student, each with different shapes), rarely queried
by SQL predicates, always read/written together, and only ever displayed
in the profile view. A separate table would add join cost with no gain.

**Why `skills` as `TEXT[]` and not JSONB?** Postgres has native array
operators (`ANY`, `@>`, GIN indexing on arrays) — better for the ranking
query that does substring matches.

---

## 5. Authentication & Authorization — Interview Q&A

### Q. Why Better Auth over NextAuth?

**A.**
- **TypeScript-first.** NextAuth's types improved recently but Better Auth
  was designed types-first — better inference, cleaner plugin API.
- **Lighter runtime.** Better Auth has smaller bundle and fewer
  abstractions between you and the DB.
- **Plugin composition.** OAuth, email/password, 2FA, magic links are all
  plugins that can be combined. NextAuth's provider model is more rigid.
- **Drizzle adapter is native.** Schema is defined in code
  (`auth-schema.ts`) and migrations are just Drizzle migrations.

**Tradeoff:** Better Auth is newer (less battle-tested at scale), smaller
community, fewer StackOverflow answers.

### Q. Session model?

**A.** Database-backed sessions (not JWTs). `session` table stores token +
expiry + `userId` + `ipAddress` + `userAgent`. Cookie carries the token,
server looks up on each request. 7-day expiry, refreshes if within 1 day.

**Why DB sessions over JWT?**
- Revocable (JWTs can't be revoked without a blocklist)
- Small cookie (JWT with role + email + etc. gets fat)
- Audit trail (ip, user-agent per session)

### Q. How is role enforcement done?

**A.** Two layers:
1. **Middleware** (`middleware.ts`) — runs at the edge. Redirects
   unauthenticated users to `/login`, unverified users to `/verify-email`,
   pending users to `/dashboard/pending`, wrong-role users to their
   correct dashboard.
2. **Server modules** — every function calls
   `auth.api.getSession()` + checks `user.role`. Never trust the client.

### Q. What's the SRN check?

**A.** Students verify their identity with a **campus SRN** (a
university-issued roll number like `PES1UG20CS001`). Server-side regex
validates the format, admin must approve, and once `srnValid=true` the
student can no longer edit it (prevents ID-swap).

---

## 6. AI / LLM Layer — Interview Q&A

### Q. Explain the LLM abstraction.

**A.** `lib/ai/llm-provider.ts` exposes a single interface:

```ts
interface LLMProvider {
  generateCompletion(prompt, opts): Promise<string>
  generateStructuredResponse<T>(prompt, schema, opts): Promise<T>
}
```

The active provider is chosen by `LLM_PROVIDER` env var (default: `gemini`).
Providers: Gemini, OpenAI, Anthropic, and a "custom" bucket that supports
Hugging Face, LocalAI, Ollama, or a fine-tuned endpoint (OpenAI-compatible
schema). Each provider is lazy-loaded (`require`) so unused SDKs don't
bloat cold start.

**Why abstract?**
- **Cost control.** Swap to cheaper models for non-critical paths.
- **Fallbacks.** If Gemini throws quota errors, we can retry on another
  provider.
- **Testing.** Mock the interface, not the SDK.
- **Vendor lock avoidance.** Every LLM provider has had outages in 2024–2026.

### Q. Walk me through the NL-to-SQL pipeline.

**A.** End-to-end (files in `lib/ai/` and `server/ai/query-executor.ts`):

```
Natural language query
        │
        ├── Non-data check ("hi", "help") → return canned response
        │
        ▼
Build prompt (query-generator.ts)
  • Full schema description
  • Role-based table allowlist
  • Context: currentUserId, studentId, companyId
  • CRITICAL SYNTAX RULES section (phantom aliases, CTE columns,
    PERCENT_RANK, division by zero)
        │
        ▼
LLM.generateStructuredResponse()
  → { sql, explanation, chartType, visualization }
        │
        ▼
SQL validator (sql-validator.ts)
  1. Forbidden keywords: DROP, DELETE, INSERT, UPDATE, ALTER, EXEC, GRANT...
  2. Sensitive columns: password, access_token, id_token, api_key, secret, token
  3. Role → table allowlist
     • Student: own applications + active jobs
     • Company: own jobs + applications to their jobs
     • Admin: everything except auth tables
  4. Phantom alias detection (parses FROM, tracks aliases + CTEs)
  5. Percentile function sanity (rejects PERCENT_RANK WITHIN GROUP)
        │
        ▼
Auto-inject WHERE clause based on role
  • Student: students.user_id = :currentUserId
  • Company: applications.job_id IN (SELECT id FROM jobs WHERE company_id = :cid)
  (CTEs handled separately so percentile CTEs see the full dataset)
        │
        ▼
Execute via Drizzle raw SQL with 10s timeout
        │
        ├── If PG error is recoverable (42601 syntax, 42703 undef col,
        │   42P01 undef table, 42803 grouping, 22012 div-by-zero)
        │   → feed error back to LLM, retry (max 2 attempts)
        │
        ▼
Generate insights (second LLM call summarizing rows)
        │
        ▼
Persist to aiQueries table (audit + history)
        │
        ▼
Return { data, sql, explanation, chartType, visualization, insights, executionTime }
```

### Q. How do you prevent SQL injection when the SQL comes from an LLM?

**A.** **Five layers of defense** — this is the interview-favorite question.

1. **LLM returns structured JSON**, not raw SQL. The response schema is
   locked (`{ sql, explanation, chartType }`) — an attacker can't inject via
   the natural language and have it "escape" into the response envelope.
2. **Only SELECT allowed.** Word-boundary regex on the SQL rejects any
   mutating verb (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`,
   `TRUNCATE`, `CREATE`, `REPLACE`, `EXEC`, `GRANT`, `REVOKE`).
3. **Multiple statements rejected.** Semicolon-separated statements are
   filtered — one query per request.
4. **Role → table allowlist.** A student query touching `user` or
   `admin_note` is rejected before it hits the DB.
5. **Auto-injected WHERE clauses.** Even if the LLM omits a filter, the
   validator adds `students.user_id = :currentUserId` (or equivalent) so
   students can't see other students' data.

Plus **sensitive column blacklist** (`password`, `access_token`,
`api_key`...) blocks a query like `SELECT * FROM user`.

### Q. What happens when the LLM generates syntactically broken SQL?

**A.** Self-correction loop. On PG error codes for syntax (42601),
undefined column (42703), undefined table (42P01), grouping (42803), or
div-by-zero (22012), the executor calls the LLM again with:
- The previous SQL
- The error message

Max 2 attempts. If it still fails, we return a friendly error. This
improved semantic accuracy from ~85% to ~91% based on the LLM accuracy
tests in `tests/llm-accuracy/`.

### Q. How does ATS scoring work?

**A.** `lib/ai/ats-analyzer.ts`. Flow:

1. Student's resume PDF is on S3
2. Server fetches it, extracts text with `pdf2json` (page-by-page)
3. Build prompt: resume text + optional job description
4. LLM returns:
   - Overall score 0–100
   - Formatting sub-score + issues
   - Content sub-score + issues
   - Matched keywords / missing keywords (if JD provided)
   - Strengths / weaknesses / suggestions
5. Persist to `atsScans` table (student sees last 20)

Scoring rubric is baked into the prompt: 0–40 poor, 40–60 below avg,
60–75 avg, 75–85 good, 85–95 excellent, 95–100 outstanding.

**Why not compute this deterministically (keyword matching)?** Deterministic
ATS checkers exist but they miss *why* something is wrong. An LLM can say
"your bullet points are noun phrases, recruiters prefer verb-led lines" —
that's the differentiator.

### Q. What is the `nlp-sql-engine/` folder?

**A.** A **separate research artifact** — a fine-tuning pipeline for
**Mistral-7B with LoRA adapters** on placement-domain NL-to-SQL. It's a
Streamlit app + training/dev data. **Not wired into the production app** —
production uses the multi-provider abstraction. If asked why we didn't ship
the fine-tuned model: cost/complexity of hosting it (needs GPU inference)
vs Gemini Flash being cheap and good enough for this domain. Keeping it as
a research track lets us swap it in later via the "custom" provider.

### Q. Peer comparison — LLM or SQL?

**A.** Pure SQL. `lib/analytics/peer-comparison.ts` computes:
- CGPA percentile (`PERCENT_RANK() OVER (ORDER BY cgpa)`)
- Applications count percentile
- Success rate (selected / total)
- Skills-count vs peer average + top-10 skills in the peer pool
- Profile-completeness score (weighted rubric across 8 dimensions)

**No LLM here** — the answer is a number, not a narrative. LLMs are
non-deterministic and slow; SQL is exact and cached-friendly.

---

## 7. Testing & Quality — Interview Q&A

### Q. Walk me through the testing strategy.

**A.** Classic pyramid (per `docs/testing/TESTING_STRATEGY.md`): **60%
unit, 30% integration, 10% E2E**, plus specialized suites for LLM
accuracy, security, and load.

- **Unit** (`tests/unit/`) — 13 files. Mock DB + LLM SDKs, test pure
  functions. Covers server modules, AI utilities, lib helpers.
- **Integration** (`tests/integration/`) — real Drizzle against a
  Postgres service in CI, full student journey (signup → profile → apply
  → AI query).
- **E2E** (`tests/e2e/`) — Playwright on 5 browsers (desktop Chrome,
  Firefox, Safari, mobile Pixel 5 & iPhone 12). Includes axe-core a11y
  scans.
- **LLM accuracy** (`tests/llm-accuracy/`) — benchmarks SQL generation
  across aggregation / filter / join / temporal / complex categories.
  Tracks syntax correctness (~97.8%), semantic accuracy (~91.2%), latency
  (avg 1.2s, p95 1.9s).
- **Security** (`tests/security/`) — OWASP Top 10, SQL injection with 6
  vectors (classic, boolean-based, time-based, stacked, second-order,
  JSON).
- **Performance** (`tests/performance/api-load.yml`) — Artillery load
  scenarios (warm-up → ramp → sustained), 40/30/30 traffic mix, p95 <2s
  threshold.

CI runs the pyramid on every PR; LLM-accuracy tests run nightly at 2 AM
UTC because they cost real tokens.

### Q. Why 70% coverage threshold, not 80% or 90%?

**A.** Pragmatic. Coverage number ≠ test quality. We enforce 70% globally
but the **critical paths** (`sql-validator`, `query-generator`, `auth`,
`storage`) are at 90–97%. Chasing 90% globally means testing dashboards
and glue code that add little safety.

### Q. Why include LLM accuracy as a test type?

**A.** LLMs regress silently when providers update models. If Gemini
changes tokenizer behavior or Anthropic ships a new Claude, our SQL
generation can degrade without any code change. The nightly benchmark
catches that. If semantic accuracy drops below 90%, the CI job flags it.

### Q. Playwright — why 5 browser projects?

**A.** Real users are on all of them, and each engine has different
quirks:
- WebKit (Safari) is stricter about cookies (SameSite defaults)
- Firefox handles focus outlines differently
- Mobile viewports catch responsive bugs desktop won't

Playwright is faster than Cypress for cross-browser (Cypress needs
plugins for WebKit) and its trace viewer is a killer debugging tool.

---

## 8. Infra, Tooling & Tradeoffs — Interview Q&A

### Q. Turbopack for production — bold choice. Why?

**A.** Turbopack is Rust-based (vs Webpack's JS), so builds are 5–7×
faster in our benchmarks. The tradeoff visible in `next.config.ts`:
- `typescript.ignoreBuildErrors: true` (with a "TEMP FIX" comment)
- `eslint.ignoreDuringBuilds: true`

We run `tsc --noEmit` and `eslint` in CI separately so the safety net is
still there; we just skip re-doing it during `next build`. If Turbopack
had stability issues we'd flip back to webpack — the codebase is
webpack-compatible.

### Q. Why Next.js 15 + React 19 (both bleeding edge)?

**A.** Practical: React Server Components mature, streaming SSR, and the
Turbopack story only exists on 15. Risk: bugs in edge cases. Mitigation:
comprehensive test suite catches breakage early. Sensible tradeoff for a
greenfield project; would not upgrade a stable prod app mid-quarter.

### Q. Where would this app break at scale?

**A.** Honest answer:
1. **Emails on job post.** Fanning out to hundreds of students on
   `createJob` is inline. Should be a queue (SQS/BullMQ) with a worker.
2. **AI query cost.** Every query calls the LLM twice (SQL gen + insight
   summary). No caching layer. A popular query template hits Gemini every
   time. A response cache keyed on (role, promptHash) would slash costs.
3. **Neon HTTP latency.** ~10-30ms/query; a page loading 5 queries pays
   50-150ms. For hot pages, batch queries or use a connection-pooled
   Postgres.
4. **Ranking on read.** `getJobApplications` computes ranks in JS on every
   fetch. At >1000 applicants per job, precompute a `rank_score` column
   on write.
5. **Middleware auth check.** `getSession` hits the DB on every
   navigation. Better Auth supports cookie-cache — not enabled yet.

### Q. What would you refactor first?

**A.** Three things:
1. Extract the LLM query pipeline into a **queue-driven job** so long
   queries (>5s) don't hold an API connection.
2. Introduce an **application status state machine** — the
   `pending → oa → interview_round_1 → …` progression is currently
   scattered across `updateApplicationStatus` and `scheduleInterview`.
   A single reducer would make invalid transitions impossible.
3. Move email-fanout to **a background worker** with retry + dead-letter.

---

## 9. Cross-cutting "Why X over Y" Cheatsheet

| Choice | Alternative(s) | Why we picked it |
|--------|----------------|------------------|
| Next.js 15 App Router | Remix, SvelteKit, Nuxt | RSC + streaming + Vercel hosting parity; largest ecosystem for React |
| React 19 | React 18 | Server Components mature, `use()` hook, automatic batching |
| TailwindCSS 4 | CSS Modules, Emotion, styled-components | Utility-first speed, new engine performance, no runtime JS |
| shadcn/ui + Radix | MUI, Chakra, Mantine | Own the source, no runtime dep, best-in-class a11y |
| react-hook-form + zod | Formik + yup | Uncontrolled inputs (fewer re-renders), TS-first schema |
| TanStack Query | SWR, Apollo | Best cache invalidation model, mutation UX |
| nuqs | Custom `useSearchParams` wrapping | Type-safe URL state, Next.js-native |
| Drizzle | Prisma, Kysely, TypeORM | SQL-centric, edge-friendly, zero-runtime types |
| Neon serverless | Supabase pg, Railway pg, RDS | HTTP driver = no pool headaches on serverless |
| Better Auth | NextAuth v5, Clerk, Auth0 | TS-first, self-hosted, cheaper at scale |
| Resend + React Email | SendGrid, Mailgun, SES | JSX templates, modern DX, better dev-mode preview |
| AWS S3 | Cloudflare R2, Supabase Storage | Presigned URL support, CloudFront integration |
| Multi-provider LLM abstraction | Direct SDK calls | Vendor flexibility, cost switching, testability |
| Gemini 2.0 Flash (default) | GPT-4o, Claude Sonnet | Cheapest quality-per-token for structured JSON |
| Tiptap (ProseMirror) | Slate, Lexical, Quill | Best plugin ecosystem, cleaner React bindings |
| Recharts | Chart.js, Victory, Nivo | React-native, composable, TS types |
| Jest | Vitest | Team familiarity, stable ts-jest transformer |
| Playwright | Cypress | Native multi-browser (WebKit), faster, better trace viewer |
| Artillery | k6, Locust | YAML config, easier for Node teams |
| Turbopack | Webpack, Vite (via Nitro) | 5–7× faster builds; accepts ignore-during-build tradeoff |

---

## 10. Whiteboard-Ready Diagrams

### 10.1 Roles & lifecycle

```
        signup                            approve
   ─────────────►  status=pending  ──────────────►  status=approved
                        │                                │
                        │ reject                         │ ban
                        ▼                                ▼
                  status=rejected                   status=banned
                        │                                │
                        │ unreject                       │ unban
                        ▼                                ▼
                  status=pending                   status=approved
```

### 10.2 Application status machine

```
   apply       ┌── company advances round ──┐
     │         │                             │
     ▼         ▼                             ▼
  pending ─► oa ─► interview_round_1 ─► interview_round_2 ─► interview_round_3
                                                                    │
                     any stage can go to:  ────► selected           │
                                           ────► rejected  ◄────────┘
```

### 10.3 NL-to-SQL pipeline (compact)

```
    NL query
       │
       ▼
  ┌─────────────────┐
  │ query-generator │  LLM call #1 → { sql, chartType, viz }
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ sql-validator   │  5 defense layers:
  │                 │   1. keyword blacklist
  │                 │   2. sensitive columns
  │                 │   3. role→table allowlist
  │                 │   4. phantom alias detection
  │                 │   5. auto-inject WHERE
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ query-executor  │  Drizzle exec (10s timeout)
  │                 │  On recoverable PG error → retry (max 2)
  └────────┬────────┘
           ▼
  ┌─────────────────┐
  │ insights (LLM #2)│  Summarize rows into a narrative
  └────────┬────────┘
           ▼
    Persist to aiQueries, return to client
```

### 10.4 Data model (12 tables, minimal ERD)

```
   user ─── session
    │  │
    │  └─ account (oauth)
    │
    ├── students ─── atsScans
    │       │      ─── profileSuggestions
    │       └────── applications ─── interviews
    │                    │
    │                    ▼
    ├── companies ── jobs ─────────┘
    │
    └── aiQueries
        queryTemplates
```

---

## Appendix — Fast-fact one-liners

- **Framework:** Next.js 15 App Router, React 19, TypeScript 5.9 strict
- **DB:** PostgreSQL on Neon (serverless HTTP), Drizzle ORM, 7 migrations
- **Auth:** Better Auth (DB-backed sessions, 7-day expiry, Google OAuth + email/password)
- **LLM:** Provider-agnostic (Gemini default, OpenAI, Anthropic, custom)
- **Storage:** S3 presigned URLs + optional CloudFront
- **Email:** Resend + React Email templates
- **Tests:** 372 tests, 82.5% coverage, 6 suites (unit / integration / E2E / LLM / security / perf)
- **CI:** GitHub Actions, 7 jobs, nightly LLM benchmarks
- **Build:** Turbopack for dev *and* prod

If an interviewer asks **one thing you're proud of**, lead with the
**SQL-injection defense architecture** (5 layers) or the
**self-correcting NL-to-SQL loop** — both are technically deep and show
awareness of the failure modes of LLMs in production.
