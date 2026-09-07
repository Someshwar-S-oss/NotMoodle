# Design Specification: Warm Neo-Editorial Academic UI/UX Redesign

**Date:** 2026-09-07  
**Project:** NotMoodle  
**Target:** Entire Web Application (Layout, Dashboard, Course Views, Settings, Notifications, Auth)

---

## 1. Executive Summary & Aesthetic Vision

NotMoodle is transitioning from a stark, monochromatic brutalist interface to a **Warm Neo-Editorial Academic** aesthetic. This design direction preserves NotMoodle's distinctive typographic edge (bold `Clash Display` headers, clean `Satoshi` body, and tabular `JetBrains Mono` metadata) while introducing:
1. **Atmospheric Cloudy Background Gradients:** A subtle, friendly ambient glow/mist behind the canvas (warm amber/sky/sage diffuse radial blur in light mode; deep twilight/indigo nebula in dark mode) to eliminate harsh starkness and add depth.
2. **Warm, Purposeful Academic Palette:** Calibrated contrast with terracotta/crimson for urgent/overdue deadlines, amber for due today, sage/olive for completed tasks, and soft muted pastel ribbons for enrolled courses.
3. **High-Impact Student-Centric UX:**
   - Redesigned urgency cards on the Dashboard with instant filter toggles.
   - Intelligent timeline with human-friendly countdown tags (*"Due in 3 hours"*).
   - Enrolled module cards with course code badges and pending task indicators.
   - Streamlined course resource browser with search and category filter pills (`All`, `Assignments`, `PDFs & Notes`, `Links`).
   - Polished sliding drawers with smooth spring physics for assignments and document previews.

---

## 2. Design Tokens & Global System Architecture

### 2.1 Color Palette & Theme Tokens (`src/app/globals.css`)

```css
:root {
  /* Light Theme - Warm Bone & Editorial Charcoal */
  --background: #f7f6f2;
  --foreground: #141414;
  --card: #ffffff;
  --card-foreground: #141414;
  --muted: #ebe8e1;
  --accent: #78716c;
  --border: rgba(20, 20, 20, 0.12);
  --secondary: #57534e;
  --tertiary: #a8a29e;
  
  /* Status & Urgency Tokens */
  --urgency-overdue: #dc2626;
  --urgency-overdue-bg: rgba(220, 38, 38, 0.08);
  --urgency-overdue-border: rgba(220, 38, 38, 0.25);
  
  --urgency-today: #d97706;
  --urgency-today-bg: rgba(217, 119, 6, 0.08);
  --urgency-today-border: rgba(217, 119, 6, 0.25);

  --urgency-upcoming: #475569;
  --urgency-upcoming-bg: rgba(71, 85, 105, 0.06);
  --urgency-upcoming-border: rgba(71, 85, 105, 0.2);

  --status-success: #16a34a;
  --status-success-bg: rgba(22, 163, 74, 0.08);
}

.dark {
  /* Dark Theme - Deep Obsidian & Editorial Warm White */
  --background: #0d0f12;
  --foreground: #f4f4f5;
  --card: #15181e;
  --card-foreground: #f4f4f5;
  --muted: #222630;
  --accent: #94a3b8;
  --border: rgba(244, 244, 245, 0.12);
  --secondary: #a1a1aa;
  --tertiary: #71717a;

  /* Status & Urgency Tokens */
  --urgency-overdue: #ef4444;
  --urgency-overdue-bg: rgba(239, 68, 68, 0.12);
  --urgency-overdue-border: rgba(239, 68, 68, 0.35);

  --urgency-today: #f59e0b;
  --urgency-today-bg: rgba(245, 158, 11, 0.12);
  --urgency-today-border: rgba(245, 158, 11, 0.35);

  --urgency-upcoming: #94a3b8;
  --urgency-upcoming-bg: rgba(148, 163, 184, 0.1);
  --urgency-upcoming-border: rgba(148, 163, 184, 0.25);

  --status-success: #22c55e;
  --status-success-bg: rgba(34, 197, 94, 0.12);
}
```

### 2.2 Ambient Cloudy Gradient
An ambient background layer fixed across the viewport using subtle CSS radial/conic gradients:
- **Light mode:** A soft, warm atmospheric gradient layer blending pale amber `#fef3c7`, subtle sky `#e0f2fe`, and warm bone `#f7f6f2` at 6% opacity with `filter: blur(80px)`.
- **Dark mode:** Deep twilight nebula blending indigo `#1e1b4b`, cyan `#0e7490`, and dark slate `#0f172a` at 12% opacity with `filter: blur(100px)`.
- Implemented as a fixed pointer-events-none container in `src/app/layout.tsx` so all pages benefit without layout recalculations.

### 2.3 Typography & Hierarchy
- **Primary Display Font:** `Clash Display` (500, 600, 700) for section titles, brand headings, and prominent metric numerals.
- **Body & Controls:** `Satoshi` (400, 500, 700) for clean line reading, interface controls, and body text.
- **Code & Metadata:** `JetBrains Mono` for course codes, dates, timestamps, and file extensions.

