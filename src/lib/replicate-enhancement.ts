/**
 * replicate-enhancement.ts
 *
 * Replicate API integration for PAID tier video enhancement.
 *
 * Models used:
 *  - Real-ESRGAN  → 1080p / 4K upscaling
 *  - CodeFormer   → Face restoration / face enhancement
 *
 * Easy switch to RunPod:
 *  Change PAID_PROCESSOR=runpod in .env.local
 *  and fill in RUNPOD_API_KEY + RUNPOD_ENDPOINT_ID.
 *  The job-processor.ts dispatcher handles the switch automatically.
 *
 * Polling strategy:
 *  Replicate predictions are async. We poll every POLL_INTERVAL_MS
 *  until status is "succeeded" or "failed", with a TIMEOUT_MS cap.
 */

import type { ReplicatePrediction, ReplicateOptions, EnhancementResult, VideoMetadata } from "@/types";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;
const BASE_URL = "https://api.replicate.com/v1";

// Model version IDs — change here or via env to swap models
const UPSCALE_MODEL =
  process.env.REPLICATE_UPSCALE_MODEL ||
  "nightmaredge/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b";

const FACE_MODEL =
  process.env.REPLICATE_FACE_MODEL ||
  "sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53a4a632d74a1b";

// Polling config
const POLL_INTERVAL_MS = 4000;    // check every 4 seconds
const TIMEOUT_MS = 15 * 60 * 1000; // 15 minute max wait

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function replicatePost(
  path: string,
  body: Record<string, unknown>
): Promise<ReplicatePrediction> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<ReplicatePrediction>;
}

async function replicateGet(url: string): Promise<ReplicatePrediction> {
  const res = await fetch(url, {
    headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
    // No cache — always get fresh status
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate poll error ${res.status}: ${text}`);
  }

  return res.json() as Promise<ReplicatePrediction>;
}

// ─── Polling ──────────────────────────────────────────────────────────────────

/**
 * Poll a Replicate prediction until it finishes (succeeded | failed | canceled).
 * Throws if the timeout is exceeded.
 */
async function pollUntilDone(
  prediction: ReplicatePrediction,
  onProgress?: (p: ReplicatePrediction) => void
): Promise<ReplicatePrediction> {
  const deadline = Date.now() + TIMEOUT_MS;

  while (true) {
    if (prediction.status === "succeeded" || prediction.status === "failed" || prediction.status === "canceled") {
      return prediction;
    }

    if (Date.now() > deadline) {
      throw new Error(`Replicate prediction ${prediction.id} timed out after ${TIMEOUT_MS / 60000} minutes`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    prediction = await replicateGet(prediction.urls.get);
    onProgress?.(prediction);
    console.log(`[Replicate] ${prediction.id} → ${prediction.status}`);
  }
}

// ─── Real-ESRGAN Upscaling ────────────────────────────────────────────────────

/**
 * Upscale a video/image URL using Real-ESRGAN on Replicate.
 *
 * Note: Real-ESRGAN on Replicate works on images frame-by-frame.
 * For full video upscaling at scale, RunPod with a video pipeline
 * is preferred. The model here is ideal for single frames / short clips.
 *
 * @param inputUrl  Public URL of the input video/image
 * @param scale     2 or 4 (upscale factor)
 * @returns         URL of the upscaled output
 */
export async function replicateUpscale(
  inputUrl: string,
  scale: 2 | 4 = 4,
  onProgress?: (p: ReplicatePrediction) => void
): Promise<string> {
  const [modelOwnerVersion] = UPSCALE_MODEL.split(":");
  const version = UPSCALE_MODEL.includes(":") ? UPSCALE_MODEL.split(":")[1] : UPSCALE_MODEL;

  console.log(`[Replicate] Starting upscale (${scale}x) for: ${inputUrl}`);

  const prediction = await replicatePost("/predictions", {
    version,
    input: {
      image: inputUrl,
      scale,
      face_enhance: false,
    },
  });

  const done = await pollUntilDone(prediction, onProgress);

  if (done.status === "failed" || done.status === "canceled") {
    throw new Error(`Replicate upscale failed: ${done.error || done.status}`);
  }

  const output = Array.isArray(done.output) ? done.output[0] : done.output;
  if (!output) throw new Error("Replicate upscale produced no output URL");

  return output;
}

// ─── CodeFormer Face Enhancement ─────────────────────────────────────────────

/**
 * Run CodeFormer face restoration on an image URL.
 *
 * @param inputUrl  Public URL of the input image
 * @param fidelity  0.0–1.0 (0 = max enhancement, 1 = max fidelity to original)
 * @returns         URL of the face-enhanced output
 */
export async function replicateFaceEnhance(
  inputUrl: string,
  fidelity = 0.5,
  onProgress?: (p: ReplicatePrediction) => void
): Promise<string> {
  const version = FACE_MODEL.includes(":") ? FACE_MODEL.split(":")[1] : FACE_MODEL;

  console.log(`[Replicate] Starting face enhancement for: ${inputUrl}`);

  const prediction = await replicatePost("/predictions", {
    version,
    input: {
      image: inputUrl,
      codeformer_fidelity: fidelity,
      background_enhance: true,
      face_upsample: true,
      upscale: 2,
    },
  });

  const done = await pollUntilDone(prediction, onProgress);

  if (done.status === "failed" || done.status === "canceled") {
    throw new Error(`Replicate face enhance failed: ${done.error || done.status}`);
  }

  const output = Array.isArray(done.output) ? done.output[0] : done.output;
  if (!output) throw new Error("Replicate face enhance produced no output URL");

  return output;
}

// ─── Create Prediction (non-blocking — for webhook flow) ─────────────────────

/**
 * Start a Replicate prediction without waiting for completion.
 * Returns the prediction ID immediately so it can be stored in the DB.
 * Result is received via webhook (configure in Replicate project settings).
 */
export async function startReplicatePrediction(
  inputUrl: string,
  opts: ReplicateOptions
): Promise<{ predictionId: string; pollUrl: string }> {
  const version = UPSCALE_MODEL.includes(":") ? UPSCALE_MODEL.split(":")[1] : UPSCALE_MODEL;

  const prediction = await replicatePost("/predictions", {
    version,
    input: {
      image: inputUrl,
      scale: opts.upscaleFactor,
      face_enhance: opts.faceEnhance,
    },
    // Webhook URL for async callbacks (set NEXT_PUBLIC_APP_URL in env)
    webhook: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/replicate/webhook`
      : undefined,
    webhook_events_filter: ["completed"],
  });

  return { predictionId: prediction.id, pollUrl: prediction.urls.get };
}

