import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Download, RefreshCw, Trash2,
  CheckCircle2, Clock, Film, Zap, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatBytes, formatRelativeTime, formatProcessingTime, getStatusLabel
} from "@/lib/utils";
import type { VideoJob, ProcessingLog } from "@/types";
import type { Metadata } from "next";
import JobActions from "./job-actions";

export const metadata: Metadata = {
  title: "Job Details",
};

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { data: job, error } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !job) notFound();

  const { data: logs } = await supabase
    .from("processing_logs")
    .select("*")
    .eq("job_id", id)
    .order("created_at", { ascending: true });

  const typedJob = job as VideoJob;
  const typedLogs = (logs || []) as ProcessingLog[];

  const statusVariant: Record<string, string> = {
    completed: "success",
    failed: "destructive",
    queued: "warning",
    pending: "warning",
    processing: "default",
    enhancing: "default",
    analyzing: "default",
    rendering: "default",
    uploading: "cyan",
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-white">
                  {typedJob.original_filename || `Job ${id.slice(0, 8)}`}
                </h1>
                <Badge variant={(statusVariant[typedJob.status] || "secondary") as "success" | "destructive" | "warning" | "default" | "cyan" | "outline" | "secondary"}>
                  {getStatusLabel(typedJob.status)}
                </Badge>
              </div>
              <p className="text-sm text-zinc-500">
                Created {formatRelativeTime(typedJob.created_at)}
              </p>
            </div>
          </div>
          <JobActions job={typedJob} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Preview */}
          <div className="lg:col-span-2 space-y-6">
            {typedJob.status === "completed" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Original */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-zinc-400">Original Video</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {typedJob.original_video_url ? (
                      <video
                        src={typedJob.original_video_url}
                        controls
                        className="w-full aspect-video rounded-lg bg-black object-contain"
                      />
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-zinc-900 flex items-center justify-center">
                        <Film className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                    <div className="mt-3 text-xs text-zinc-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Resolution</span>
                        <span className="text-zinc-300">{typedJob.input_resolution || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Size</span>
                        <span className="text-zinc-300">{typedJob.input_size ? formatBytes(typedJob.input_size) : "—"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced */}
                <Card className="border-violet-500/20 bg-violet-500/5">
                  <CardHeader>
                    <CardTitle className="text-sm text-violet-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Enhanced Video
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {typedJob.enhanced_video_url ? (
                      <video
                        src={typedJob.enhanced_video_url}
                        controls
                        className="w-full aspect-video rounded-lg bg-black object-contain"
                      />
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-zinc-900 flex items-center justify-center">
                        <Film className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}
                    <div className="mt-3 text-xs text-zinc-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Resolution</span>
                        <span className="text-violet-300">{typedJob.output_resolution || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Size</span>
                        <span className="text-violet-300">{typedJob.output_size ? formatBytes(typedJob.output_size) : "—"}</span>
                      </div>
                    </div>
                    {typedJob.enhanced_video_url && (
                      <a href={typedJob.enhanced_video_url} download="enhanced-video.mp4" className="block mt-3">
                        <Button className="w-full gap-2" size="sm">
                          <Download className="w-3.5 h-3.5" />
                          Download Enhanced
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              /* Non-completed state */
              <Card>
                <CardContent className="py-16 text-center">
                  {typedJob.status === "failed" ? (
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                        <Film className="w-8 h-8 text-red-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Enhancement Failed</h3>
                      <p className="text-sm text-zinc-500 mb-4 max-w-sm mx-auto">
                        {typedJob.error_message || "An error occurred during processing"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-violet-400 animate-pulse" />
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-2">Processing...</h3>
                      <p className="text-sm text-zinc-500 max-w-sm mx-auto">
                        Your video is being enhanced. This usually takes 2–10 minutes.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Processing Logs */}
            {typedLogs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400" />
                    Processing Logs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {typedLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 text-xs">
                        <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                          log.status === "completed" ? "text-emerald-400" :
                          log.status === "failed" ? "text-red-400" : "text-amber-400"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-zinc-300 font-medium capitalize">{log.step}</span>
                          {log.message && <span className="text-zinc-500 ml-2">{log.message}</span>}
                        </div>
                        <span className="text-zinc-600 flex-shrink-0">{formatRelativeTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Stats */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Job Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    label: "Processing Time",
                    value: typedJob.processing_time ? formatProcessingTime(typedJob.processing_time) : "—"
                  },
                  {
                    label: "Input Resolution",
                    value: typedJob.input_resolution || "—"
                  },
                  {
                    label: "Output Resolution",
                    value: typedJob.output_resolution || "—",
                    highlight: true
                  },
                  {
                    label: "Input Size",
                    value: typedJob.input_size ? formatBytes(typedJob.input_size) : "—"
                  },
                  {
                    label: "Output Size",
                    value: typedJob.output_size ? formatBytes(typedJob.output_size) : "—",
                    highlight: true
                  },
                  {
                    label: "Duration",
                    value: typedJob.input_duration ? `${Math.round(typedJob.input_duration)}s` : "—"
                  },
                  {
                    label: "Job ID",
                    value: id.slice(0, 12) + "..."
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">{item.label}</span>
                    <span className={`font-medium ${item.highlight ? "gradient-text" : "text-zinc-300"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Quick nav */}
            <div className="flex flex-col gap-2">
              <Link href="/upload">
                <Button variant="outline" className="w-full gap-2" size="sm">
                  <Zap className="w-3.5 h-3.5" />
                  Enhance Another Video
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" className="w-full gap-2" size="sm">
                  View All Jobs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
