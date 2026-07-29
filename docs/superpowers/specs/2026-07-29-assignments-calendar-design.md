# Sub-Project 2: Assignments & Deadlines

## Overview
This sub-project focuses on managing Moodle assignments. It introduces deadline synchronization, an opt-in Google Calendar integration, and a seamless assignment submission flow utilizing Supabase Storage to handle large files.

## Architecture & Data Flow

### 1. Unified Deadlines
- **Fetching:** We will use the `mod_assign_get_assignments` Moodle API endpoint to fetch assignment data across all enrolled courses.
- **Caching:** The fetched assignments will be cached in our Supabase PostgreSQL database to ensure the dashboard loads instantly. 
- **Display:** The dashboard will feature a unified chronological list/feed of upcoming deadlines, prioritized by urgency.

### 2. Google Calendar Sync (One-Way)
- **Integration:** Users can authenticate via Google OAuth (opt-in).
- **Syncing:** The system will push their Moodle deadlines to a dedicated "Moodle" calendar within their Google account.
- **Direction:** This is a strictly one-way push (Moodle -> GCal). Users manage their own reminders inside Google Calendar, but creating/editing events in GCal will not reflect back in our dashboard.

### 3. Assignment Submission UI
- **Drawer Component:** Clicking an assignment in the feed opens a slide-over panel (Drawer).
- **Details:** The panel will display the sanitized HTML assignment instructions, attachments, and current submission/grading status (`mod_assign_get_submission_status`).
- **Upload Zone:** The drawer will contain a drag-and-drop file upload zone for submissions.

### 4. File Upload Architecture (Supabase Storage Staging)
To bypass Vercel serverless function payload limits (~4.5MB on free tier) while allowing students to submit large files (PDFs, PPTs):
1. **Staging:** The Next.js frontend uploads the user's file directly to a private Supabase Storage bucket using their Supabase Auth session.
2. **Proxying:** The frontend calls a Next.js API route with the Supabase file path.
3. **Moodle Upload:** The API route downloads the file from Supabase into memory (or streams it), decrypts the user's Moodle token, and POSTs the file to Moodle's `/webservice/upload.php`.
4. **Linking:** The API takes the returned Moodle `itemid` and calls `mod_assign_save_submission` to attach the file to the assignment.
5. **Aggressive Cleanup:** Regardless of whether the Moodle upload succeeds or fails, the API route will **immediately delete the file from the Supabase bucket**. With 40 students, aggressive cleanup ensures the 1GB free tier limit is never approached.

## Error Handling & Edge Cases
- **Stale Data:** If the assignment status changes in Moodle directly, the user might see stale data until the background sync runs. A manual "Refresh" button on the drawer will force an on-demand sync of `mod_assign_get_submission_status`.
- **Upload Failures:** If the transfer from Supabase to Moodle fails (timeout, Moodle error), the error is returned to the client and the temporary file in Supabase is explicitly deleted.
