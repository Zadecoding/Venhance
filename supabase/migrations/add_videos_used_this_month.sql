-- Run this in Supabase SQL Editor
-- Adds videos_used_this_month tracking column to profiles

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS videos_used_this_month INTEGER DEFAULT 0;

COMMENT ON COLUMN profiles.videos_used_this_month IS 'Count of videos processed in the current calendar month. Reset to 0 on the 1st of each month.';

-- Optional: Create a function + cron to reset monthly counter
-- (requires pg_cron extension enabled in Supabase dashboard)
-- SELECT cron.schedule('reset-monthly-video-count', '0 0 1 * *',
--   $$UPDATE profiles SET videos_used_this_month = 0$$
-- );
