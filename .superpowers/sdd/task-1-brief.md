### Task 1: Supabase Migration for Course Visibility

**Files:**
- Create: `supabase/migrations/20260922_course_visibility.sql`
- Test: `src/__tests__/CourseVisibilityMigration.test.ts`

**Interfaces:**
- Produces: `public.course_visibility` table schema definition with columns `course_id (BIGINT PRIMARY KEY)`, `fullname (TEXT)`, `shortname (TEXT)`, `is_hidden (BOOLEAN DEFAULT FALSE)`, `created_at (TIMESTAMPTZ)`, `updated_at (TIMESTAMPTZ)`, `updated_by (UUID REFERENCES auth.users)`.

- [ ] **Step 1: Write migration test asserting SQL schema statements**

```typescript
// src/__tests__/CourseVisibilityMigration.test.ts
import fs from 'fs'
import path from 'path'

describe('Course Visibility Migration', () => {
  it('defines public.course_visibility with required columns and RLS policies', () => {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260922_course_visibility.sql')
    expect(fs.existsSync(migrationPath)).toBe(true)

    const sql = fs.readFileSync(migrationPath, 'utf8')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.course_visibility')
    expect(sql).toContain('course_id BIGINT PRIMARY KEY')
    expect(sql).toContain('is_hidden BOOLEAN NOT NULL DEFAULT FALSE')
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY')
    expect(sql).toContain('Allow authenticated users to read course visibility')
    expect(sql).toContain('Allow superusers to update course visibility')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/CourseVisibilityMigration.test.ts`
Expected: FAIL with "no such file or directory"

- [ ] **Step 3: Create the migration SQL file**

```sql
-- supabase/migrations/20260922_course_visibility.sql

CREATE TABLE IF NOT EXISTS public.course_visibility (
    course_id BIGINT PRIMARY KEY,
    fullname TEXT NOT NULL,
    shortname TEXT,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.course_visibility ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view course visibility
CREATE POLICY "Allow authenticated users to read course visibility"
    ON public.course_visibility FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert newly discovered courses
CREATE POLICY "Allow authenticated users to insert course metadata"
    ON public.course_visibility FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Only superusers can update course visibility status
CREATE POLICY "Allow superusers to update course visibility"
    ON public.course_visibility FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_superuser = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.is_superuser = true
        )
    );
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/CourseVisibilityMigration.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260922_course_visibility.sql src/__tests__/CourseVisibilityMigration.test.ts
git commit -m "feat(db): add course_visibility migration with RLS policies"
```
