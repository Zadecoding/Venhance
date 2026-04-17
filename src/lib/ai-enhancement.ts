/**
 * ai-enhancement.ts
 *
 * Thin abstraction layer over the Replicate provider.
 * Kept for backward compatibility — new code should call
 * enhanceVideoPaid() from replicate-enhancement.ts directly.
 */

import type { EnhancementOptions, EnhancementResult } from "@/types";
import { enhanceVideoPaid } from "@/lib/replicate-enhancement";

// ─── Main enhancement function (backward compat) ───────────────────────────

export async function enhanceVideo(
  jobId: string,
  inputPath: string,
  _outputPath: string,
  options: EnhancementOptions = {}
): Promise<EnhancementResult> {
  const factor = options.upscaleResolution === "4x" ? 4 : 2;
  const targetResolution = factor === 4 ? "4k" : "1080p";

  console.log(`[Enhancement] Job ${jobId} — Replicate (${targetResolution}, factor=${factor}x)`);

  try {
    return await enhanceVideoPaid(jobId, inputPath, {
      targetResolution: targetResolution as "1080p" | "4k",
      upscaleFactor: factor as 2 | 4,
      faceEnhance: options.faceEnhance ?? true,
      aiDenoise: true,
    });
  } catch (error) {
    console.error(`[Enhancement] Job ${jobId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Enhancement failed",
    };
  }
}
