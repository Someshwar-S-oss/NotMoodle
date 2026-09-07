# Implementation Plan: Warm Academic Editorial Modals & Submission Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the modal dialogs (`Drawer.tsx`), assignment details viewer, drag-and-drop submission interface (`AssignmentDetails.tsx`), and file previewer (`FileViewer.tsx`) from stark brutalist styling into an elegant, warm academic editorial experience.

**Architecture:** Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + Lucide React. Modal containers adopt soft curves (`rounded-2xl`), subtle borders (`border-border/60`), and ambient elevation (`shadow-2xl`). The file submission zone is elevated into an interactive drag-and-drop target with instant file preview pills, format hints, and status badges.

**Tech Stack:** Next.js 16.2.12, React 19, Tailwind CSS v4, Lucide React, Jest + React Testing Library.

## Global Constraints

- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

---

### Task 1: Refine Modal Shell & Document Previewer

**Files:**
- Modify: `src/components/Drawer.tsx`
- Modify: `src/components/FileViewer.tsx`
- Test: `src/__tests__/DrawersAndSecondaryPages.test.tsx`

**Interfaces:**
- Consumes: React props (`isOpen`, `onClose`, `title`, `children`, `fullScreen`), `FileViewer` props (`mod`, `courseId`, `token`).
- Produces: Soft rounded modal dialog shell (`rounded-2xl border border-border/60 bg-card shadow-2xl`) with clean frosted header, and document previewer in an elevated frame without brutalist hard offset shadows.

- [ ] **Step 1: Refine `src/components/Drawer.tsx` styling**
In `src/components/Drawer.tsx`:
- Replace harsh outer container classes:
  - Remove `border-2 border-foreground shadow-[8px_8px_0px_var(--color-foreground)]`.
  - Apply `rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden`.
- Header:
  - Style header with `bg-card/90 backdrop-blur-sm border-b border-border/40 px-6 py-5 flex items-center justify-between`.
  - Close button: `rounded-full p-2 text-secondary hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer`.
- Maintain focus trapping, `Escape` key listener, `aria-modal="true"`, and `role="dialog"`.

- [ ] **Step 2: Refine `src/components/FileViewer.tsx` styling**
In `src/components/FileViewer.tsx`:
- Replace harsh brutalist container and borders:
  - Remove `border-2 border-foreground shadow-[8px_8px_0px_var(--color-foreground)]`.
  - Frame iframe in `w-full h-[calc(100vh-180px)] rounded-xl border border-border/40 overflow-hidden shadow-md bg-card`.
- Top toolbar:
  - Replace `border-b-2 border-foreground` with a clean toolbar: `flex justify-between items-center text-xs font-mono uppercase tracking-wider border-b border-border/30 pb-3 text-secondary`.
  - Download action button: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:bg-muted/50 transition-colors text-foreground text-xs font-medium`.
- Loading and error states:
  - Replace harsh bordered boxes with gentle rounded cards (`rounded-xl border border-border/30 bg-card/60 p-8`).

- [ ] **Step 3: Verify and commit**
Run: `npm test` and `npm run build`
```bash
git add src/components/Drawer.tsx src/components/FileViewer.tsx
git commit -m "feat: soften drawer modal container and file previewer frame"
```

---

### Task 2: Elevated Assignment Viewer & Interactive Drag-and-Drop Submission Zone

**Files:**
- Modify: `src/components/AssignmentDetails.tsx`
- Test: `src/__tests__/DrawersAndSecondaryPages.test.tsx`

**Interfaces:**
- Consumes: Moodle assignment object, Moodle upload and submission client APIs (`uploadFileToDraft`, `saveSubmission`, `getSubmissionStatus`).
- Produces: Friendly assignment viewer with soft status pills, rounded metadata cards, and interactive drag-and-drop submission zone with file preview and remove controls.

- [ ] **Step 1: Refine Assignment Header, Overview & Attachments in `src/components/AssignmentDetails.tsx`**
In `src/components/AssignmentDetails.tsx`:
- Replace harsh square buttons and borders:
  - Open in Moodle button: `rounded-lg px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs shadow-xs inline-flex items-center gap-2 transition-all`.
  - Overview cards (Due date, Grading): `rounded-xl border border-border/30 bg-card/50 p-4 shadow-xs`.
  - Instructions container: `bg-card p-6 border border-border/30 rounded-xl shadow-xs`.
  - Attachment items: `flex items-center gap-3 p-3.5 rounded-xl bg-background/50 hover:bg-muted/40 border border-border/30 hover:border-border transition-all shadow-xs`.

- [ ] **Step 2: Implement Interactive Drag-and-Drop Zone & Selected File Preview**
In `src/components/AssignmentDetails.tsx`:
- Add drag state: `isDragging: boolean`.
- Implement `onDragOver`, `onDragLeave`, `onDrop` event handlers.
- When no file is selected:
  - Render an interactive dropzone with dashed border:
    `border-2 border-dashed rounded-2xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${isDragging ? 'border-foreground bg-muted/40 scale-[1.01]' : 'border-border/60 hover:border-border hover:bg-muted/20 bg-background/30'}`
  - Hidden file `<input type="file" ref={fileInputRef} className="hidden" />` triggered on dropzone click or keyboard Enter/Space.
  - Upload illustration/icon: `UploadCloud` with subtle bounce.
  - Friendly copy: *"Drag and drop your assignment file here, or click to browse"* and *"Supports PDF, DOCX, ZIP up to university file limit"*.
- When file is selected:
  - Render a clean file preview card (`p-4 rounded-xl border border-border/40 bg-card flex items-center justify-between shadow-xs`).
  - File icon, file name, formatted size badge, and a remove file button (`X` icon with `aria-label="Remove selected file"`).
- Submit button:
  - `w-full rounded-xl py-3 px-6 bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer`.

- [ ] **Step 3: Update and expand tests**
In `src/__tests__/DrawersAndSecondaryPages.test.tsx`:
- Add test verifying drag and drop / file selection displays the file card.
- Add test verifying remove file button clears the selected file.
- Verify status badges and attachment links.

- [ ] **Step 4: Verify build and test**
Run: `npm test` and `npm run build`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add src/components/AssignmentDetails.tsx src/__tests__/DrawersAndSecondaryPages.test.tsx
git commit -m "feat: overhaul assignment viewer and add interactive drag-and-drop submission zone"
```

---

### Task 3: Full System Verification & Branch Completion

**Files:**
- Test: All suites in `src/__tests__/`
- Production Build: `npm run build`

- [ ] **Step 1: Run complete test suite**
Run: `npm test`
Expected: PASS (All test suites passing)

- [ ] **Step 2: Run production Next.js build**
Run: `npm run build`
Expected: PASS (Zero TypeScript errors, webpack bundled)

- [ ] **Step 3: Commit final verification**
```bash
git add .
git commit -m "chore: complete modal and submission redesign verification"
```
