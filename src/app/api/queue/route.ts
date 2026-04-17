/**
 * GET /api/queue
 *
 * Returns the current queue status.
 * Optional query param: ?jobId=<uuid> → also returns that job's position.
 *
 * Authenticated users can only see their own jobs' positions.
 * Full queue summary is always returned (no private data in queue entries).
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getQueueSummary, getJobQueuePosition } from "@/lib/queue";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    // Get overall queue summary (paid + free counts, full ordered list)
    const summary = await getQueueSummary();

    // If a specific jobId is requested, return its position
    let jobPosition: number | null = null;
    if (jobId) {
      // Verify job belongs to this user before revealing position
      const { data: ownership } = await supabase
        .from("video_jobs")
        .select("id")
        .eq("id", jobId)
        .eq("user_id", user.id)
        .single();

      if (ownership) {
        jobPosition = await getJobQueuePosition(jobId);
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        pendingTotal: summary.pendingTotal,
        pendingPaid: summary.pendingPaid,
        pendingFree: summary.pendingFree,
        activeWorkers: summary.activeWorkers,
      },
      // Full ordered queue (only IDs and priorities — no user data)
      queue: summary.queue.map((entry) => ({
        jobId: entry.jobId,
        plan: entry.plan,
        priority: entry.priority,
        position: entry.position,
      })),
      // Specific job position if requested
      ...(jobId ? { requestedJobPosition: jobPosition } : {}),
    });
  } catch (error) {
    console.error("Queue API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
