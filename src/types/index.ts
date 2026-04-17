// ─── User Plan ────────────────────────────────────────────────────────────────
export type UserPlan = "free" | "paid";

// ─── Processor Engine ─────────────────────────────────────────────────────────
export type ProcessorType = "huggingface";

// ─── Job Status ───────────────────────────────────────────────────────────────
export type VideoJobStatus =
  | "pending"     // in queue, not yet picked up
  | "queued"      // legacy alias
  | "uploading"
  | "analyzing"
  | "enhancing"
  | "rendering"
  | "processing"
  | "completed"
  | "failed";

// ─── Profile (tied to auth.users via trigger) ─────────────────────────────────
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  plan: UserPlan;
  stripe_customer_id: string | null;
  subscription_id: string | null;
  subscription_status: string | null;
  plan_expires_at: string | null;
  monthly_job_limit: number;
  jobs_used_this_month: number;
  created_at: string;
  updated_at: string;
}

// ─── Video Job ────────────────────────────────────────────────────────────────
export interface VideoJob {
  id: string;
  user_id: string;
  original_video_url: string | null;
  enhanced_video_url: string | null;
  status: VideoJobStatus;
  input_resolution: string | null;
  output_resolution: string | null;
  input_size: number | null;
  output_size: number | null;
  input_duration: number | null;
  output_duration: number | null;
  original_filename: string | null;
  storage_path: string | null;
  enhanced_storage_path: string | null;
  error_message: string | null;
  processing_time: number | null;

  // Tiered processing
  plan: UserPlan;
  priority: number;
  processor: ProcessorType;
  watermark: boolean;
  target_resolution: string;
  target_fps: number | null;   // user-chosen output frame rate (24/30/60) or null = keep source
  hf_job_id: string | null;
  queue_position: number | null;

  created_at: string;
  updated_at: string;
}

// ─── Video Asset ──────────────────────────────────────────────────────────────
export interface VideoAsset {
  id: string;
  job_id: string;
  user_id: string;
  type: "original" | "enhanced";
  storage_path: string;
  public_url: string | null;
  file_size: number;
  mime_type: string;
  duration: number | null;
  resolution: string | null;
  created_at: string;
}

// ─── Processing Log ───────────────────────────────────────────────────────────
export interface ProcessingLog {
  id: string;
  job_id: string;
  step: string;
  status: "started" | "completed" | "failed";
  message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Video Metadata ───────────────────────────────────────────────────────────
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  size: number;
  resolution: string;
}


// ─── HuggingFace Enhancement Options ────────────────────────────────────────
export interface HFEnhancementOptions {
  plan: UserPlan;
  upscaleFactor: 2 | 4;
  fidelity: number;           // 0.0–1.0 (0 = max enhance, 1 = max fidelity)
  backgroundEnhance: boolean;
  faceUpsample: boolean;
}

// ─── Generic Enhancement Options ─────────────────────────────────────────────
export interface EnhancementOptions {
  upscaleResolution?: "2x" | "4x";
  fidelity?: number;
  backgroundEnhance?: boolean;
  faceUpsample?: boolean;
}

// ─── Enhancement Result ───────────────────────────────────────────────────────
export interface EnhancementResult {
  success: boolean;
  outputPath?: string;
  metadata?: VideoMetadata;
  processingTime?: number;
  error?: string;
}

// ─── HuggingFace Gradio Job Status ───────────────────────────────────────────
export interface HFJobStatus {
  jobId: string;
  status: "pending" | "processing" | "complete" | "error";
  output: string | null;
  error: string | null;
}

// ─── Queue Entry ──────────────────────────────────────────────────────────────
export interface QueueEntry {
  jobId: string;
  plan: UserPlan;
  priority: number;
  createdAt: string;
  position: number;
}

// ─── Processing Step ──────────────────────────────────────────────────────────
export interface ProcessingStep {
  id: string;
  label: string;
  description: string;
  status: "pending" | "active" | "completed" | "failed";
}

// ─── Upload Progress ──────────────────────────────────────────────────────────
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// ─── Legacy User (kept for compatibility) ────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  totalJobs: number;
  completedJobs: number;
  processingJobs: number;
  failedJobs: number;
  totalStorageUsed: number;
}
