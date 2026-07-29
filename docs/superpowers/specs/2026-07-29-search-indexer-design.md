# Sub-Project 4: Forum & Resource Indexer (Global Search)

## Overview
This sub-project implements a lightning-fast global search interface (Command-K) and robust offline access for course materials and forum discussions. It transforms Moodle's traditional click-heavy navigation into an instant, keyboard-driven experience.

## Architecture & Data Flow

### 1. Client-Side Indexing
To ensure the search is instant and works offline, we will build a local index in the user's browser.
- **Sync Process:** On initial login (or background refresh), our Next.js backend will fetch the complete course structure (`core_course_get_contents`) and forum metadata (`mod_forum_get_forums_by_courses`, `mod_forum_get_forum_discussions`) via the Moodle API.
- **Storage:** This structural and textual metadata will be normalized and stored in the browser's IndexedDB.
- **Search Engine:** We will use a lightweight client-side fuzzy search library (like `fuse.js` or `cmdk`) to query this IndexedDB data, ensuring sub-millisecond response times.

### 2. Command-K Interface
- **Trigger:** Pressing `Cmd+K` (Mac) or `Ctrl+K` (Windows) will summon a global modal overlaid on any page.
- **Features:** 
  - Instant fuzzy search across course names, module titles, file attachments, and forum post subjects.
  - Keyboard navigation (up/down arrows to select, Enter to open).
  - Quick actions (e.g., typing `> submit` to jump to pending assignments).

### 3. Offline File Access (Lazy Caching)
While the metadata is eagerly synced for instant search, actual file payloads are handled conservatively:
- **Service Worker Interception:** A Service Worker will intercept requests for course files (PDFs, PPTs).
- **Cache API (Lazy):** When a user clicks to view a file for the first time, it is fetched from the network, displayed, and simultaneously saved to the browser's Cache Storage.
- **Subsequent Access:** If the user opens the file again (even without an internet connection), the Service Worker serves it instantly from the local cache.

## Error Handling & Edge Cases
- **Stale Index:** The client-side index could drift from Moodle's actual state. We will implement a background refresh mechanism that silently polls the backend to update IndexedDB when the app is idle.
- **Storage Limits:** Browsers impose quotas on IndexedDB and Cache Storage. We will implement an LRU (Least Recently Used) eviction policy for the Cache API to delete old PDFs if the user nears their browser's storage limit.
