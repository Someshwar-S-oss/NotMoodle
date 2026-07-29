-- Create moodle_connections table
CREATE TABLE IF NOT EXISTS public.moodle_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    encrypted_token TEXT NOT NULL,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.moodle_connections ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own connection row
CREATE POLICY "Users can manage their own connection"
    ON public.moodle_connections
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
