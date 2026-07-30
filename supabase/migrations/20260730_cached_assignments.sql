-- Add cached_assignments to moodle_connections
ALTER TABLE public.moodle_connections 
ADD COLUMN IF NOT EXISTS cached_assignments JSONB DEFAULT '[]'::jsonb;
