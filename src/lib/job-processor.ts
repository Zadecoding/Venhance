/**
 * job-processor.ts
 *
 * Central dispatcher for video enhancement jobs.
 * ALL tiers use the Hugging Face Spaces pipeline via @gradio/client.
 *
 * Free tier:  HF_SPACE_FREE — 2x upscale, standard quality
 * Paid tier:  HF_SPACE_PAID — 4x upscale, higher fidelity + background enhance
 *
 * This is the ONLY place where tier differentiation logic lives.
 * All API routes and queue workers call processJob(jobId) and nothing else.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { enhanceWithHuggingFace } from "@/lib/huggingface-enhancement";
import type { VideoJob, HFEnhancementOptions, EnhancementResult } from "@/types";

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function processJob(jobId: string): Promise<EnhancementResult> {
  const supabase = createServiceClient();

  const { data: job, error: jobError } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    console.error(`[Processor] Job ${jobId} not found:`, jobError);
    return { success: false, error: "Job not found" };
  }

  const typedJob = job as VideoJob;
  console.log(`[Processor] Processing job ${jobId} | plan=${typedJob.plan}`);

  try {
    return await processWithHuggingFace(typedJob, supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(`[Processor] Job ${jobId} crashed:`, error);
    await updateJobStatus(supabase, jobId, "failed", message);
    await logStep(supabase, jobId, "processor", "failed", message);
    return { success: false, error: message };
  }
}

// ─── HuggingFace Pipeline ─────────────────────────────────────────────────────

async function processWithHuggingFace(
  job: VideoJob,
  supabase: ReturnType<typeof createServiceClient>
): Promise<EnhancementResult> {
  const jobId = job.id;
  const startTime = Date.now();
  const isPaid = job.plan === "paid";

  await updateJobStatus(supabase, jobId, "analyzing");
  await logStep(supabase, jobId, "analyze", "started", `Preparing for AI enhancement (${job.plan} tier)`);

  const hfOpts: HFEnhancementOptions = {
    plan: job.plan,
    upscaleFactor: isPaid ? 4 : 2,
    fidelity: isPaid ? 0.7 : 0.5,
    backgroundEnhance: true,
    faceUpsample: true,
  };

  await updateJobStatus(supabase, jobId, "enhancing");
  await logStep(
    supabase,
    jobId,
    "hf_enhance",
    "started",
    `HuggingFace Space | plan=${job.plan} | upscale=${hfOpts.upscaleFactor}x | fidelity=${hfOpts.fidelity}`
  );

  const result = await enhanceWithHuggingFace(
    jobId,
    job.original_video_url || "",
    hfOpts
  );

  if (!result.success) {
    await updateJobStatus(supabase, jobId, "failed", result.error);
    await logStep(supabase, jobId, "hf_enhance", "failed", result.error || "HF Space failed");
    return result;
  }

  await logStep(supabase, jobId, "hf_enhance", "completed", "AI enhancement complete");
  await updateJobStatus(supabase, jobId, "rendering");
  await logStep(supabase, jobId, "render", "started", "Finalizing output");

  const processingTime = result.processingTime || Date.now() - startTime;
  const outputResolution = result.metadata?.resolution || "unknown";

  await supabase
    .from("video_jobs")
    .update({
      status: "completed",
      enhanced_video_url: result.outputPath,
      output_resolution: outputResolution,
      output_size: result.metadata?.size || null,
      output_duration: result.metadata?.duration || null,
      processing_time: processingTime,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  await logStep(
    supabase,
    jobId,
    "render",
    "completed",
    `Job done in ${(processingTime / 1000).toFixed(1)}s | ${outputResolution} | plan=${job.plan}`
  );

  console.log(`[Processor] ✓ Job ${jobId} done in ${processingTime}ms`);
  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updateJobStatus(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  status: string,
  errorMessage?: string
) {
  await supabase
    .from("video_jobs")
    .update({
      status,
      error_message: errorMessage || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function logStep(
  supabase: ReturnType<typeof createServiceClient>,
  jobId: string,
  step: string,
  status: "started" | "completed" | "failed",
  message: string
) {
  await supabase.from("processing_logs").insert({
    job_id: jobId,
    step,
    status,
    message,
  });
}
