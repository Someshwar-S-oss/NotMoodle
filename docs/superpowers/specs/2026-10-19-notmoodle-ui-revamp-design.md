# Design Specification: NotMoodle Complete UI & UX Revamp

**Date**: 2026-10-19  
**Status**: Approved  
**Inspirations**: Adidas Running (metrics, activity rings, kinetic energy) × Brilliant (playful tactile simplicity, zero clutter, lowercase friendly tone).

---

## 1. Objectives & Core Philosophy

1. **User-Centric vs. Process-Centric**: Focus on student momentum and immediate learning access rather than exposing raw Moodle API states and brutalist wireframes.
2. **Zero-Scroll Course Access**: Active courses are positioned immediately above the fold in a primary, responsive grid directly beneath the vital metrics banner.
3. **Lowkey Lowercase Typography**: Replace all-caps brutalist headings and tracking-widest uppercase labels with modern, relaxed lowercase text across headers, badges, buttons, and navigation.
4. **Tactile Polish & Motion**: Incorporate fluid physics-based micro-interactions, spring curves, and rich progress feedback inspired by fitness apps (Adidas Running / Apple Fitness).
5. **Kokonut UI Components**: Add and integrate 5 specialized components from Kokonut UI:
   - `apple-activity-card`: Coursework velocity & completion rings
   - `toolbar`: Floating tactile action dock
   - `action-search-bar`: Quick-access spotlight search for courses and deadlines
   - `loader`: Refined kinetic loading indicator
   - `type-writer`: Dynamic personalized greeting & status reel

---

## 2. Visual System & Typography

- **Font Hierarchy**:
  - Primary Sans: `Geist Sans` / `Satoshi` with medium and semi-bold weights for calm, clear readability.
  - Accent / Mono: `Geist Mono` / `Anonymous Pro` for subtle course codes, timestamps, and numeric metrics.
  - Headings: Clean, modern lowercase titles (e.g. `not moodle`, `enrolled modules`, `due today`, `recent activity`).
- **Color Palette & Glassmorphism**:
  - Soft background surfaces with subtle border strokes (`border-border/20` or `border-border/30`).
  - Warm/Dark adaptable theme tokens with high-contrast accent rings (amber for due today, emerald for completed, indigo/blue for active courses).
- **Responsive Layout**:
  - Mobile-first thumb-friendly controls.
  - Floating bottom navigation toolbar that sits comfortably within thumb reach.

---

## 3. Kokonut UI Components & Integration

### 3.1 `apple-activity-card`
- **Source**: `https://kokonutui.com/r/apple-activity-card.json`
- **Destination**: `src/components/kokonutui/apple-activity-card.tsx`
- **Application**: Top hero summary widget displaying 3 concentric completion rings:
  1. Red/Orange Ring: Pending deadlines (due today / overdue)
  2. Green Ring: Completed/submitted assignments
  3. Indigo Ring: Active enrolled modules on track
- **Features**: Interactive hover/focus, smooth SVG stroke animations with spring easing, animated counter numbers.

### 3.2 `type-writer`
- **Source**: `https://kokonutui.com/r/type-writer.json`
- **Destination**: `src/components/kokonutui/type-writer.tsx`
- **Application**: Hero greeting subtitle dynamically cycling through motivational prompts and schedule status:
  - `"ready to tackle your coursework?"`
  - `"3 assignments in the queue today"`
  - `"you're all caught up on submissions"`

### 3.3 `toolbar`
- **Source**: `https://kokonutui.com/r/toolbar.json`
- **Destination**: `src/components/kokonutui/toolbar.tsx`
- **Application**: Floating ambient dock positioned at the bottom center of the viewport providing quick one-tap actions:
  - Jump to Dashboard
  - Open Action Search Bar (`cmd+k` / tap)
  - Force Moodle Sync
  - Toggle Theme
  - Account / Settings

### 3.4 `action-search-bar`
- **Source**: `https://kokonutui.com/r/action-search-bar.json`
- **Destination**: `src/components/kokonutui/action-search-bar.tsx`
- **Application**: Fast overlay search bar indexing:
  - Enrolled courses (with direct jump to course module)
  - Upcoming and past assignments
  - System actions (sync, settings, notifications)

