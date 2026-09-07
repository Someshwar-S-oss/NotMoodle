### Task 1: Refine Modal Shell & Document Previewer

**Files:**
- Modify: `src/components/Drawer.tsx`
- Modify: `src/components/FileViewer.tsx`
- Test: `src/__tests__/DrawersAndSecondaryPages.test.tsx`

**Interfaces:**
- Consumes: React props (`isOpen`, `onClose`, `title`, `children`, `fullScreen`), `FileViewer` props (`mod`, `courseId`, `token`).
- Produces: Soft rounded modal dialog shell (`rounded-2xl border border-border/60 bg-card shadow-2xl`) with clean frosted header, and document previewer in an elevated frame without brutalist hard offset shadows.

**Global Constraints:**
- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

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
