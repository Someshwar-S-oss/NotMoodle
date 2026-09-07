# Task 2: Integrate <Folder /> into Dashboard Course Cards & Verify End-to-End

## Files
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/__tests__/DashboardTimelineCourses.test.tsx`

## Requirements
1. **Integrate `<Folder />` into Enrolled Course Cards (`src/app/dashboard/page.tsx`)**:
   - Import `Folder from "@/components/Folder"`.
   - Remove unused geometric icons (`Hexagon`, `Circle`, `Triangle`) from the card header.
   - For each course in `courses.map((course, i) => ...)`:
     - Determine course upcoming events/assignments from `events` and/or `allAssignments`.
     - Extract up to 3 upcoming items. For each item (or fallback paper), render a neat mini paper item preview (e.g. icon + brief title, or clean academic memo sheet).
     - Compute the course accent via `getCourseAccent(course.id, i)`.
     - Render `<Folder size={0.65} color={accent.hex} items={coursePapers} interactive={false} className="transition-transform duration-300 group-hover:scale-105" />` in place of the static icon container in the card header.
     - Note: `interactive={false}` ensures clicking anywhere on the folder or card cleanly delegates navigation to the enclosing Next.js `<Link href={`/course/${course.id}`}>`.
   - On card hover, the folder can open via CSS or hovering interaction.
2. **Update Tests (`src/__tests__/DashboardTimelineCourses.test.tsx`)**:
   - Verify that the `<Folder />` component is rendered inside each enrolled course card.
   - Verify that course code badges and pending deadline badges remain intact and functional.
3. **Verification**:
   - Run `npx jest src/__tests__/DashboardTimelineCourses.test.tsx` and full suite `npm test`.
   - Run `npm run build`.
   - Ensure all 8 test suites pass, and production build succeeds with 0 errors.
   - Commit with message: `feat: integrate Folder component into dashboard course cards`.
