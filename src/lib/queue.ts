/**
 * queue.ts
 *
 * Priority queue system for video enhancement jobs.
 *
 * Design:
 *  - Queue state lives in the `video_jobs` Supabase table (status = 'pending').
 *  - Priority: paid = 10, free = 1 (higher number = processed first).
 *  - Among equal-priority jobs, older jobs go first (FIFO within tier).
 *  - The queue worker atomically picks the next job to avoid double-processing.
 *
 * Queue priority order:
 *  1. Paid jobs (priority=10), oldest first
 *  2. Free jobs (priority=1),  oldest first
 *
 * This module ONLY handles queue logic (enqueue / dequeue / status).
 * Actual processing is in job-processor.ts.
 */

import { createServiceClient } from "@/lib/supabase/service";
import type { UserPlan, QueueEntry } from "@/types";

// Priority values — change these to adjust weighting
export const PRIORITY = {
  paid: parseInt(process.env.QUEUE_PRIORITY_PAID || "10"),
  free: parseInt(process.env.QUEUE_PRIORITY_FREE || "1"),
} as const;

// ─── Enqueue ──────────────────────────────────────────────────────────────────

/**
 * Set a job's plan, priority, processor and watermark fields when it's created.
 * Called from the upload route right after the DB insert.
 *
 * This doesn't insert a new row — the job is already created. It just
 * patches the queue-related columns.
 */
export async function enqueueJob(
  jobId: string,
  plan: UserPlan
): Promise<void> {
  const supabase = createServiceClient();

  const priority = PRIORITY[plan];
  const processor = "replicate";
  const watermark = plan === "free";
  const targetResolution = plan === "paid" ? "1080p" : "720p";

  const { error } = await supabase
    .from("video_jobs")
    .update({
      plan,
      priority,
      processor,
      watermark,
      target_resolution: targetResolution,
      status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    console.error(`[Queue] Failed to enqueue job ${jobId}:`, error);
    throw new Error(`Failed to enqueue job: ${error.message}`);
  }

  // Update queue_position for all pending jobs (denormalized for fast reads)
  await refreshQueuePositions();

  console.log(
    `[Queue] ✓ Enqueued job ${jobId} | plan=${plan} priority=${priority} processor=${processor}`
  );
}

// ─── Dequeue ──────────────────────────────────────────────────────────────────

/**
 * Atomically pick the next job to process.
 *
 * Uses a Postgres-style advisory approach:
 *  - Select the top pending job (highest priority, oldest first)
 *  - Immediately update its status to 'processing'
 *  - Return the job ID
 *
 * This prevents multiple concurrent workers from picking the same job.
 */
export async function dequeueNextJob(): Promise<string | null> {
  const supabase = createServiceClient();

  // Find the highest-priority pending job
  const { data: jobs, error: selectError } = await supabase
    .from("video_jobs")
    .select("id, plan, priority")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (selectError) {
    console.error("[Queue] Failed to query pending jobs:", selectError);
    return null;
  }

  if (!jobs || jobs.length === 0) {
    console.log("[Queue] Queue is empty — no pending jobs");
    return null;
  }

  const job = jobs[0];

  // Atomically claim it: only update if it's still 'pending'
  const { data: updated, error: updateError } = await supabase
    .from("video_jobs")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("status", "pending")   // guard against race condition
    .select("id")
    .single();

  if (updateError || !updated) {
    console.warn(`[Queue] Job ${job.id} was already claimed by another worker`);
    return null;
  }

  console.log(`[Queue] ✓ Dequeued job ${job.id} (plan=${job.plan}, priority=${job.priority})`);
  return job.id;
}

// ─── Queue Status ─────────────────────────────────────────────────────────────

/**
 * Get the full ordered queue of pending jobs.
 */
export async function getQueue(): Promise<QueueEntry[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("video_jobs")
    .select("id, plan, priority, created_at, queue_position")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Queue] Failed to fetch queue:", error);
    return [];
  }

  return (data || []).map((row, idx) => ({
    jobId: row.id,
    plan: row.plan as UserPlan,
    priority: row.priority,
    createdAt: row.created_at,
    position: idx + 1,
  }));
}

/**
 * Get the queue position of a specific job (1-indexed).
 * Returns null if the job is not in the queue.
 */
export async function getJobQueuePosition(jobId: string): Promise<number | null> {
  const queue = await getQueue();
  const entry = queue.find((e) => e.jobId === jobId);
  return entry?.position ?? null;
}

/**
 * Count how many jobs are currently being processed.
 */
export async function getActiveWorkerCount(): Promise<number> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("video_jobs")
    .select("*", { count: "exact", head: true })
    .eq("status", "processing");
  return count || 0;
}

// ─── Queue Position Refresh ───────────────────────────────────────────────────

/**
 * Refresh the `queue_position` denormalized column for all pending jobs.
 * Call after enqueue or dequeue to keep positions accurate.
 */
export async function refreshQueuePositions(): Promise<void> {
  const supabase = createServiceClient();

  const { data: pending, error } = await supabase
    .from("video_jobs")
    .select("id")
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  if (error || !pending) return;

  // Update each job's queue_position in batch
  await Promise.all(
    pending.map((job, idx) =>
      supabase
        .from("video_jobs")
        .update({ queue_position: idx + 1 })
        .eq("id", job.id)
    )
  );
}

// ─── Queue Summary ────────────────────────────────────────────────────────────

export interface QueueSummary {
  pendingTotal: number;
  pendingPaid: number;
  pendingFree: number;
  activeWorkers: number;
  queue: QueueEntry[];
}

export async function getQueueSummary(): Promise<QueueSummary> {
  const supabase = createServiceClient();

  const [queue, activeWorkers, paidCount, freeCount] = await Promise.all([
    getQueue(),
    getActiveWorkerCount(),
    supabase
      .from("video_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("plan", "paid")
      .then(({ count }) => count || 0),
    supabase
      .from("video_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("plan", "free")
      .then(({ count }) => count || 0),
  ]);

  return {
    pendingTotal: queue.length,
    pendingPaid: paidCount,
    pendingFree: freeCount,
    activeWorkers,
    queue,
  };
}
