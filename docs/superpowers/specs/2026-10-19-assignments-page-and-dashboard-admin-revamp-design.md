# Design Specification: Dedicated Assignments Page, Dashboard & Admin Revamp

**Date**: 2026-10-19  
**Status**: Approved  
**Topic**: Assignments Page, Header Polish, Activity Card Fix, Timeline Enhancement, Assignment Details Revamp, and Admin Console Modernization

---

## 1. Objectives & Overview

The goal of this initiative is to deliver a comprehensive UX and visual upgrade across NotMoodle:
1. **Header**: Remove the pulsing green status dot next to the "not moodle" logo for a cleaner, understated aesthetic.
2. **Daily Activity Card**: Fix layout glitches, responsive container collapse, contrast inconsistencies, and math errors in ring progress targets.
3. **Dedicated Assignments Page (`/assignments`)**: Implement a full-fledged assignments hub featuring an interactive left/right carousel/deck view, filter tabs (`All`, `Overdue`, `Due Today`, `Upcoming`), keyboard navigation, card overview, quick-jump thumbnail strip, and integration with the navigation dock.
4. **Urgency Metric Links**: Wire the dashboard's Overdue, Due Today, and Upcoming overview cards to route directly to `/assignments?filter=...` with the corresponding filter pre-selected.
5. **Timeline Polish**: Elevate the dashboard timeline into a connected vertical timeline track with urgency-colored node dots, clear course identity, and seamless detail triggers.
6. **Assignment Details Modal Revamp**: Modernize `AssignmentDetails.tsx` with editorial typography, due date countdowns, clean attachments cards, and an intuitive drag-and-drop file submission zone.
7. **Admin Console Revamp**: Modernize `src/app/admin/page.tsx` with lowercase Satoshi/Anonymous Pro styling, refined stat cards, segmented navigation, user management with instant toggle, course visibility controls, and an audit telemetry viewer.

---

## 2. Architecture & Detailed Specifications

### 2.1 Header Polish (`src/app/layout.tsx`)
- Locate `<header>` in `src/app/layout.tsx`.
- Remove the `<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />` element.
- Preserve the lowercase `not moodle` title link and its hover transition.

### 2.2 Daily Activity Window Fix (`src/components/kokonutui/apple-activity-card.tsx` & Dashboard)
- **Ring Mathematics**:
  - Ring 1 (Tasks / Pending): Target = total active tasks; Current = due today + overdue. (If 0 tasks, gracefully show 0 / 1 completed).
  - Ring 2 (Completed): Target = total assignments; Current = submitted assignments count.
  - Ring 3 (Active Modules): Target = total enrolled courses; Current = active visible courses.
- **Styling & CSS Compatibility**:
  - Replace `@container` queries and fragile CSS color syntax (`oklch(from var(--ring) ...)`) with standard SVG linear gradients utilizing CSS variables `--ring` and `--ring-end`.
  - Replace hardcoded `text-zinc-900 dark:text-white` with NotMoodle design system tokens (`text-foreground`, `text-secondary`, `bg-card`).
  - Set a balanced responsive layout (`flex-col sm:flex-row items-center gap-6 md:gap-8`) that sits harmoniously beside the typewriter greeting.

### 2.3 Dedicated Assignments Page (`src/app/assignments/page.tsx`)
- **Route**: `/assignments`
- **Navigation Dock Integration**:
  - Add an "Assignments" item to `src/components/NavigationDock.tsx` using `BookOpen` or `Layers` icon between Dashboard and Notifications.
  - Highlight active state when `pathname === '/assignments'`.
- **URL Query Param Support**:
  - Read `?filter=overdue | today | upcoming | all` via `useSearchParams()`.
  - Automatically set the active tab filter based on the URL parameter.
- **Top Filter Segment**:
  - Pills for `All`, `Overdue`, `Due Today`, `Upcoming` with dynamic badge counts.
