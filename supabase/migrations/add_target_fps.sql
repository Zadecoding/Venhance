-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- Adds the target_fps column to video_jobs table

ALTER TABLE video_jobs
ADD COLUMN IF NOT EXISTS target_fps INTEGER DEFAULT NULL;

COMMENT ON COLUMN video_jobs.target_fps IS 'User-chosen output frame rate (24/30/60fps). NULL = keep source fps.';
