/**
 * job-processor.ts
 *
 * Central dispatcher for video enhancement jobs.
 * ALL tiers (free and paid) now use the Replicate pipeline.
 *
 * Free tier:  Replicate upscale to 720p, no face enhance, watermark added post-process
 * Paid tier:  Replicate upscale to 1080p/4K, face enhancement enabled
 *
 * This is the ONLY place where tier differentiation logic lives.
 * All API routes and queue workers call processJob(jobId) and nothing else.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { enhanceVideoPaid } from "@/lib/replicate-enhancement";
import type { VideoJob, ReplicateOptions, EnhancementResult } from "@/types";

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Process a video job end-to-end.
 *
 * @param jobId  UUID of the job in video_jobs table
 * @returns      EnhancementResult with success/failure details
 */
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

  console.log(
    `[Processor] Processing job ${jobId} | plan=${typedJob.plan}`
  );

  try {
    return await processWithReplicate(typedJob, supabase);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(`[Processor] Job ${jobId} crashed:`, error);
    await updateJobStatus(supabase, jobId, "failed", message);
    await logStep(supabase, jobId, "processor", "failed", message);
    return { success: false, error: message };
  }
}

// ─── Replicate Pipeline (all tiers) ──────────────────────────────────────────
//
// Free tier:  upscale to 720p equivalent (scale=2), no face enhance
// Paid tier:  upscale to 1080p or 4K (scale=4), face enhancement enabled

async function processWithReplicate(
  job: VideoJob,
  supabase: ReturnType<typeof createServiceClient>
): Promise<EnhancementResult> {
  const jobId = job.id;
  const startTime = Date.now();
  const isPaid = job.plan === "paid";

  await updateJobStatus(supabase, jobId, "analyzing");
  await logStep(supabase, jobId, "analyze", "started", `Analyzing video for AI enhancement (${job.plan} tier)`);

  const targetResolution = isPaid
    ? ((job.target_resolution === "4k" ? "4k" : "1080p") as "1080p" | "4k")
    : "720p" as "720p";

  const upscaleFactor = targetResolution === "4k" ? 4 : 2;

  const replicateOpts: ReplicateOptions = {
    targetResolution: targetResolution === "720p" ? "1080p" : targetResolution, // Replicate min is 1080p; free tier uses scale=2 on shorter input
    upscaleFactor: upscaleFactor as 2 | 4,
    faceEnhance: isPaid,   // face enhance only for paid users
    aiDenoise: true,
  };

  await updateJobStatus(supabase, jobId, "enhancing");
  await logStep(
    supabase,
    jobId,
    "replicate",
    "started",
    `Replicate AI pipeline | target=${targetResolution} | faceEnhance=${isPaid}`
  );

  const result = await enhanceVideoPaid(
    jobId,
    job.original_video_url || "",
    replicateOpts,
    async (step, prediction) => {
      if (prediction.status === "processing") {
        await logStep(
          supabase,
          jobId,
          `replicate_${step}`,
          "started",
          `Replicate ${step}: ${prediction.status} (id=${prediction.id})`
        );
      }
      if (step === "upscale" && prediction.id) {
        await supabase
          .from("video_jobs")
          .update({ replicate_prediction_id: prediction.id })
          .eq("id", jobId);
      }
    }
  );

  if (!result.success) {
    await updateJobStatus(supabase, jobId, "failed", result.error);
    await logStep(supabase, jobId, "replicate", "failed", result.error || "Replicate failed");
    return result;
  }

  await logStep(supabase, jobId, "replicate", "completed", "AI enhancement complete");
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
