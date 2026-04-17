/**
 * POST /api/upload
 *
 * Upload a video file, create a job record, and enqueue it.
 * The job's plan, priority, processor, and watermark are set here
 * based on the authenticated user's profile.plan value.
 */
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { enqueueJob } from "@/lib/queue";
import type { UserPlan } from "@/types";

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

    // ── Fetch user plan from profiles table ───────────────────────────────────
    // We use a single source of truth: profiles.plan ('free' | 'paid').
    // If the profile doesn't exist yet (race condition at signup), default to free.
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, monthly_job_limit, jobs_used_this_month")
      .eq("id", user.id)
      .single();

    const userPlan: UserPlan = (profile?.plan as UserPlan) || "free";

    // ── Plan-aware rate limiting ───────────────────────────────────────────────
    const isPaid = userPlan === "paid";

    // ── Monthly limit for free users (3 videos/month) ─────────────────────────
    if (!isPaid) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count: monthlyCount } = await supabase
        .from("video_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart);

      const FREE_MONTHLY_LIMIT = 3;
      if ((monthlyCount || 0) >= FREE_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Monthly limit reached. Free users can enhance ${FREE_MONTHLY_LIMIT} videos per month. Upgrade to Pro for unlimited enhancements.`,
            limitReached: true,
            plan: "free",
            used: monthlyCount,
            limit: FREE_MONTHLY_LIMIT,
          },
          { status: 429 }
        );
      }
    }

    // ── Hourly rate limit (anti-abuse) ────────────────────────────────────────
    // Free: max 10 uploads/hour | Paid: max 100 uploads/hour
    const windowMs = 3_600_000; // 1 hour
    const rateLimit = isPaid ? 100 : 10;
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    const { count: recentCount } = await supabase
      .from("video_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", windowStart);

    if ((recentCount || 0) >= rateLimit) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. ${isPaid ? "Max 100" : "Max 10"} uploads per hour.`,
          plan: userPlan,
        },
        { status: 429 }
      );
    }


    // ── Parse form data ───────────────────────────────────────────────────────
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const resolution = formData.get("resolution") as string;
    const duration = formData.get("duration") as string;
    const fileSize = formData.get("fileSize") as string;
    const targetFpsRaw = formData.get("targetFps") as string | null;
    const targetFps = targetFpsRaw ? parseInt(targetFpsRaw) : null; // e.g. 24, 30, 60

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Accepted: MP4, MOV, WebM, AVI, MKV" },
        { status: 400 }
      );
    }

    // File size limits: free 200MB, paid 2GB
    const maxMb = isPaid ? 2048 : 200;
    if (file.size > maxMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `File too large. ${isPaid ? "Max 2GB (paid)" : "Max 200MB (free). Upgrade to paid for larger files."}` },
        { status: 400 }
      );
    }

    // ── Ensure Storage Bucket Exists ──────────────────────────────────────────
    // Creates the 'videos' bucket automatically on first use.
    await ensureVideosBucket();

    // Service client is used for all storage operations to bypass RLS.
    // Auth is already verified above; we enforce limits in code.
    const serviceStorage = createServiceClient().storage;

    // ── Upload to Supabase Storage ────────────────────────────────────────────
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "mp4";
    const storagePath = `${user.id}/${timestamp}/original.${ext}`;

    const { error: uploadError } = await serviceStorage
      .from("videos")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload video to storage" },
        { status: 500 }
      );
    }

    // Generate a long-lived signed URL (7 days) for the private bucket.
    // The processor and the user's video player use this URL.
    const { data: signedData, error: signedError } = await serviceStorage
      .from("videos")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days

    const videoUrl = signedData?.signedUrl || null;

    if (signedError || !videoUrl) {
      console.error("Signed URL error:", signedError);
      // Clean up uploaded file
      await serviceStorage.from("videos").remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to generate video URL" },
        { status: 500 }
      );
    }


    // ── Create job record ─────────────────────────────────────────────────────
    // We insert with plan already set so downstream queries are plan-aware.
    // enqueueJob() will patch the queue-specific columns immediately after.
    const { data: job, error: dbError } = await supabase
      .from("video_jobs")
      .insert({
        user_id: user.id,
        original_video_url: videoUrl,
        status: "pending",   // starts in queue
        plan: userPlan,      // snapshot the plan at time of upload
        priority: userPlan === "paid" ? 10 : 1,
        processor: userPlan === "paid" ? (process.env.PAID_PROCESSOR || "replicate") : "ffmpeg",
        watermark: userPlan === "free",
        target_resolution: userPlan === "paid" ? "1080p" : "720p",
        target_fps: targetFps,            // user-chosen output frame rate (null = keep source)
        input_resolution: resolution || null,
        input_size: parseInt(fileSize) || file.size,
        input_duration: parseFloat(duration) || null,
        original_filename: file.name,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) {
      // Clean up uploaded file on DB failure
      await serviceStorage.from("videos").remove([storagePath]);
      console.error("Database insert error:", dbError);
      return NextResponse.json(
        { error: "Failed to create enhancement job" },
        { status: 500 }
      );
    }

    // ── Enqueue job (sets queue fields, refreshes positions) ──────────────────
    try {
      await enqueueJob(job.id, userPlan);
    } catch (queueErr) {
      // Non-fatal — job is still in the DB; worker will pick it up
      console.warn(`[Upload] Failed to call enqueueJob for ${job.id}:`, queueErr);
    }

    // ── Initial processing log ────────────────────────────────────────────────
    await supabase.from("processing_logs").insert({
      job_id: job.id,
      step: "upload",
      status: "completed",
      message: `Video uploaded | plan=${userPlan} | processor=${job.processor} | size=${file.size} bytes`,
    });

    // ── Return response ───────────────────────────────────────────────────────
    const queuePosition = userPlan === "paid" ? "High priority — processed first" : "Standard queue";

    return NextResponse.json({
      success: true,
      jobId: job.id,
      job,
      plan: userPlan,
      processor: job.processor,
      watermark: job.watermark,
      targetResolution: job.target_resolution,
      queueInfo: queuePosition,
      message: `Video uploaded and queued for ${isPaid ? "AI" : "standard"} enhancement`,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Bucket Bootstrap ────────────────────────────────────────────────────────

/**
 * Ensures the 'videos' private bucket exists.
 * Uses the service role client so it can create buckets even before
 * any user RLS policies are in place.
 * Safe to call on every upload — no-ops if bucket already exists.
 */
async function ensureVideosBucket(): Promise<void> {
  const service = createServiceClient();

  // Check if bucket already exists
  const { data: buckets, error: listError } = await service.storage.listBuckets();

  if (listError) {
    console.warn("[Storage] Could not list buckets:", listError.message);
    return; // Non-fatal — let the upload try and fail naturally
  }

  const exists = (buckets || []).some((b) => b.name === "videos");
  if (exists) return;

  // Create the bucket as private (users get signed URLs, not public direct access).
  // Note: fileSizeLimit is intentionally omitted here — Supabase's bucket API
  // rejects values exceeding the project-level cap. Enforce size limits in code instead.
  const { error: createError } = await service.storage.createBucket("videos", {
    public: false,
    allowedMimeTypes: [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/avi",
    ],
  });

  if (createError && !createError.message.includes("already exists")) {
    console.error("[Storage] Failed to create videos bucket:", createError.message);
    throw new Error(`Storage setup failed: ${createError.message}`);
  }

  console.log("[Storage] ✓ Created 'videos' bucket");
}
