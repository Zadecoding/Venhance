-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- Updates the check constraint for the `processor` column in the `video_jobs` table
-- to allow 'huggingface' as a valid processor.

ALTER TABLE public.video_jobs DROP CONSTRAINT IF EXISTS video_jobs_processor_check;
ALTER TABLE public.video_jobs ADD CONSTRAINT video_jobs_processor_check CHECK (processor IN ('ffmpeg', 'replicate', 'runpod', 'huggingface'));
