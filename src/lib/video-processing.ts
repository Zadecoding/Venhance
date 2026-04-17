/**
 * video-processing.ts
 *
 * FFmpeg-based video processing utilities.
 * Used exclusively for FREE-tier users.
 *
 * Free tier pipeline:
 *  - Download input from signed URL to tmp
 *  - Upscale to max 720p (no higher) with Lanczos
 *  - Strong temporal denoise (hqdn3d)
 *  - Strong sharpening (unsharp mask)
 *  - Contrast/brightness enhancement (eq filter)
 *  - Watermark overlay (text burn-in)
 *  - H.264 with good quality settings
 *  - Upload enhanced file back to Supabase Storage
 *
 * When running in production with real FFmpeg installed, set
 * FFMPEG_MOCK_MODE=false in .env.local.
 * When FFMPEG_MOCK_MODE=true the commands are built and logged
 * but not executed (safe for dev/Windows without FFmpeg).
 */

import type { VideoMetadata, FFmpegOptions } from "@/types";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Use bare command names — Nixpacks adds FFmpeg to PATH via Nix store.
// Override with FFMPEG_PATH env var if using a custom installation path.
const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";
const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";
const MOCK_MODE = process.env.FFMPEG_MOCK_MODE === "true";

// ─── File Download / Upload Helpers ──────────────────────────────────────────

/**
 * Download a remote URL to a local temp file.
 * Returns the local file path.
 */
export async function downloadToTmp(url: string, ext: string = "mp4"): Promise<string> {
  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `venhance_input_${Date.now()}.${ext}`);

  if (MOCK_MODE) {
    console.log(`[FFmpeg MOCK] Would download ${url} → ${tmpFile}`);
    return tmpFile;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download input video: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(tmpFile, Buffer.from(buffer));
  console.log(`[FFmpeg] Downloaded input to ${tmpFile} (${buffer.byteLength} bytes)`);
  return tmpFile;
}

/**
 * Upload a local file to Supabase Storage and return the storage path.
 */
