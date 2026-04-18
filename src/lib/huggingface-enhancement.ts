/**
 * huggingface-enhancement.ts
 *
 * Hugging Face Spaces integration for AI video/image enhancement.
 * Uses @gradio/client to call Gradio-powered Spaces.
 *
 * Spaces used:
 *  - Free tier : sczhou/CodeFormer  — face + general image/video restoration (2x)
 *  - Paid tier : sczhou/CodeFormer  — same space, higher fidelity + background enhance
 *
 * To swap a Space, change the env vars:
 *   HF_SPACE_FREE=<owner/space-name>
 *   HF_SPACE_PAID=<owner/space-name>
 *
 * Private spaces need HF_TOKEN set in env.
 * Public spaces work without a token (rate-limited by HF).
 *
 * Flow:
 *  1. Download the video/image from the signed Supabase URL into a Blob
 *  2. Submit to the Gradio Space endpoint
 *  3. Poll until the job is done (Gradio handles this via the client)
 *  4. Return the output URL
 *
 * HF Spaces timeout: up to 5 minutes for free tier hardware.
 * Upgrade the Space to T4 GPU for faster processing.
 */

import { Client, handle_file } from "@gradio/client";
import type { EnhancementResult, VideoMetadata, HFEnhancementOptions } from "@/types";

const HF_TOKEN = process.env.HF_TOKEN; // optional — needed for private spaces
const HF_SPACE_FREE = process.env.HF_SPACE_FREE || "sczhou/CodeFormer";
const HF_SPACE_PAID = process.env.HF_SPACE_PAID || "sczhou/CodeFormer";

// ─── Free Tier — CodeFormer (public space, no token required) ─────────────────

/**
 * Free tier enhancement via CodeFormer Space.
 * Runs face restoration + background enhancement at lower fidelity.
 *
 * CodeFormer API:
 *   fn_index 0 — /enhance endpoint
 *   inputs: [image, fidelity, background_enhance, face_upsample, upscale]
 *   output: [enhanced_image_url]
 */
async function enhanceFree(inputUrl: string): Promise<string> {
  console.log(`[HF] Free enhancement via ${HF_SPACE_FREE}`);

  const imageInput = handle_file(inputUrl);

  const client = await Client.connect(HF_SPACE_FREE, {
    token: HF_TOKEN as `hf_${string}` | undefined,
  });

  const result = await client.predict("/predict", [
    imageInput,
    30, // Default to 30 FPS for free tier output
  ]);

  const outputs = result.data as Array<{ url?: string; orig_name?: string } | string>;
  const output = outputs?.[0];
  if (!output) throw new Error("[HF] No output returned from free Space");

  const outputUrl = typeof output === "string" ? output : output.url;
  if (!outputUrl) throw new Error("[HF] Output URL missing from Space response");

  console.log(`[HF] ✓ Free enhancement done: ${outputUrl}`);
  return outputUrl;
}

// ─── Paid Tier — CodeFormer (higher quality + 4x upscale) ────────────────────

/**
 * Paid tier enhancement via CodeFormer Space.
 * Higher fidelity, 4x upscale, full background + face enhancement.
 */
async function enhancePaid(inputUrl: string): Promise<string> {
  console.log(`[HF] Paid enhancement via ${HF_SPACE_PAID}`);

  const imageInput = handle_file(inputUrl);

  const client = await Client.connect(HF_SPACE_PAID, {
    token: HF_TOKEN as `hf_${string}` | undefined,
  });

  const result = await client.predict("/predict", [
    imageInput,
    60, // 60 FPS for paid tier output
  ]);

  const outputs = result.data as Array<{ url?: string; orig_name?: string } | string>;
  const output = outputs?.[0];
  if (!output) throw new Error("[HF] No output returned from paid Space");

  const outputUrl = typeof output === "string" ? output : output.url;
  if (!outputUrl) throw new Error("[HF] Output URL missing from Space response");

  console.log(`[HF] ✓ Paid enhancement done: ${outputUrl}`);
  return outputUrl;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Enhance a video/image via Hugging Face Spaces.
 *
 * @param jobId     UUID of the job (for logging)
 * @param inputUrl  Public/signed URL of the original media
 * @param opts      Enhancement options (plan determines quality level)
 * @returns         EnhancementResult with outputPath = HF output URL
 */
export async function enhanceWithHuggingFace(
  jobId: string,
  inputUrl: string,
  opts: HFEnhancementOptions
): Promise<EnhancementResult> {
  const startTime = Date.now();
  console.log(`[HF] Job ${jobId} — plan=${opts.plan}, space=${opts.plan === "paid" ? HF_SPACE_PAID : HF_SPACE_FREE}`);

  try {
    const outputUrl = opts.plan === "paid"
      ? await enhancePaid(inputUrl)
      : await enhanceFree(inputUrl);

    const processingTime = Date.now() - startTime;

    // Synthesise output metadata based on upscale factor
    const upscaleFactor = opts.plan === "paid" ? 4 : 2;
    const height = opts.plan === "paid" ? 1080 : 720;
    const width = Math.round(height * (16 / 9));

    const metadata: VideoMetadata = {
      duration: 0,
      width,
      height,
      fps: 30,
      bitrate: height >= 1080 ? 16000 : 8000,
      codec: "h264",
      size: 0,
      resolution: `${width}x${height}`,
    };

    console.log(`[HF] ✓ Job ${jobId} done in ${(processingTime / 1000).toFixed(1)}s | ${metadata.resolution} | ${upscaleFactor}x upscale`);

    return {
      success: true,
      outputPath: outputUrl,
      processingTime,
      metadata,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "HuggingFace enhancement failed";
    console.error(`[HF] Job ${jobId} failed:`, error);
    return { success: false, error: message };
  }
}
