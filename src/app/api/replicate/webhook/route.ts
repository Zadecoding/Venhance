/**
 * POST /api/replicate/webhook
 *
 * Receives async callbacks from Replicate when a prediction completes.
 * This is optional but useful for very long jobs (avoids HTTP timeouts).
 *
 * To enable:
 *  1. Set NEXT_PUBLIC_APP_URL to your public URL in .env.local
 *  2. Make sure your deployment is publicly reachable
 *  3. The webhook URL is automatically set by startReplicatePrediction()
 *
 * Replicate sends a POST with the full prediction object when status changes.
 */
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ReplicatePrediction } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const prediction: ReplicatePrediction = await request.json();

    if (!prediction?.id) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    console.log(`[Webhook] Replicate prediction ${prediction.id} → ${prediction.status}`);

    const supabase = createServiceClient();

    // Find job by replicate_prediction_id
    const { data: job, error: findError } = await supabase
      .from("video_jobs")
      .select("id, status")
      .eq("replicate_prediction_id", prediction.id)
      .single();

    if (findError || !job) {
      // Prediction might not be stored yet (race) — log and ignore
      console.warn(`[Webhook] No job found for prediction ${prediction.id}`);
      return NextResponse.json({ received: true });
    }

    if (prediction.status === "succeeded") {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

      await supabase
        .from("video_jobs")
        .update({
          status: "completed",
          enhanced_video_url: output,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await supabase.from("processing_logs").insert({
        job_id: job.id,
        step: "replicate_webhook",
        status: "completed",
        message: `Replicate prediction ${prediction.id} succeeded`,
        metadata: { output },
      });

      console.log(`[Webhook] ✓ Job ${job.id} marked complete via webhook`);
    } else if (prediction.status === "failed" || prediction.status === "canceled") {
      await supabase
        .from("video_jobs")
        .update({
          status: "failed",
          error_message: prediction.error || `Prediction ${prediction.status}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      await supabase.from("processing_logs").insert({
        job_id: job.id,
        step: "replicate_webhook",
        status: "failed",
        message: `Replicate prediction ${prediction.id} ${prediction.status}: ${prediction.error || ""}`,
      });

      console.log(`[Webhook] ✗ Job ${job.id} failed via webhook`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Error:", error);
    // Return 200 to prevent Replicate from retrying on our bugs
    return NextResponse.json({ received: true, error: String(error) });
  }
}
