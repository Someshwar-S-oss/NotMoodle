# Fix Final Review Findings

## Findings to Fix

1. **Critical: RLS Violation on Auto-Registration Upsert for Non-Superusers**
- File: `src/app/api/courses/catalog/route.ts`
- Fix:
  - Filter `inputCourses` to only valid numeric course IDs.
  - Insert only courses that do NOT exist in `course_visibility` using `ignoreDuplicates: true`, or if `newRows.length > 0`:
    ```typescript
    const newRows = inputCourses
      .filter((c: any) => c && !isNaN(Number(c.id)) && !existingMap.has(Number(c.id)))
      .map((c: any) => ({
        course_id: Number(c.id),
        fullname: String(c.fullname || ''),
        shortname: c.shortname ? String(c.shortname) : '',
        is_hidden: false,
        updated_at: new Date().toISOString(),
      }))

    if (newRows.length > 0) {
      const { error } = await supabase
        .from('course_visibility')
        .upsert(newRows, { onConflict: 'course_id', ignoreDuplicates: true })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }
    ```
  - Update `src/__tests__/CourseVisibilityApi.test.ts` to reflect the new call arguments (`ignoreDuplicates: true`).

2. **Important: Remove Duplicate Audit Log in Admin Console**
- File: `src/app/admin/page.tsx`
- Fix:
  - Remove `recordClientAudit` inside `toggleCourseVisibility`. The backend `/api/admin/courses/toggle-visibility` route already calls `recordAuditLog` authoritatively on the server.
  - Update `src/__tests__/AdminCourseManagement.test.tsx` so the test expects the toggle API call without expecting the redundant client audit log.

3. **Verify:**
- Run `npm test` and `npm run build` to confirm all 15 suites and production build pass with 0 errors.