---

## 3. Component & Page Specifications

### 3.1 Global Navigation & Header (`layout.tsx`, `NavigationDock.tsx`)
- **Top Header:**
  - Frosted glassmorphism (`backdrop-blur-md bg-background/85`).
  - Brand link "The NotMoodle" with refined typography.
  - Right cluster: Theme Switcher toggle (Light/Dark/System), Notification bell with count badge, and clean rounded Logout button.
- **Floating Navigation Dock (`NavigationDock.tsx`):**
  - Refined floating bottom dock with active indicator pill, subtle border sheen, and smooth motion tooltips.
  - Links to `/dashboard`, `/notifications`, and `/settings`.
  - Retains smart auto-hide on scroll and drawer open.

### 3.2 Dashboard Experience (`src/app/dashboard/page.tsx`)
1. **Greeting & Quick Status:**
   - Display `Hello, [FirstName]` in `Clash Display` with dynamic summary (e.g. *"You have 2 items due today"* or *"All caught up!"*).
2. **Urgency Metric Cards (Overdue, Due Today, Upcoming):**
   - Three cards replacing the plain black boxes.
   - **Overdue Card:** Urgent crimson border, soft tint background, count numeral, and "Action Required" badge.
   - **Due Today Card:** Amber focus glow, count numeral, and "Tackle Today" badge.
   - **Upcoming Card:** Calm slate border, count numeral, and "On Schedule" badge.
   - **Interactive Filter:** Clicking any card filters the Timeline below to show only items matching that bucket (with an "All" reset button).
3. **Interactive Timeline:**
   - Redesigned timeline list with relative time tags (*"Due in 2 hours"*, *"Tomorrow at 11:59 PM"*, *"In 3 days"*).
   - Course name badge with matching course color dot.
   - Clicking an assignment opens the `AssignmentDetails` slide-over drawer directly.
   - Friendly empty state when all deadlines are cleared.
4. **Enrolled Modules Grid:**
   - Elevated cards with unique top color accents.
   - Course code badge (e.g. `CS204`) + Full title.
   - Hover lift and subtle arrow reveal transition.

### 3.3 Course Experience (`src/app/course/[id]/page.tsx`)
1. **Course Hero Header:**
   - Back button with breadcrumb navigation (`← Dashboard / Course Title`).
   - Clean summary badges: Total Modules, Pending Tasks.
2. **Unified Search & Category Filter:**
   - Prominent search input with clear button and keyboard shortcut indicator (`/`).
   - Filter pills: `All`, `Assignments`, `PDFs & Readings`, `Links & Folders`.
3. **Module List Item:**
   - File-type icons with color badges (`PDF`, `DOCX`, `URL`, `ASSIGNMENT`).
   - Clear section name tag (e.g., *Week 2: Advanced Data Structures*).
   - Immediate action: "Preview" for files, "Details" for assignments.
4. **Drawers (`Drawer.tsx`, `AssignmentDetails.tsx`, `FileViewer.tsx`):**
   - Frosted backdrop blur with escape key handling.
   - `AssignmentDetails`: Submission status pill (Submitted vs Not Submitted), due date countdown, formatted description, downloadable attachments, and "Open in Moodle" submission link.
   - `FileViewer`: Document toolbar with filename, download button, and responsive document viewer.

### 3.4 Secondary Pages
1. **Settings (`src/app/settings/page.tsx`):**
   - Segmented theme selector (Light / Dark / System) with instant toggle.
   - Google Calendar sync card with one-click copy and illustrated setup guide.
   - Moodle account sync card with re-sync trigger and connection status.
2. **Notifications (`src/app/notifications/page.tsx`):**
   - Filter tabs: `All`, `Unread`, `Deadlines`, `Grades`.
   - Clear notification cards with relative timestamps and read/unread toggle.
   - Friendly empty state when all notifications are read.
3. **Auth & Landing Pages (`/login`, `/signup`, `/`):**
   - Clean centered cards with the cloudy gradient background.
   - Polished form inputs with clear focus states and validation error banners.

---

## 4. Error Handling & Responsive Design
- **Accessibility:** All color combinations meet WCAG AA contrast standards. Focus states remain sharp with `focus-visible:ring-2`.
- **Motion Reduction:** Full compliance with `prefers-reduced-motion` settings.
- **Mobile Responsiveness:** All grid sections collapse gracefully to single-column layouts on viewports `< 768px`.
- **Loading & Fallbacks:** Polished skeleton loaders matching the exact card shapes replace generic spinners.

---

## 5. Verification & Testing Strategy
- **Visual & Theme Verification:** Validate all pages in both Light mode and Dark mode across desktop and mobile viewports.
- **Component Interactivity:**
  - Urgency card filtering on the dashboard.
  - Assignment drawer trigger and submission link navigation.
  - Course search and category filter pills.
  - Calendar sync URL copy action with visual feedback.
  - Theme toggling without page reload or flash.
- **Sanity & Build Checks:**
  - Run `npm test` to verify existing tests pass.
  - Run `npm run build` to ensure clean TypeScript compilation and asset bundling.
