# Design Specification: Warm Academic Editorial Modals & Submission Redesign

**Date:** 2026-09-07  
**Target:** `src/components/Drawer.tsx`, `src/components/AssignmentDetails.tsx`, `src/components/FileViewer.tsx`

---

## 1. Overview & Objective
Transform the modal drawers, assignment viewing interface, and file submission workflows from harsh brutalist containers (harsh 2px solid borders, heavy 8px hard offset shadows, stark monochrome buttons) into a friendly, warm academic editorial experience.

---

## 2. Component Specifications

### 2.1 Modal Shell (`src/components/Drawer.tsx`)
- **Backdrop**: Smooth `backdrop-blur-md bg-background/60 dark:bg-background/75` with gentle fade-in transition.
- **Panel Container**:
  - Replace `border-2 border-foreground shadow-[8px_8px_0px_var(--color-foreground)]` with `rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden`.
  - In non-fullscreen mode, add subtle scale/fade entrance animation (`animate-in fade-in zoom-in-95 duration-200`).
- **Header**:
  - Rounded top bar with `bg-card/90 backdrop-blur-sm border-b border-border/30 px-6 py-5`.
  - Title in `Clash Display` font with clean tracking.
  - Close button: Rounded icon button (`rounded-full p-2 text-secondary hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer`) with `aria-label="Close drawer"`.
- **Focus & Keyboard**: Keep complete focus trap, `role="dialog"`, `aria-modal="true"`, and `Escape` key dismissal.

### 2.2 Assignment Details & Viewer (`src/components/AssignmentDetails.tsx`)
- **Status Badge**:
  - *Submitted*: Sage green pill (`bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/30`) with `CheckCircle2` icon.
  - *Pending/Overdue*: Terracotta/amber pill with dynamic countdown tag (*"Due in 2 days"* or *"Overdue by 4h"*).
- **Header Actions**:
  - Rounded *"Open in Moodle"* button (`rounded-lg bg-foreground text-background hover:bg-foreground/90 font-medium text-xs shadow-xs px-4 py-2`).
- **Assignment Overview Cards**:
  - Due date, grading cutoff, and course code in clean rounded cards (`rounded-xl border border-border/30 bg-background/50 p-4 shadow-xs`).
- **Instructions & Attachments**:
  - Instructions rendered with refined typography and comfortable line height.
  - Downloadable attachments rendered in rounded cards (`rounded-xl border border-border/30 bg-background/40 hover:bg-muted/30 hover:border-border p-3.5 transition-all`) with file type badge, formatted size, and direct download icon.

### 2.3 Interactive File Submission Dropzone (`src/components/AssignmentDetails.tsx`)
- **Drag & Drop Target**:
  - Interactive dropzone with dashed border: `border-2 border-dashed border-border/60 hover:border-foreground/40 rounded-xl p-8 bg-background/30 hover:bg-background/60 text-center transition-all cursor-pointer`.
  - Visual drag-over feedback (`border-primary bg-primary/5`).
  - Friendly iconography: Animated `UploadCloud` icon, clear call-to-action (*"Drag and drop your assignment file here, or click to browse"*), and supported format hints (*"Supports PDF, DOCX, ZIP up to university file limit"*).
- **Selected File Preview Pill**:
  - Displays selected file name, formatted file size, file icon, and an accessible remove button (`X`) before submission.
- **Submit Action**:
  - Rounded submit button (`rounded-xl py-3.5 px-6 font-bold uppercase tracking-wider text-xs shadow-sm`) with spinner during upload.
  - Reassuring success card on completion (*"Submitted successfully to Moodle!"*) with auto-refresh of submission status.

### 2.4 Document Previewer (`src/components/FileViewer.tsx`)
- **Container**:
  - Remove harsh `border-2 border-foreground` and hard offset shadow.
  - Frame document iframe in a clean rounded card (`rounded-xl border border-border/40 overflow-hidden shadow-lg bg-card`).
- **Document Header Bar**:
  - Refined toolbar with document type pill, direct download link, and clean typography.
- **Loading & Error States**:
  - Friendly rounded card states replacing high-contrast black boxes.

---

## 3. Verification Criteria
1. `npm test` passes all tests across all test suites.
2. Unit and component tests verify:
   - Drawer renders with rounded container and smooth close.
   - AssignmentDetails renders status pills, file cards, and interactive dropzone.
   - FileViewer renders document frame and download controls.
3. `npm run build` succeeds with 0 type errors.
