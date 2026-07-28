# Sub-Project 1: Foundation & Dashboard

## Overview
This is the first sub-project in building the custom Moodle client. It focuses on the core foundation: setting up the Next.js application, integrating Supabase for authentication and data storage, creating the Moodle token exchange flow, and building the unified cross-course timeline dashboard.

## Architecture
- **Frontend**: Next.js (App Router), deployed on Vercel.
- **Backend/API**: Vercel Serverless Functions to proxy Moodle API requests securely.
- **Database**: Supabase PostgreSQL for caching data and managing sessions.
- **Authentication**: Supabase Auth.

## Authentication Flow
We will implement a Two-Step Login process:
1. **App Identity**: The user signs up and logs in via Supabase Auth (email/password). This creates a persistent user session in our app.
2. **Moodle Connection**: Once logged in, if the user hasn't connected Moodle, they are prompted to enter their Moodle username and password.
3. **Token Exchange**: 
   - The Next.js frontend sends these credentials to a secure Next.js API route.
   - The API route calls the Moodle API (`POST /login/token.php`).
   - The returned `wstoken` is encrypted and stored in the `moodle_connections` table in Supabase, linked to the user's Supabase ID.
   - The plaintext Moodle credentials are discarded immediately.

## Data Model (Initial)
- `users` (managed by Supabase Auth)
- `moodle_connections`: `user_id`, `encrypted_token`, `created_at`, `last_sync`
- `courses`: `moodle_course_id`, `fullname`, `shortname`
- `course_enrollments`: `user_id`, `moodle_course_id`
- `course_modules`: `moodle_module_id`, `course_id`, `type` (resource, assign, forum), `name`, `url`, `published_at`

## Dashboard: Cross-Course Timeline
- **Layout**: A unified, chronological feed merging all course announcements, newly uploaded files, and upcoming deadlines, prioritized by recency and urgency.
- **Loading UX**: When a user first connects their Moodle account, the initial data fetch (courses and their contents) will happen in the background. The user will be immediately taken to the dashboard, which will display skeleton loaders and a progress bar.
- **Real-time Population**: As the backend proxy fetches `core_enrol_get_users_courses` and `core_course_get_contents`, the timeline feed will populate progressively.
- **Styling**: Dark mode by default with modern typography (e.g., Inter), focusing on clean, readable design.

## Moodle API Proxying
To prevent the encrypted Moodle token from ever reaching the client browser, all Moodle API calls (like fetching courses or file URLs) will be routed through our Next.js API routes (e.g., `/api/moodle/courses`). The API route will fetch the user's encrypted token from Supabase, decrypt it, make the call to Moodle, and return the formatted JSON to the client.

## Error Handling
- If the Moodle token expires or becomes invalid, the API route will catch the Moodle error response and flag the `moodle_connections` entry as invalid, prompting the user on the frontend to reconnect their account.
- Rate limiting or slow responses from the Moodle API during initial sync will be handled gracefully with timeout logic and user-facing retry states in the skeleton loaders.