- **Interactive Left/Right Carousel / Deck**:
  - Left (`<`) and Right (`>`) arrow buttons with keyboard arrow listener (`ArrowLeft`, `ArrowRight`).
  - Card counter: `Assignment X of Y` with animated pagination dots.
  - Slide animation using `motion.div` with directional sliding (`x: -30` / `x: 30`).
  - **Card Content**:
    - Top bar: Course code tag with accent color, relative urgency badge (`Overdue by 2d`, `Due today`, `Due in 4d`).
    - Assignment Name: Large, clear headline.
    - Intro / Description snippet (sanitized HTML, line-clamped with expand option).
    - Meta badges: Max grade, file count, due timestamp.
    - Submission Status: Distinct "Submitted" or "Pending submission" badge.
    - Actions: "Open Assignment Dossier" (opens `AssignmentDetails` drawer) & "Open in Moodle" direct link.
- **Quick-Jump Thumbnails**:
  - Bottom strip displaying compact list of all filtered assignments for instant direct selection.

### 2.4 Dashboard Urgency Cards Wiring (`src/app/dashboard/page.tsx`)
- Update the 3 Urgency Cards:
  - Overdue card links/routes to `/assignments?filter=overdue`.
  - Due Today card links/routes to `/assignments?filter=today`.
  - Upcoming card links/routes to `/assignments?filter=upcoming`.
- Keep in-page filtering as an option or use router navigation so clicking opens the dedicated assignment deck directly.

### 2.5 Dashboard Timeline Polish (`src/app/dashboard/page.tsx`)
- Modernize the timeline section into a connected vertical track:
  - Vertical rail with timeline nodes color-coded by urgency (red = overdue, amber = today, slate = upcoming).
  - Left column: Day number, month, and time.
  - Right column: Course badge with accent color, assignment title, sanitized preview, and "View Details" button.
  - Empty state with clean typography and link to `/assignments`.

### 2.6 Revamped Assignment Details Drawer (`src/components/AssignmentDetails.tsx`)
- Typography: Replace uppercase `clash-title` with `font-sans` lowercase editorial style.
- Metadata Grid: 3 cards showing Due Date (with real-time countdown), Max Grade, and Current Status.
- Description: Clean prose styling (`prose prose-sm dark:prose-invert max-w-none`).
- Attachments: Clean file cards with file size, icon, and download link.
- Submission Zone:
  - Drag-and-drop zone with animated dash border and active drag-over state.
  - File picker button, file preview chip, and upload submit button with loading spinner.
  - Feedback/Grading card when submission has been graded.

### 2.7 Revamped Admin Console (`src/app/admin/page.tsx`)
- Header: Minimalist breadcrumbs `admin / console`, lowercase title `admin console`.
- Metrics Row: 4 cards (Total Users, Approved, Pending, Audit Events) with subtle borders and clean numerical styling.
- Navigation Tabs: Clean segmented pills for `Users`, `Courses`, `Audit Logs`.
- User Management:
  - Search by name/email.
  - Status filter (`All`, `Approved`, `Pending`).
  - User cards/table with avatar chips, email, approval toggle switch with instant optimistic feedback, and superuser badge.
- Course Catalog:
  - Search courses, filter by `All`, `Visible`, `Hidden`.
  - Toggle course visibility with one click.
- Audit Telemetry:
  - Category filters (`All`, `Logins`, `Submissions`, `Resources`, `Moodle`, `Admin`).
  - Search by action/user.
  - Modal drawer with syntax-highlighted / formatted JSON details.

---

## 3. Testing & Verification Plan

1. **Header Verification**: Check layout header across light and dark themes to ensure green pulsing dot is gone and logo displays cleanly.
2. **Activity Card Verification**: Verify ring animation, proper target/current percentages, responsive rendering, and absence of CSS glitches.
3. **Assignments Page Verification**:
   - Access `/assignments`, verify carousel switches with left/right buttons and keyboard keys.
   - Verify filter queries (`?filter=overdue`, `?filter=today`, `?filter=upcoming`) select appropriate tabs.
   - Verify clicking "Open Assignment Dossier" opens the drawer with correct assignment data.
4. **Dashboard Verification**:
   - Verify clicking Overdue, Due Today, and Upcoming cards navigates to `/assignments` with corresponding filter.
   - Verify vertical connected timeline renders correctly.
5. **Admin Console Verification**:
   - Verify user approval toggle, course visibility toggle, and audit log inspector.
6. **Automated Tests**:
   - Run existing test suites (`npm test`) and add/update tests for the new assignments page and components.