### 3.5 `loader`
- **Source**: `https://kokonutui.com/r/loader.json`
- **Destination**: `src/components/kokonutui/loader.tsx`
- **Application**: Replacing the pulsing logo spinner with a sleek animated loader on initial dashboard load, course fetching, and assignment uploads.

---

## 4. Dashboard Architecture & User Flow

```
+--------------------------------------------------------------------------+
|  Header: not moodle logo (lowercase)    [action search]   [notifications] |
+--------------------------------------------------------------------------+
|                                                                          |
|  Hero Banner:                                                            |
|  "hello, eshwar"                                                         |
|  [type-writer: "ready to tackle your coursework?"]                       |
|                                                                          |
|  +--------------------------------------------------------------------+  |
|  |  Apple Activity Card:                                              |  |
|  |  ( ) ( ) ( )   - 2 due today                                       |  |
|  |                - 8 completed                                       |  |
|  |                - 5 active courses                                  |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
|  Enrolled Modules (Immediately Visible Above Fold):                      |
|  +------------------+  +------------------+  +------------------+       |
|  | [cs101]          |  | [math202]        |  | [bio100]         |       |
|  | Data Structures  |  | Linear Algebra   |  | Mol Biology      |       |
|  | • 1 pending      |  | • all clear      |  | • all clear      |       |
|  +------------------+  +------------------+  +------------------+       |
|                                                                          |
|  Upcoming Agenda / Timeline (Collapsible / Filterable):                  |
|  [ all ] [ due today ] [ upcoming ] [ overdue ]                          |
|  ---------------------------------------------------------------------   |
|  19 oct · Data Structures Project 2 · due in 4 hours                     |
|  21 oct · Linear Algebra Problem Set 4 · on schedule                     |
|                                                                          |
|  Past Courses (Collapsible Accordion at Bottom)                          |
|                                                                          |
+--------------------------------------------------------------------------+
|          [ Floating Kokonut Toolbar: Home | Search | Sync | Theme ]       |
+--------------------------------------------------------------------------+
```

---

## 5. Course Page & Curriculum Revamp (Brilliant-Style Learning Hub)

- **Curriculum Architecture**:
  - Replace harsh brutalist tables and massive margins with compact, tactile lesson/module cards inspired by Brilliant course roadmaps.
  - Category selector pills in clean lowercase: `all items`, `assignments`, `documents & resources`, `links`.
  - Quick inline filter & search with smooth keyboard shortcut `/`.
- **Module Cards**:
  - Tactile rounded cards with subtle left accent line indicating type:
    - 🔴 `assignment`: Due date, submission status pill (`pending` / `submitted`), quick view button.
    - 🔵 `document`: File size, extension (`pdf`, `slides`, `doc`), instant preview trigger.
    - 🟢 `folder`: Resource count, direct explore.
    - 🟣 `link`: Clean domain pill and one-tap external open.
- **Lowercase Tone**:
  - Section headers softened from `SECTION 01: INTRODUCTION` to `section 1: introduction`.
  - Action pills: `preview`, `view details`, `open resource`.

---

## 6. File Viewer & Document Reader Overhaul (Zero Wasted Space)

- **Root Cause of Empty Space**:
  - Excessive outer padding in modal drawer (`p-6 md:p-8`) combined with fixed iframe margins and large placeholder containers created massive blank margins around documents.
- **Revamped Document Reader Architecture**:
  - **Full-Bleed Viewport Utilization**: In-drawer reader expands to 100% width and maximizes height with edge-to-edge content borders.
  - **Refined Reader Toolbar**:
    - Left: Document title and clean type badge (`pdf document`, `slides`).
    - Right: Sleek tactile button group (direct download, open in new tab, full-screen toggle).
  - **Fluid Preview Canvas**:
    - Embedded PDF and Office previews stretch seamlessly with zero dead whitespace or scrollbar collisions.
    - Fallback and loading states use the lightweight Kokonut `Loader` centered without disproportionate padding.

---

## 7. Non-Functional Requirements & Test Preservation

1. **Test Suite Compatibility**: All 15 existing test suites (114 unit & integration tests) covering course visibility, audit logging, calendar sync, navigation dock, and assignment details must continue passing.
2. **Next.js & React 19 Compatibility**: Kokonut components and motion animations must strictly comply with Next.js App Router client components (`"use client"`), Tailwind v4, and React 19.
3. **Accessibility**: ARIA labels, keyboard navigability, reduced-motion preferences honored via `useReducedMotion`.

