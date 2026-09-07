### Task 1: Design Tokens, CSS Variables & Atmospheric Cloudy Ambient Background

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Test: `src/__tests__/sanity.test.ts`

**Interfaces:**
- Consumes: Tailwind CSS v4 `@theme`, `next-themes` classes.
- Produces: CSS color variables (`--background`, `--foreground`, `--card`, `--border`, `--urgency-overdue`, etc.) and `.cloudy-gradient` atmospheric layer.

**Global Constraints:**
- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

- [ ] **Step 1: Check existing test suite passes**
Run: `npm test`
Expected: 1 passing test (`src/__tests__/sanity.test.ts`)

- [ ] **Step 2: Update `src/app/globals.css` with warm editorial palette and ambient cloud effects**
Modify `src/app/globals.css` to add the warm palette variables, status urgency variables, and cloudy gradient styling:
Ensure `--background: #f7f6f2`, `--foreground: #141414`, `--card: #ffffff`, `--border: rgba(20, 20, 20, 0.12)`, and corresponding dark mode variables (`--background: #0d0f12`, `--foreground: #f4f4f5`, `--card: #15181e`, etc.).
Ensure urgency tokens (`--urgency-overdue`, `--urgency-today`, `--urgency-upcoming`, `--status-success` and their bg/border variants) are defined in both `:root` and `.dark`.
Add the `.cloudy-gradient` fixed background styling with `::before` and `::after` radial gradients and blur for both light and dark themes.

- [ ] **Step 3: Add the fixed ambient cloudy gradient container into `src/app/layout.tsx`**
In `src/app/layout.tsx`, render `<div className="cloudy-gradient" aria-hidden="true" />` inside `ThemeProvider` right before the main container, so the subtle cloud layer is active across every route without interfering with clicks or scrolling.

- [ ] **Step 4: Verify build and test**
Run: `npm test` and `npm run build`
Expected: PASS

- [ ] **Step 5: Commit changes**
```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add warm neo-editorial palette and atmospheric cloudy background"
```
