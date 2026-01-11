
-- Add priority_level column to shortlist table
ALTER TABLE public.shortlist 
ADD COLUMN priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('high', 'medium', 'low'));
