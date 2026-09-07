### Task 5: Course Experience & Unified Resource Filtering

**Files:**
- Modify: `src/app/course/[id]/page.tsx`
- Test: `src/__tests__/CoursePage.test.tsx` (and run `npm test`)

**Interfaces:**
- Consumes: `getCourseContents`, `getAssignments`, `useRouter`, `useSearchParams`, `Drawer`, `FileViewer`, `AssignmentDetails`.
- Produces: Polished course view with breadcrumb header, summary stats bar, keyboard-accessible search input (`/`), interactive category filter pills (`All`, `Assignments`, `PDFs & Readings`, `Links & Folders`), and enhanced resource item cards with distinct file-type badges and direct preview triggers.

**Global Constraints:**
- Preserve all existing Next.js App Router conventions and API route integrations.
- Maintain existing Supabase authentication and Moodle token synchronization logic.
- Ensure all color tokens support both Light mode and Dark mode with WCAG AA contrast compliance.
- Support `prefers-reduced-motion` for all new transitions and animations.
- Every task must be verified with `npm test` and `npm run build` or targeted component tests.

- [ ] **Step 1: Course Hero Header & Summary Stats Bar**
In `src/app/course/[id]/page.tsx`:
- Header navigation:
  - Clean breadcrumb bar with `ArrowLeft` back button (`← Dashboard / [Course Title or Course Library]`).
  - Course title in Clash Display font with clean truncation.
- Stats summary bar below title:
  - Total items pill count (e.g., `42 Materials`).
  - Active assignments count (e.g., `3 Assignments`).
  - Current matching count when searched or filtered.

- [ ] **Step 2: Unified Search & Category Filter Pills**
In `src/app/course/[id]/page.tsx`:
- Add `activeCategory: 'all' | 'assignments' | 'resources' | 'links'` state (default `'all'`).
- Add prominent search bar with:
  - Magnifying glass icon.
  - Clear button (`X`) when query is present.
  - Monospace keyboard shortcut indicator pill: `Press / to search` (with `useEffect` listening for `/` keypress to focus the input when not typing in an input).
- Add category filter pills below search:
  - `All` (count)
  - `Assignments` (count)
  - `PDFs & Readings` (count)
  - `Links & Folders` (count)
- Filter logic:
  - Categorize by `modname`:
    - Assignments: `modname === 'assign'`
    - Resources: `modname === 'resource' || modname === 'folder'`
    - Links: `modname === 'url'` or others
  - Apply both `searchQuery` and `activeCategory` to filter `allModules`.

- [ ] **Step 3: Redesign Resource Item Rows**
In `src/app/course/[id]/page.tsx`:
- Each item row:
  - Left icon box: Dedicated iconography with soft pastel background for file type (`PDF`, `DOCX`, `URL`, `ASSIGNMENT`).
  - Title in Clash Display with hover nudge (`group-hover:translate-x-1.5`).
  - Metadata row:
    - Dedicated file type pill badge (`ASSIGNMENT`, `PDF / DOCUMENT`, `LINK`, `FOLDER`).
    - Section name badge (e.g., `Week 2: Advanced Data Structures`).
  - Right action button:
    - For files: Direct "Preview" button opening full-screen `Drawer` with `FileViewer`.
    - For assignments: Direct "View Details" button opening `AssignmentDetails` `Drawer`.
    - For external links: "Open Link" action with `ExternalLink` icon.
- Empty states:
  - Friendly editorial message when search or filter returns 0 items, with a "Reset filters" button.

- [ ] **Step 4: Add Unit/Integration Tests**
Create `src/__tests__/CoursePage.test.tsx` verifying:
- Course page renders materials list, stats summary bar, and search bar.
- Category filter pills switch view to Assignments, Resources, and Links accurately.
- Search input filters items in real time.
- Clicking an assignment triggers the assignment drawer.
- Clicking a resource file triggers the file viewer drawer.
- Empty state renders reset action when zero results match.

- [ ] **Step 5: Verify build and test**
Run: `npm test` and `npm run build`
Expected: PASS

- [ ] **Step 6: Commit changes**
```bash
git add src/app/course/[id]/page.tsx src/__tests__/CoursePage.test.tsx
git commit -m "feat: upgrade course explorer with unified search and category filters"
```
