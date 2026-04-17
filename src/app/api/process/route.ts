/**
 * POST /api/process
 *
 * Trigger processing for a single job via Replicate.
 * Free tier: 2x upscale, no face enhance.
 * Paid tier: 4x upscale + face enhance.
 *
 * Body: { jobId: string }
 *
 * Can be called:
 *  - Directly by the client after upload (auto-start)
 *  - By the queue worker (/api/queue/worker)
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { processJob } from "@/lib/job-processor";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json({ error: "Job ID required" }, { status: 400 });
    }

    // Verify job belongs to this user and is in a processable state
    const { data: job, error: jobError } = await supabase
      .from("video_jobs")
      .select("id, status, plan, processor")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const processableStates = ["pending", "queued", "failed", "processing"];
    if (!processableStates.includes(job.status)) {
      return NextResponse.json(
        { error: `Job is already ${job.status}` },
        { status: 400 }
      );
    }

    console.log(
      `[Process API] Starting job ${jobId} | plan=${job.plan} | processor=${job.processor}`
    );

    // Delegate entirely to the plan-aware processor
    // This call is intentionally NOT awaited at the HTTP level if it's long-running.
    // For short/mock runs it resolves inline. For real Replicate jobs (minutes-long),
    // the worker endpoint is preferred.
    const result = await processJob(jobId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Processing failed", jobId },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId,
      plan: job.plan,
      processor: job.processor,
      status: "completed",
      processingTime: result.processingTime,
      outputResolution: result.metadata?.resolution,
    });
  } catch (error) {
    console.error("Process API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
