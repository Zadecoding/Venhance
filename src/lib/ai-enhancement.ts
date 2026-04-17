/**
 * ai-enhancement.ts
 *
 * Abstraction layer for AI enhancement providers.
 * Kept for backward compatibility — new code should use job-processor.ts directly.
 *
 * Provider routing:
 *  - PAID_PROCESSOR=replicate → ReplicateProvider (default)
 *  - PAID_PROCESSOR=runpod   → RunPodProvider (fill in when migrating)
 *  - AI_ENHANCEMENT_PROVIDER=mock → MockProvider (dev/test)
 */

import type { EnhancementOptions, EnhancementResult, VideoMetadata } from "@/types";
import { enhanceVideoPaid } from "@/lib/replicate-enhancement";

export interface AIEnhancementProvider {
  name: string;
  enhanceVideo(
    inputPath: string,
    outputPath: string,
    options: EnhancementOptions
  ): Promise<EnhancementResult>;
  getCapabilities(): EnhancementCapabilities;
}

export interface EnhancementCapabilities {
  maxResolution: string;
  supportedUpscaleFactors: string[];
  supportsStabilization: boolean;
  supportsColorEnhancement: boolean;
  estimatedProcessingTime: (durationSeconds: number) => number;
}

// ─── Replicate Provider ───────────────────────────────────────────────────────

class ReplicateAIProvider implements AIEnhancementProvider {
  name = "Replicate AI (Real-ESRGAN + CodeFormer)";

  getCapabilities(): EnhancementCapabilities {
    return {
      maxResolution: "4K",
      supportedUpscaleFactors: ["2x", "4x"],
      supportsStabilization: false,
      supportsColorEnhancement: false,
      // Real-ESRGAN typically takes 30–120s per image on Replicate's GPU fleet
      estimatedProcessingTime: (duration: number) => duration * 4 * 1000,
    };
  }

  async enhanceVideo(
    inputPath: string,
    _outputPath: string,
    options: EnhancementOptions
  ): Promise<EnhancementResult> {
    const factor = options.upscaleResolution === "4x" ? 4 : 2;
    const targetResolution = factor === 4 ? "4k" : "1080p";

    return enhanceVideoPaid(
      "legacy-call",
      inputPath,
      {
        targetResolution: targetResolution as "1080p" | "4k",
        upscaleFactor: factor as 2 | 4,
        faceEnhance: true,
        aiDenoise: true,
      }
    );
  }
}

// ─── Mock Provider (dev/test) ─────────────────────────────────────────────────

class MockAIEnhancementProvider implements AIEnhancementProvider {
  name = "MockAI v1.0 (Development)";

  getCapabilities(): EnhancementCapabilities {
    return {
      maxResolution: "8K",
      supportedUpscaleFactors: ["2x", "4x", "8x"],
      supportsStabilization: true,
      supportsColorEnhancement: true,
      estimatedProcessingTime: (duration: number) => duration * 3 * 1000,
    };
  }

  async enhanceVideo(
    inputPath: string,
    outputPath: string,
    options: EnhancementOptions
  ): Promise<EnhancementResult> {
    const startTime = Date.now();
    console.log(`[MockAI] Starting enhancement: ${inputPath}`);

    await this.simulateStep("Analyzing video quality", 800);
    if (options.upscaleResolution) await this.simulateStep(`Upscaling ${options.upscaleResolution}`, 1500);
    if (options.denoise !== false) await this.simulateStep("Denoising", 1000);
    if (options.sharpen !== false) await this.simulateStep("Sharpening", 800);
    if (options.colorEnhance !== false) await this.simulateStep("Color grading", 600);
    await this.simulateStep("Rendering output", 1200);

    const factor = { "2x": 2, "4x": 4, "8x": 8 }[options.upscaleResolution || "2x"] || 2;
    const w = 1920 * factor;
    const h = 1080 * factor;

    return {
      success: true,
      outputPath,
      processingTime: Date.now() - startTime,
      metadata: {
        duration: 30,
        width: w,
        height: h,
        fps: options.fps || 60,
        bitrate: 8000 * factor,
        codec: "h265",
        size: 50 * 1024 * 1024 * factor,
        resolution: `${w}x${h}`,
      },
    };
  }

  private async simulateStep(name: string, ms: number): Promise<void> {
    console.log(`[MockAI] ${name}...`);
    await new Promise((r) => setTimeout(r, ms));
    console.log(`[MockAI] ✓ ${name}`);
  }
}

// ─── RunPod Provider Stub ─────────────────────────────────────────────────────
// Swap PAID_PROCESSOR=runpod when ready. Fill in the implementation below.

class RunPodProvider implements AIEnhancementProvider {
  name = "RunPod (stub — not yet implemented)";

  getCapabilities(): EnhancementCapabilities {
    return {
      maxResolution: "4K",
      supportedUpscaleFactors: ["2x", "4x"],
      supportsStabilization: false,
      supportsColorEnhancement: false,
      estimatedProcessingTime: (d) => d * 2 * 1000,
    };
  }

  async enhanceVideo(): Promise<EnhancementResult> {
    // TODO: implement RunPod serverless endpoint call
    // const res = await fetch(`https://api.runpod.io/v2/${process.env.RUNPOD_ENDPOINT_ID}/run`, {
    //   method: "POST",
    //   headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` },
    //   body: JSON.stringify({ input: { ... } })
    // });
    return { success: false, error: "RunPod provider not yet implemented" };
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

export function getAIEnhancementProvider(): AIEnhancementProvider {
  const providerName =
    process.env.AI_ENHANCEMENT_PROVIDER ||
    process.env.PAID_PROCESSOR ||
    "replicate";

  switch (providerName) {
    case "replicate":
      return new ReplicateAIProvider();
    case "runpod":
      return new RunPodProvider();
    case "mock":
    default:
      return new MockAIEnhancementProvider();
  }
}

// ─── Main enhancement function (kept for backward compat) ─────────────────────

export async function enhanceVideo(
  jobId: string,
  inputPath: string,
  outputPath: string,
  options: EnhancementOptions = {}
): Promise<EnhancementResult> {
  const provider = getAIEnhancementProvider();
  console.log(`[Enhancement] Job ${jobId} — Provider: ${provider.name}`);

  try {
    return await provider.enhanceVideo(inputPath, outputPath, {
      upscaleResolution: options.upscaleResolution || "2x",
      denoise: options.denoise !== false,
      sharpen: options.sharpen !== false,
      colorEnhance: options.colorEnhance !== false,
      stabilize: options.stabilize || false,
      fps: options.fps || 60,
    });
  } catch (error) {
    console.error(`[Enhancement] Job ${jobId} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Enhancement failed",
    };
  }
}
