import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatProcessingTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function getVideoThumbnailUrl(videoUrl: string): string {
  // Placeholder - in production integrate with video CDN thumbnail generation
  return "/placeholder-thumbnail.jpg";
}

export function validateVideoFile(file: File): { valid: boolean; error?: string } {
  const maxSizeMb = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB || "500");
  const allowedFormats = ["video/mp4", "video/mov", "video/webm", "video/avi", "video/quicktime", "video/x-matroska"];

  if (!allowedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Accepted: MP4, MOV, WebM, AVI`,
    };
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${maxSizeMb}MB`,
    };
  }

  return { valid: true };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
    case "processing":
    case "enhancing":
    case "analyzing":
    case "rendering":
      return "text-violet-400 bg-violet-400/10 border-violet-400/30";
    case "uploading":
      return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
    case "queued":
      return "text-amber-400 bg-amber-400/10 border-amber-400/30";
    case "failed":
      return "text-red-400 bg-red-400/10 border-red-400/30";
    default:
      return "text-zinc-400 bg-zinc-400/10 border-zinc-400/30";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "queued": return "Queued";
    case "uploading": return "Uploading";
    case "analyzing": return "Analyzing";
    case "enhancing": return "Enhancing";
    case "rendering": return "Rendering";
    case "completed": return "Completed";
    case "failed": return "Failed";
    default: return status;
  }
}

export async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => resolve(0);
    video.src = URL.createObjectURL(file);
  });
}

export async function getVideoResolution(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => resolve({ width: 0, height: 0 });
    video.src = URL.createObjectURL(file);
  });
}
