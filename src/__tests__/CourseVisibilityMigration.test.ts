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
