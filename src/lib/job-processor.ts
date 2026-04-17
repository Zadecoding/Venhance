/**
 * job-processor.ts
 *
 * Central dispatcher for video enhancement jobs.
 * Reads the job's plan and routes to the correct pipeline:
 *
 *  plan === "free"  → FFmpeg pipeline (720p, sharpen, denoise, watermark)
 *  plan === "paid"  → Replicate pipeline (1080p/4K, face enhance, AI denoise)
 *
 * This is the ONLY place where the free/paid branching logic lives.
 * All API routes and queue workers call processJob(jobId) and nothing else.
 */

import { createServiceClient } from "@/lib/supabase/service";
import {
  extractVideoMetadata,
  buildFFmpegFreeCommand,
  runFFmpegJob,
  downloadToTmp,
  uploadFromTmp,
  cleanupTmp,
} from "@/lib/video-processing";
import { enhanceVideoPaid } from "@/lib/replicate-enhancement";
import type { VideoJob, FFmpegOptions, ReplicateOptions, EnhancementResult } from "@/types";
import * as path from "path";
import * as os from "os";

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
    `[Processor] Processing job ${jobId} | plan=${typedJob.plan} | processor=${typedJob.processor}`
  );

  try {
    if (typedJob.plan === "paid") {
      return await processPaidJob(typedJob, supabase);
    } else {
      return await processFreeJob(typedJob, supabase);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    console.error(`[Processor] Job ${jobId} crashed:`, error);
    await updateJobStatus(supabase, jobId, "failed", message);
    await logStep(supabase, jobId, "processor", "failed", message);
    return { success: false, error: message };
  }
}

// ─── Free Tier — FFmpeg Pipeline ─────────────────────────────────────────────
//
// Full pipeline:
//   1. Download original video from signed URL → local /tmp file
//   2. FFprobe metadata extraction
//   3. FFmpeg: scale 720p + strong denoise + sharpen + eq + watermark
//   4. Upload enhanced /tmp file → Supabase Storage (enhanced.mp4)
//   5. Generate new signed URL for enhanced video
//   6. Update job record with real enhanced URL
//   7. Cleanup /tmp files

