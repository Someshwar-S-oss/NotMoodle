# Project Spec: Custom Moodle Client for [College Name]

## What This Is

A custom-built web app that replaces the frontend experience of our university's Moodle instance for a group of ~40 students. It does not modify or interfere with Moodle itself — it's an independent client that reads and writes data through Moodle's official Mobile Web Service API (the same API the official Moodle Android/iOS app uses), and presents it through a faster, cleaner, more usable interface.

Moodle's web UI is slow, cluttered, hard to navigate, and has weak notification/search/tracking features. This project aims to fix those specific pain points without needing any special access, admin permissions, or changes on the university's end — everything is built against APIs the university's Moodle instance already exposes to authenticated users.

## How It Works (High Level)

- Each user logs into our app with their own Moodle credentials (once), which exchanges for a Moodle API token via the standard mobile web service auth flow.
- The token is stored encrypted; our backend uses it to pull course content, assignments, grades, and calendar data on a scheduled sync (not live on every page load), caching it in our own database.
- The frontend reads from our cached data, so the app feels fast regardless of Moodle's own server speed.
- Optional integrations (Google Calendar sync, AI chat) require separate opt-in connections (Google OAuth, personal AI API key) — nothing is shared or connected without explicit user consent.

## Features

### Core
- **Deadline sync** — pulls all assignment/quiz due dates across every enrolled course into one place; optionally syncs to each user's Google Calendar with multiple custom reminders (unlike Moodle's single fixed 24-hour notification).
- **Assignment upload/submission** — submit assignments directly through the app, with confirmation pulled back from Moodle to verify the submission actually went through.
- **Unified search** — one search bar across all courses, files, and announcements (Moodle's built-in search is course-siloed and weak).
- **Cross-course view** — a single board/timeline showing everything across all courses at once, instead of navigating course-by-course.
- **Weekly digest** — an auto-generated summary (in-app and/or email) of what's due across all courses for the coming week.
- **Dark mode & typography overhaul** — a genuinely pleasant reading/browsing experience.

### Power-user
- **Command palette (Cmd/Ctrl+K)** — jump to any course, assignment, or file instantly via keyboard.
- **Inline file preview** — view PDFs, slides, and docs directly in the page instead of downloading them.
- **Personal notes** — attach private notes/todos to any course item.

### AI (Bring Your Own Key)
- **RAG chat over course content** — ask questions about lecture material, get answers grounded in the actual uploaded course content.
  - **Phase 1: Indexing (Render)**: Since course content is identical for every student, text extraction and embedding is done **once per course** by a background Render worker. When `pg_cron` detects new files, the Render worker downloads, parses, and embeds them into a shared Supabase `pgvector` store.
  - **Phase 2: Answering (Vercel)**: When a user asks a question, the fast Vercel API instantly embeds the question, queries `pgvector` for relevant chunks, and generates the answer using the user's own free-tier Groq or Gemini API key (BYOK). This avoids Render's cold start for live user chats.

### Collaborative
- **Shared wiki per course** — a lightweight, opt-in collaborative notes page per course, for crowdsourced notes/resources, replacing scattered WhatsApp/Discord sharing.

## Tech Stack (all free-tier)

| Layer | Service | Notes |
|---|---|---|
| Frontend | Vercel (Next.js) | Static + edge rendering where possible |
| Live API / Proxy | Vercel Serverless | Instant responses for user actions; proxies Moodle API calls and performs light tasks (e.g., RAG retrieval) |
| Background Worker | Render (Web Service) | Triggered by `pg_cron` to handle heavy background tasks (downloading files, extracting text, generating RAG embeddings) |
| Database | Supabase (Postgres + pgvector) | Cached course/assignment/grade data, wiki content, notes, encrypted tokens, shared course-content embeddings |
| Scheduled sync | Supabase pg_cron | Refreshes each user's Moodle data on a staggered schedule (not live per-request) |
| Auth | Supabase Auth | App-level login/session handling |
| Calendar sync | Google Calendar API | Free tier, OAuth per user, custom reminder scheduling |
| AI chat | Groq / Gemini free APIs | BYOK model — each user supplies and stores their own personal API key |
| Notifications | Web Push (service worker) | Free, no third-party service needed |

## Security & Trust Notes

- Moodle tokens and any personal API keys are stored encrypted, never exposed to frontend JavaScript.
- The app is opt-in for every feature beyond the core dashboard — Google Calendar sync, AI chat, and wiki participation all require separate explicit consent.
- Data deletion is available on request — any user can have their stored tokens and cached data removed.
- This project is not officially affiliated with or endorsed by the university; IT has been (or will be) informed as a courtesy since the app uses students' Moodle credentials via the mobile web service.
