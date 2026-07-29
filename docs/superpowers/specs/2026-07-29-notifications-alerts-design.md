# Sub-Project 3: Rich Notifications & Alerts

## Overview
This sub-project implements a proactive alert system that informs students about important updates (like newly posted grades, approaching deadlines, and Moodle messages) without requiring them to manually check their dashboard.

## Architecture & Data Flow

### 1. Background Polling System (Hourly)
Since we do not control the university's Moodle server, we cannot use webhooks. Instead, we will rely on a background worker:
- **Cron Job:** We will set up a Supabase pg_cron job or a Vercel Cron endpoint that runs hourly.
- **Worker Logic:** The cron job will iterate over active users in the `moodle_connections` table, decrypt their tokens, and query Moodle for new data (e.g., `gradereport_user_get_grade_items` for grades, `core_message_get_messages` for messages).
- **Delta Detection:** The system will compare the newly fetched data against the cached state in our database to detect "events" (e.g., a grade that was previously null is now populated).

### 2. Event Types & Alerts
The system will generate internal notification records for the following events:
- **Grade Posted:** "Your grade for [Assignment] in [Course] is now available."
- **Deadline Approaching:** "Reminder: [Assignment] is due in 24 hours."
- **New Message:** "You have a new Moodle message from [Sender]."

### 3. Notification Delivery
- **In-App:** Generated notifications are stored in a new `notifications` table in Supabase.
- **Push/Email (Optional Extension):** The worker can be configured to integrate with a service like Resend (for emails) or standard Web Push API to alert users proactively. (For MVP, we will focus on generating the alerts in the DB and showing them in-app).

### 4. User Interface
- **Bell Dropdown:** The global header will feature a Notification Bell icon with an unread badge. Clicking it reveals a dropdown of the 5 most recent alerts.
- **Dedicated Page:** A new `/notifications` route will provide a full-page inbox experience, allowing users to filter alerts by category (Grades, Messages, Deadlines) and mark them as read.
- **Optimistic Updates:** Marking a notification as read will instantly update the UI (bell badge count) before the Supabase mutation completes.

## Error Handling & Edge Cases
- **Token Expiry during Cron:** If a user's token is invalid during the background poll, the cron job must gracefully skip that user and optionally flag their connection as "requires re-authentication."
- **Rate Limiting:** Polling Moodle for every user could trigger rate limits on the university server. The cron job will introduce slight artificial delays (jitter) between user requests to spread the load.