async function processFreeJob(
  job: VideoJob,
  supabase: ReturnType<typeof createServiceClient>
): Promise<EnhancementResult> {
  const jobId = job.id;
  const startTime = Date.now();
  const isMock = process.env.FFMPEG_MOCK_MODE === "true";

  let inputTmpPath = "";
  let outputTmpPath = "";

  try {
    await updateJobStatus(supabase, jobId, "analyzing");
    await logStep(supabase, jobId, "analyze", "started", "Downloading and analyzing video (free tier)");

    // ── 1. Download input ─────────────────────────────────────────────────────
    const ext = (job.storage_path || "original.mp4").split(".").pop() || "mp4";
    outputTmpPath = path.join(os.tmpdir(), `venhance_out_${jobId}.mp4`);
    inputTmpPath = await downloadToTmp(job.original_video_url || "", ext);

    // ── 2. Extract metadata ───────────────────────────────────────────────────
    const metadata = await extractVideoMetadata(inputTmpPath);
    await logStep(
      supabase,
      jobId,
      "analyze",
      "completed",
      `Resolution: ${metadata.resolution} | Duration: ${metadata.duration}s | FPS: ${metadata.fps}`
    );

    // ── 3. Build FFmpeg command with strong enhancement ──────────────────────────
    const ffmpegOpts: FFmpegOptions = {
      maxHeight: 720,
      denoise: true,
      sharpen: true,
      deblur: true,   // smartblur deblur — always on for free tier
      watermark: job.watermark ?? true,
      watermarkText: process.env.WATERMARK_TEXT || "VEnhance Free",
      // target_fps stored as string like "30" or "60" on the job
      targetFps: job.target_fps ? parseInt(String(job.target_fps)) : undefined,
    };

    const command = buildFFmpegFreeCommand(inputTmpPath, outputTmpPath, ffmpegOpts);

    await updateJobStatus(supabase, jobId, "enhancing");
    await logStep(
      supabase,
      jobId,
      "ffmpeg",
      "started",
      `FFmpeg: Lanczos 720p + denoise hqdn3d + unsharp + eq contrast | watermark=${ffmpegOpts.watermark}`
    );

    // ── 4. Run FFmpeg ─────────────────────────────────────────────────────────
    await runFFmpegJob(command);
    await logStep(supabase, jobId, "ffmpeg", "completed", "FFmpeg enhancement complete");

    // ── 5. Upload enhanced video ──────────────────────────────────────────────
    await updateJobStatus(supabase, jobId, "rendering");
    await logStep(supabase, jobId, "render", "started", "Uploading enhanced video to storage");

    const enhancedStoragePath = job.storage_path
      ? job.storage_path.replace(/\/original\.[^/]+$/, "/enhanced.mp4")
      : `${job.user_id}/${Date.now()}/enhanced.mp4`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await uploadFromTmp(outputTmpPath, enhancedStoragePath, "video/mp4", supabase.storage as any);

    // ── 6. Generate signed URL for enhanced video ─────────────────────────────
    let enhancedUrl: string | null = job.original_video_url; // fallback

    if (!isMock) {
      const { data: signedData, error: signedError } = await supabase.storage
        .from("videos")
        .createSignedUrl(enhancedStoragePath, 60 * 60 * 24 * 7); // 7 days

      if (signedError || !signedData?.signedUrl) {
        console.warn("[Processor] Signed URL for enhanced video failed:", signedError);
      } else {
        enhancedUrl = signedData.signedUrl;
      }
    }

    // ── 7. Calculate output resolution ────────────────────────────────────────
    const inputW = metadata.width || 854;
    const inputH = metadata.height || 480;
    const finalH = 720; // free tier always outputs 720p
    const finalW = Math.round(inputW * (finalH / inputH));
    const outputResolution = `${finalW}x${finalH}`;
    const processingTime = Date.now() - startTime;

    // ── 8. Mark job complete ──────────────────────────────────────────────────
    await supabase
      .from("video_jobs")
      .update({
        status: "completed",
        enhanced_video_url: enhancedUrl,
        enhanced_storage_path: enhancedStoragePath,
        output_resolution: outputResolution,
        processing_time: processingTime,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await logStep(
      supabase,
      jobId,
      "render",
      "completed",
      `Done in ${(processingTime / 1000).toFixed(1)}s | ${outputResolution} | watermark=${ffmpegOpts.watermark} | mock=${isMock}`
    );

    console.log(`[Processor] ✓ Free job ${jobId} done in ${processingTime}ms`);

    return {
      success: true,
      outputPath: enhancedUrl || enhancedStoragePath,
      processingTime,
      metadata: {
        duration: metadata.duration,
        width: finalW,
        height: finalH,
        fps: metadata.fps,
        bitrate: metadata.bitrate,
        codec: "h264",
        size: metadata.size,
        resolution: outputResolution,
      },
    };
  } finally {
    cleanupTmp(inputTmpPath);
    cleanupTmp(outputTmpPath);
  }
}

// ─── Paid Tier — Replicate Pipeline ──────────────────────────────────────────

async function processPaidJob(
  job: VideoJob,
  supabase: ReturnType<typeof createServiceClient>
): Promise<EnhancementResult> {
  const jobId = job.id;
  const startTime = Date.now();

  await updateJobStatus(supabase, jobId, "analyzing");
  await logStep(supabase, jobId, "analyze", "started", "Analyzing video for AI enhancement (paid tier)");

  const metadata = await extractVideoMetadata(job.original_video_url || "");
  await logStep(
    supabase,
    jobId,
    "analyze",
    "completed",
    `Resolution: ${metadata.resolution} | Duration: ${metadata.duration}s`
  );

  const targetResolution = (job.target_resolution === "4k" ? "4k" : "1080p") as "1080p" | "4k";
  const upscaleFactor = targetResolution === "4k" ? 4 : 2;

  const replicateOpts: ReplicateOptions = {
    targetResolution,
    upscaleFactor,
    faceEnhance: true,
    aiDenoise: true,
  };

  await updateJobStatus(supabase, jobId, "enhancing");
  await logStep(
    supabase,
    jobId,
    "replicate",
    "started",
    `Replicate AI pipeline | target=${targetResolution} | faceEnhance=true`
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
  const outputResolution =
    result.metadata?.resolution ||
    `${replicateOpts.upscaleFactor * metadata.width}x${replicateOpts.upscaleFactor * metadata.height}`;

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
    `Paid job done in ${(processingTime / 1000).toFixed(1)}s | ${outputResolution} | no watermark`
  );

  console.log(`[Processor] ✓ Paid job ${jobId} done in ${processingTime}ms`);
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