export async function uploadFromTmp(
  localPath: string,
  storagePath: string,
  contentType: string = "video/mp4",
  storage: { from: (bucket: string) => { upload: (path: string, data: unknown, opts: unknown) => Promise<{ error: unknown }> } }
): Promise<void> {
  if (MOCK_MODE) {
    console.log(`[FFmpeg MOCK] Would upload ${localPath} → storage:videos/${storagePath}`);
    return;
  }

  const fileBuffer = fs.readFileSync(localPath);
  const { error } = await storage.from("videos").upload(storagePath, fileBuffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to upload enhanced video: ${(error as Error).message}`);
  }

  console.log(`[FFmpeg] ✓ Uploaded enhanced video to ${storagePath}`);
}

/**
 * Clean up a local temp file safely.
 */
export function cleanupTmp(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Non-fatal
  }
}

// ─── Metadata Extraction ──────────────────────────────────────────────────────

/**
 * Extract video metadata using FFprobe.
 * Falls back to realistic mock data if FFprobe is unavailable or MOCK_MODE is on.
 */
export async function extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
  if (MOCK_MODE || !filePath) {
    return getMockMetadata();
  }

  try {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    const { stdout } = await execFileAsync(FFPROBE_BIN, [
      "-v", "quiet",
      "-print_format", "json",
      "-show_streams",
      "-show_format",
      filePath,
    ]);

    const info = JSON.parse(stdout);
    const videoStream = info.streams?.find((s: Record<string, unknown>) => s.codec_type === "video");
    const format = info.format || {};

    if (!videoStream) return getMockMetadata();

    const width = parseInt(videoStream.width) || 854;
    const height = parseInt(videoStream.height) || 480;
    const [fpsNum, fpsDen] = (videoStream.r_frame_rate || "30/1").split("/");
    const fps = Math.round(parseInt(fpsNum) / parseInt(fpsDen));

    return {
      duration: parseFloat(format.duration) || 30,
      width,
      height,
      fps,
      bitrate: parseInt(format.bit_rate) || 1500,
      codec: videoStream.codec_name || "h264",
      size: parseInt(format.size) || 10 * 1024 * 1024,
      resolution: `${width}x${height}`,
    };
  } catch (err) {
    console.warn("[FFprobe] Could not extract metadata, using mock:", err);
    return getMockMetadata();
  }
}

function getMockMetadata(): VideoMetadata {
  return {
    duration: 30,
    width: 854,
    height: 480,
    fps: 30,
    bitrate: 1500,
    codec: "h264",
    size: 10 * 1024 * 1024,
    resolution: "854x480",
  };
}

// ─── Free Tier FFmpeg Command ─────────────────────────────────────────────────

/**
 * Build the FFmpeg command for FREE users.
 *
 * Filter chain (in order):
 *  1. Scale to 720p — Lanczos (high-quality upscaling)
 *  2. FPS conversion — if user requested a specific frame rate
 *  3. Deblocking — pp=hb/vb/dr/al removes compression artefacts
 *  4. Smart deblur — smartblur=lr:ls:lt:cr:cs:ct (negative threshold = sharpen)
 *  5. Strong temporal + spatial denoise — hqdn3d
 *  6. Strong unsharp mask — aggressively recovers lost detail
 *  7. Contrast/saturation lift — eq filter
 *  8. Watermark text overlay
 *
 * Codec: libx264 CRF 18 (high quality), profile high
 */
export function buildFFmpegFreeCommand(
  inputPath: string,
  outputPath: string,
  opts: FFmpegOptions
): string {
  const filters: string[] = [];

  // 1. Scale to 720p with high-quality Lanczos
  filters.push(`scale=-2:${opts.maxHeight}:flags=lanczos+accurate_rnd`);

  // 2. FPS conversion (optional — user-chosen frame rate)
  if (opts.targetFps) {
    filters.push(`fps=${opts.targetFps}`);
  }

  // 3. Deblocking — removes compression block artefacts before sharpening
  //    pp=hb/vb/dr/al: horizontal+vertical deblock, deringing, auto-level
  filters.push("pp=hb/vb/dr/al");

  // 4. Smart deblur — smartblur with NEGATIVE luma_strength sharpens instead of blurs
  //    smartblur=luma_radius:luma_strength:luma_threshold:chroma_radius:chroma_strength:chroma_threshold
  //    luma_strength < 0 = sharpen (−1.5 is aggressive but avoids haloing)
  //    luma_threshold controls which edges are affected (100 = all)
  //    This filter is specifically designed to remove general video blur.
  if (opts.deblur !== false) {
    filters.push("smartblur=1.5:-0.35:-3.5:0.65:0.25:2.0");
  }

  // 5. Strong temporal + spatial denoise
  //    hqdn3d=<luma_spatial>:<chroma_spatial>:<luma_tmp>:<chroma_tmp>
  //    Strong enough to clear noise without smearing detail
  if (opts.denoise) {
    filters.push("hqdn3d=3:2:5:3");
  }

  // 6. Strong unsharp mask — recovers lost sharpness / combats blur
  //    5x5 kernel, 1.8 luma amount — noticeably sharp, targets edges
  if (opts.sharpen) {
    filters.push("unsharp=5:5:1.8:5:5:0.5");
  }

  // 7. Contrast/saturation/brightness lift — makes video feel vivid and clean
  filters.push("eq=contrast=1.12:brightness=0.02:saturation=1.2:gamma=1.02");

  // 8. Watermark — burn text overlay at bottom-right
  if (opts.watermark) {
    const text = (opts.watermarkText || "VEnhance Free").replace(/'/g, "\\'");
    filters.push(
      `drawtext=text='${text}':fontsize=22:fontcolor=white@0.65:` +
      `x=w-tw-14:y=h-th-14:shadowx=2:shadowy=2:shadowcolor=black@0.6`
    );
  }

  const vf = filters.length > 0 ? `-vf "${filters.join(",")}"` : "";

  // Audio pass-through args
  const audioArgs = [
    "-c:a aac",
    "-b:a 192k",
    "-ar 44100",
  ];

  return [
    `"${FFMPEG_BIN}"`,
    `-i "${inputPath}"`,
    vf,
    "-c:v libx264",
    "-crf 18",           // high quality — 18 is near-lossless for H.264
    "-preset medium",    // good balance of speed vs compression
    "-profile:v high",
    "-level 4.1",
    "-pix_fmt yuv420p",  // broad compatibility
    ...audioArgs,
    "-movflags +faststart",
    `"${outputPath}"`,
    "-y",
  ]
    .filter(Boolean)
    .join(" ");
}

// ─── Paid Tier FFmpeg Command (fallback) ──────────────────────────────────────

/**
 * Build FFmpeg command for PAID users needing a local fallback
 * (e.g., when Replicate is unreachable).
 *
 * No watermark, max quality, 1080p, libx265.
 */
export function buildFFmpegPaidFallbackCommand(
  inputPath: string,
  outputPath: string
): string {
  return [
    `"${FFMPEG_BIN}"`,
    `-i "${inputPath}"`,
    `-vf "scale=-2:1080:flags=lanczos+accurate_rnd,pp=hb/vb/dr/al,smartblur=1.5:-0.5:-3.5:0.65:0.3:2.0,hqdn3d=5:4:7:5,unsharp=7:7:2.2:7:7:0.7,eq=contrast=1.15:brightness=0.03:saturation=1.25"`,
    "-c:v libx265",
    "-crf 16",
    "-preset medium",
    "-pix_fmt yuv420p",
    "-c:a aac",
    "-b:a 320k",
    "-movflags +faststart",
    `"${outputPath}"`,
    "-y",
  ].join(" ");
}

// ─── Generic FFmpeg Command Builder ──────────────────────────────────────────

/** @deprecated Use buildFFmpegFreeCommand or buildFFmpegPaidFallbackCommand */
export function buildFFmpegCommand(
  inputPath: string,
  outputPath: string,
  options: {
    scale?: string;
    denoise?: boolean;
    sharpen?: boolean;
    stabilize?: boolean;
    fps?: number;
  }
): string {
  const filters: string[] = [];
  if (options.scale) filters.push(`scale=${options.scale}:flags=lanczos`);
  if (options.denoise) filters.push("hqdn3d=4:4:6:6");
  if (options.sharpen) filters.push("unsharp=5:5:1.0:5:5:0.0");
  if (options.fps) filters.push(`fps=${options.fps}`);

  const vf = filters.length > 0 ? `-vf "${filters.join(",")}"` : "";
  return [
    `"${FFMPEG_BIN}"`,
    `-i "${inputPath}"`,
    vf,
    "-c:v libx265", "-crf 18", "-preset medium",
    "-c:a copy", "-movflags +faststart",
    `"${outputPath}"`, "-y",
  ].filter(Boolean).join(" ");
}

// ─── Execute FFmpeg Job ───────────────────────────────────────────────────────

/**
 * Run an FFmpeg command.
 *
 * In MOCK_MODE: logs the command and resolves after a short delay.
 * In production: spawns the real FFmpeg process.
 */
export async function runFFmpegJob(command: string): Promise<void> {
  if (MOCK_MODE) {
    console.log("[FFmpeg MOCK] Command:", command);
    // Simulate realistic processing time (2–8 seconds)
    await new Promise((r) => setTimeout(r, 3000 + Math.random() * 5000));
    console.log("[FFmpeg MOCK] ✓ Processing complete");
    return;
  }

  const { exec } = await import("child_process");
  const { promisify } = await import("util");
  const execAsync = promisify(exec);

  console.log("[FFmpeg] Running:", command);
  const { stdout, stderr } = await execAsync(command, { maxBuffer: 500 * 1024 * 1024 });
  if (stdout) console.log("[FFmpeg stdout]", stdout.slice(0, 500));
  if (stderr) console.log("[FFmpeg stderr]", stderr.slice(0, 1000));
}

// ─── Dimension Helpers ────────────────────────────────────────────────────────

export function getUpscaleDimensions(
  width: number,
  height: number,
  factor: "2x" | "4x" | "8x"
): { width: number; height: number; resolution: string } {
  const factorMap = { "2x": 2, "4x": 4, "8x": 8 };
  const mult = factorMap[factor];
  const newWidth = width * mult;
  const newHeight = height * mult;
  return { width: newWidth, height: newHeight, resolution: `${newWidth}x${newHeight}` };
}

export function estimateOutputSize(inputSize: number, upscaleFactor: "2x" | "4x" | "8x"): number {
  const factorMap = { "2x": 3, "4x": 8, "8x": 20 };
  return inputSize * factorMap[upscaleFactor];
}

export function parseResolution(resolution: string): { width: number; height: number } {
  const parts = resolution.split("x");
  if (parts.length !== 2) return { width: 0, height: 0 };
  return { width: parseInt(parts[0]), height: parseInt(parts[1]) };
}

/**
 * Get a clean resolution label for a given pixel height.
 */
export function getResolutionLabel(height: number): string {
  if (height >= 2160) return "4K";
  if (height >= 1080) return "1080p";
  if (height >= 720) return "720p";
  if (height >= 480) return "480p";
  return `${height}p`;
}
