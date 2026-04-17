/**
 * POST /api/queue/worker
 *
 * Queue worker endpoint — picks the next pending job (highest priority first)
 * and processes it end-to-end.
 *
 * Trigger methods:
 *  1. Vercel Cron: Add to vercel.json:
 *       { "crons": [{ "path": "/api/queue/worker", "schedule": "* * * * *" }] }
 *  2. Client auto-poll: Call POST /api/queue/worker after uploading a video.
 *  3. Manual: curl -X POST http://localhost:3000/api/queue/worker \
 *               -H "x-worker-secret: <WORKER_SECRET>"
 *
 * Security:
 *  In production, protect this endpoint with a secret header.
 *  Set WORKER_SECRET in .env.local and pass it as x-worker-secret header.
 *  In development (no secret set) the endpoint is open for easy testing.
 *
 * One call = one job processed.
 * To drain the queue, call repeatedly until response says "queue_empty".
 */
import { NextRequest, NextResponse } from "next/server";
import { dequeueNextJob, getQueueSummary } from "@/lib/queue";
import { processJob } from "@/lib/job-processor";

export async function POST(request: NextRequest) {
  // ── Auth: verify worker secret ────────────────────────────────────────────
  const workerSecret = process.env.WORKER_SECRET;
  if (workerSecret) {
    const providedSecret = request.headers.get("x-worker-secret");
    if (providedSecret !== workerSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    // ── Pick next job ─────────────────────────────────────────────────────────
    const jobId = await dequeueNextJob();

    if (!jobId) {
      const summary = await getQueueSummary();
      return NextResponse.json({
        status: "queue_empty",
        message: "No pending jobs in queue",
        activeWorkers: summary.activeWorkers,
      });
    }

    console.log(`[Worker] Processing job ${jobId}`);
    const started = Date.now();

    // ── Process the job ───────────────────────────────────────────────────────
    const result = await processJob(jobId);

    const elapsed = Date.now() - started;

    if (result.success) {
      return NextResponse.json({
        status: "completed",
        jobId,
        processingTime: elapsed,
        outputResolution: result.metadata?.resolution,
        message: `Job ${jobId} processed successfully in ${(elapsed / 1000).toFixed(1)}s`,
      });
    } else {
      return NextResponse.json(
        {
          status: "failed",
          jobId,
          error: result.error,
          processingTime: elapsed,
          message: `Job ${jobId} failed: ${result.error}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Worker] Unhandled error:", error);
    return NextResponse.json(
      { error: "Worker crashed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/queue/worker
 *
 * Health check — returns queue depth and active worker count.
 * No auth required (non-sensitive info).
 */
export async function GET() {
  try {
    const summary = await getQueueSummary();
    return NextResponse.json({
      health: "ok",
      queue: {
        pendingTotal: summary.pendingTotal,
        pendingPaid: summary.pendingPaid,
        pendingFree: summary.pendingFree,
        activeWorkers: summary.activeWorkers,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { health: "error", detail: String(error) },
      { status: 500 }
    );
  }
}
