-- ============================================
-- VEnhance Database Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- Stores user plan (free | paid) and metadata.
-- Auto-populated from auth.users via trigger.
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  avatar_url      TEXT,

  -- Subscription plan
  plan            TEXT NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'paid')),

  -- Billing metadata (optional — fill in when adding payment)
  stripe_customer_id      TEXT,
  subscription_id         TEXT,
  subscription_status     TEXT,
  plan_expires_at         TIMESTAMPTZ,

  -- Limits
  monthly_job_limit       INT NOT NULL DEFAULT 10,   -- free: 10/month, paid: unlimited (-1)
  jobs_used_this_month    INT NOT NULL DEFAULT 0,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ============================================
-- VIDEO JOBS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.video_jobs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Video metadata
  original_filename    TEXT,
  original_video_url   TEXT,
  enhanced_video_url   TEXT,
  storage_path         TEXT,
  enhanced_storage_path TEXT,

  -- Status
  -- 'pending'   → in queue, not yet picked up
  -- 'processing'→ worker is actively working on it
  -- 'queued'    → legacy alias (same as pending)
  -- 'uploading' → file upload in progress
  -- 'analyzing' → ffprobe / metadata extraction
  -- 'enhancing' → AI or FFmpeg running
  -- 'rendering' → encoding final output
  -- 'completed' → done
  -- 'failed'    → error
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','queued','uploading','analyzing','enhancing','rendering','processing','completed','failed')),
  error_message   TEXT,

  -- Resolution & size
  input_resolution    TEXT,
  output_resolution   TEXT,
  input_size          BIGINT,
  output_size         BIGINT,
  input_duration      FLOAT,
  output_duration     FLOAT,

  -- ─── Tiered Processing Columns ─────────────────────────────────────────
  -- Which plan the job was created under (snapshot, doesn't change if user upgrades)
  plan            TEXT NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'paid')),

  -- Higher priority = picked from queue first
  -- Free: 1, Paid: 10
  priority        INT NOT NULL DEFAULT 1,

  -- Which processing engine was used
  processor       TEXT NOT NULL DEFAULT 'ffmpeg'
                  CHECK (processor IN ('ffmpeg', 'replicate', 'runpod')),

  -- Watermark applied (only on free tier)
  watermark       BOOLEAN NOT NULL DEFAULT true,

  -- Target output resolution cap
  -- Free: '720p', Paid: '1080p' or '4k'
  target_resolution TEXT NOT NULL DEFAULT '720p',

  -- Replicate prediction ID for async tracking
  replicate_prediction_id TEXT,

  -- Queue position (denormalized, updated on insert/dequeue for fast reads)
  queue_position  INT,
  -- ───────────────────────────────────────────────────────────────────────

  -- Performance metrics
  processing_time BIGINT, -- milliseconds

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PROCESSING LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.processing_logs (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id      UUID NOT NULL REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  step        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('started','completed','failed')),
  message     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- VIDEO ASSETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.video_assets (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id       UUID NOT NULL REFERENCES public.video_jobs(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('original','enhanced')),
  storage_path TEXT NOT NULL,
  public_url   TEXT,
  file_size    BIGINT,
  mime_type    TEXT,
  duration     FLOAT,
  resolution   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_assets ENABLE ROW LEVEL SECURITY;

-- profiles: Users can only read/write their own profile
CREATE POLICY "Users own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id);

-- video_jobs: Users can only access their own jobs
CREATE POLICY "Users own jobs" ON public.video_jobs
  FOR ALL USING (auth.uid() = user_id);

-- processing_logs: Users can access logs for their own jobs
CREATE POLICY "Users own logs" ON public.processing_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.video_jobs
      WHERE video_jobs.id = processing_logs.job_id
        AND video_jobs.user_id = auth.uid()
    )
  );

-- video_assets: Users can access their own assets
CREATE POLICY "Users own assets" ON public.video_assets
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- SERVICE ROLE POLICIES
-- (Allow backend worker to access all jobs for queue processing)
-- ============================================

-- Allow service role to update any job (for the queue worker)
CREATE POLICY "Service role can manage all jobs" ON public.video_jobs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all logs" ON public.processing_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_plan ON public.profiles(plan);

CREATE INDEX IF NOT EXISTS idx_video_jobs_user_id ON public.video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON public.video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_plan ON public.video_jobs(plan);
CREATE INDEX IF NOT EXISTS idx_video_jobs_priority ON public.video_jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON public.video_jobs(created_at DESC);
-- Composite index for queue dequeue: pending jobs ordered by priority desc, then created_at asc
CREATE INDEX IF NOT EXISTS idx_video_jobs_queue
  ON public.video_jobs(priority DESC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_processing_logs_job_id ON public.processing_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_job_id ON public.video_assets(job_id);
CREATE INDEX IF NOT EXISTS idx_video_assets_user_id ON public.video_assets(user_id);

-- ============================================
-- AUTO UPDATE TIMESTAMP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_jobs_updated_at
  BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ============================================
-- SUPABASE STORAGE BUCKET
-- Run these in Supabase dashboard or use the SQL below (requires superuser):
-- ============================================

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('videos', 'videos', false);

-- Storage policies (run after bucket creation):
-- CREATE POLICY "Users upload own videos" ON storage.objects
--   FOR INSERT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users access own videos" ON storage.objects
--   FOR SELECT USING (auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users delete own videos" ON storage.objects
--   FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1]);
