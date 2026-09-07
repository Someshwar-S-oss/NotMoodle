### Task 2: Global Header & Navigation Shell Polish

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/NavigationDock.tsx`
- Test: `src/__tests__/sanity.test.ts`

**Interfaces:**
- Consumes: `useTheme()` from `next-themes`, `usePathname()` from `next/navigation`.
- Produces: Polished top header with quick theme toggle (`ThemeToggle.tsx`), and enhanced bottom floating dock (`NavigationDock.tsx`) with active route indicators and subtle spring physics.

**Global Constraints:**
- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

- [ ] **Step 1: Create `src/components/ThemeToggle.tsx`**
Provide a sleek theme toggle button allowing users to switch between Light and Dark mode with smooth iconography (`Sun`, `Moon`), mounted state protection against hydration mismatch, accessible `aria-label`, and clean hover states.

- [ ] **Step 2: Update `src/app/layout.tsx` header**
In `src/app/layout.tsx`:
- Embed `<ThemeToggle />` next to `<NotificationBell />` in the top header.
- Apply subtle glassmorphism (`backdrop-blur-md bg-background/80 border-b border-border/10`).
- Refine brand logo and logout button styles with clean rounded pills and hover transitions.

- [ ] **Step 3: Update `src/components/NavigationDock.tsx`**
Highlight current active route (`/dashboard`, `/notifications`, `/settings`) using `usePathname()`:
- Add an active indicator pill / dot beneath or alongside active items.
- Maintain scroll auto-hide and drawer full-screen coordination.

- [ ] **Step 4: Verify build and test**
Run: `npm test` and `npm run build`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add src/components/ThemeToggle.tsx src/app/layout.tsx src/components/NavigationDock.tsx
git commit -m "feat: enhance header with ThemeToggle and polish navigation dock"
```
