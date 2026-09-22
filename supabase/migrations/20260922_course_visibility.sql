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