// ─── Main Paid Enhancement Entry Point ───────────────────────────────────────

/**
 * Run the full paid enhancement pipeline via Replicate.
 *
 * Flow:
 *  1. Upscale to 1080p or 4K using Real-ESRGAN
 *  2. (optional) Face enhancement using CodeFormer
 *
 * Returns an EnhancementResult with the output URL stored in outputPath.
 */
export async function enhanceVideoPaid(
  jobId: string,
  inputUrl: string,
  opts: ReplicateOptions,
  onProgress?: (step: string, prediction: ReplicatePrediction) => void
): Promise<EnhancementResult> {
  const startTime = Date.now();
  console.log(`[Replicate] Job ${jobId} — starting paid pipeline`);
  console.log(`[Replicate] Options:`, opts);

  try {
    // Step 1 — Upscale
    const upscaledUrl = await replicateUpscale(
      inputUrl,
      opts.upscaleFactor,
      (p) => onProgress?.("upscale", p)
    );
    console.log(`[Replicate] ✓ Upscale done: ${upscaledUrl}`);

    // Step 2 — Face enhancement (optional)
    let finalUrl = upscaledUrl;
    if (opts.faceEnhance) {
      finalUrl = await replicateFaceEnhance(
        upscaledUrl,
        0.5,
        (p) => onProgress?.("face_enhance", p)
      );
      console.log(`[Replicate] ✓ Face enhance done: ${finalUrl}`);
    }

    const processingTime = Date.now() - startTime;

    // Synthesise metadata based on requested resolution
    const height = opts.targetResolution === "4k" ? 2160 : 1080;
    const width = Math.round(height * (16 / 9));

    const metadata: VideoMetadata = {
      duration: 0,   // unknown without FFprobe on output
      width,
      height,
      fps: 30,
      bitrate: height >= 2160 ? 40000 : 16000,
      codec: "h264",
      size: 0,
      resolution: `${width}x${height}`,
    };

    return {
      success: true,
      outputPath: finalUrl,
      processingTime,
      metadata,
    };
  } catch (error) {
    console.error(`[Replicate] Job ${jobId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Replicate enhancement failed",
    };
  }
}

// ─── Get Prediction Status (for polling from client/webhook) ─────────────────

export async function getReplicatePrediction(predictionId: string): Promise<ReplicatePrediction> {
  return replicateGet(`${BASE_URL}/predictions/${predictionId}`);
}
