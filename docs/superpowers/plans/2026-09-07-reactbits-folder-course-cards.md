# React Bits Folder Component Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the animated 3D React Bits `<Folder />` component into NotMoodle's dashboard course cards, color-coded per course with paper assignment previews, navigating to the course page upon click.

**Architecture:** Create client component `src/components/Folder.tsx` and accompanying `src/components/Folder.css` supporting size scaling, dynamic folder/paper colors, magnetic hover interactions, and reduced motion. Update `src/app/dashboard/page.tsx` course cards to render `<Folder />` in each card header with up to 3 upcoming assignment items.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Jest, React Testing Library.

## Global Constraints
- Preserve all existing Next.js App Router conventions and API integrations.
- Ensure `<Folder />` is client-rendered (`"use client"`).
- Ensure all color tokens and dynamic inline styles respect light and dark themes with WCAG AA compliance.
- Support `prefers-reduced-motion` with disabled transforms/transitions.
- Every task must be verified with `npm test` and `npm run build`.

---

### Task 1: Create the `<Folder />` Component & Styles

**Files:**
- Create: `src/components/Folder.tsx`
- Create: `src/components/Folder.css`
- Test: `src/__tests__/Folder.test.tsx`

**Interfaces:**
- Produces:
  ```typescript
  export interface FolderProps {
    color?: string;
    size?: number;
    items?: React.ReactNode[];
    className?: string;
    open?: boolean;
    onToggle?: (open: boolean) => void;
    interactive?: boolean;
  }
  export default function Folder(props: FolderProps): JSX.Element;
  ```

- [ ] **Step 1: Write unit tests for `<Folder />`**
In `src/__tests__/Folder.test.tsx`:
Test rendering with custom color, scale, paper items, keyboard navigation (`Enter`/`Space`), and click toggle.

- [ ] **Step 2: Run test to verify failure**
Run: `npm test src/__tests__/Folder.test.tsx`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Create `src/components/Folder.css`**
Add the React Bits CSS styles with CSS variable fallbacks and `@media (prefers-reduced-motion: reduce)` overrides.

- [ ] **Step 4: Create `src/components/Folder.tsx`**
Implement the component in TypeScript with `"use client"`, `darkenColor` calculation, magnetic hover offsets, and accessible keyboard handlers.

- [ ] **Step 5: Run tests and verify build**
Run: `npm test src/__tests__/Folder.test.tsx` and `npm run build`
Expected: PASS

- [ ] **Step 6: Commit changes**
```bash
git add src/components/Folder.tsx src/components/Folder.css src/__tests__/Folder.test.tsx
git commit -m "feat: add React Bits Folder component and styles"
```

---

### Task 2: Integrate `<Folder />` into Dashboard Course Cards & Verify End-to-End

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/__tests__/DashboardTimelineCourses.test.tsx`

**Interfaces:**
- Consumes: `Folder` from `@/components/Folder`, `getCourseAccent` from `@/lib/dashboard-utils`.
- Produces: Enrolled module cards with animated 3D folder preview showing up to 3 course papers, navigating to `/course/[id]` on click.

- [ ] **Step 1: Update dashboard enrolled course cards**
In `src/app/dashboard/page.tsx`:
- Import `Folder from "@/components/Folder"`.
- In the enrolled course card mapping, compute up to 3 upcoming tasks or assignments belonging to `course.id`.
- Render `<Folder size={0.6} color={accent.hex} items={coursePapers} />` in place of the static geometric icon (`Hexagon`, `Circle`, `Triangle`).
- Ensure the card's `Link` navigates smoothly on click or keypress without event stoppage.

- [ ] **Step 2: Update `src/__tests__/DashboardTimelineCourses.test.tsx`**
Add tests verifying the `<Folder />` component renders inside each enrolled course card with the proper course accent color and papers.

- [ ] **Step 3: Run full test suite and production build**
Run: `npm test` and `npm run build`
Expected: PASS (All test suites passing, 0 TypeScript errors)

- [ ] **Step 4: Commit changes**
```bash
git add src/app/dashboard/page.tsx src/__tests__/DashboardTimelineCourses.test.tsx
git commit -m "feat: integrate Folder component into dashboard course cards"
```
