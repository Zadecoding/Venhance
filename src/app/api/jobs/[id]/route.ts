import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: job, error } = await supabase
      .from("video_jobs")
      .select(`
        *,
        plan,
        priority,
        processor,
        watermark,
        target_resolution,
        queue_position,
        replicate_prediction_id
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Also fetch processing logs
    const { data: logs } = await supabase
      .from("processing_logs")
      .select("*")
      .eq("job_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      job,
      logs: logs || [],
      // Convenience fields for frontend rendering
      tier: {
        plan: job.plan,
        processor: job.processor,
        watermark: job.watermark,
        targetResolution: job.target_resolution,
        queuePosition: job.queue_position,
        isPaid: job.plan === "paid",
      },
    });
  } catch (error) {
    console.error("Job status API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get job to find storage paths
    const { data: job, error: jobError } = await supabase
      .from("video_jobs")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Delete from storage
    if (job.storage_path) {
      const pathsToDelete = [job.storage_path];
      if (job.enhanced_storage_path) pathsToDelete.push(job.enhanced_storage_path);
      await supabase.storage.from("videos").remove(pathsToDelete);
    }

    // Delete processing logs
    await supabase.from("processing_logs").delete().eq("job_id", id);

    // Delete job record
    const { error: deleteError } = await supabase
      .from("video_jobs")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to delete job" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Job deleted" });
  } catch (error) {
    console.error("Delete API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
