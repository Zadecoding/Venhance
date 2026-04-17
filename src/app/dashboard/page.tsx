import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Upload, Zap, Clock, CheckCircle2, XCircle, TrendingUp,
  Film, ArrowRight, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  formatBytes, formatRelativeTime, getStatusColor, getStatusLabel,
  formatProcessingTime
} from "@/lib/utils";
import type { VideoJob, DashboardStats } from "@/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

async function getDashboardData(userId: string) {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("video_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const stats: DashboardStats = {
    totalJobs: jobs?.length || 0,
    completedJobs: jobs?.filter((j) => j.status === "completed").length || 0,
    processingJobs: jobs?.filter((j) =>
      ["uploading", "analyzing", "enhancing", "rendering", "queued"].includes(j.status)
    ).length || 0,
    failedJobs: jobs?.filter((j) => j.status === "failed").length || 0,
    totalStorageUsed: jobs?.reduce((acc, j) => acc + (j.input_size || 0), 0) || 0,
  };

  return { jobs: (jobs || []) as VideoJob[], stats };
}

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "default" | "success" | "warning" | "destructive" | "cyan" | "secondary"> = {
    completed: "success",
    enhancing: "default",
    analyzing: "default",
    rendering: "default",
    uploading: "cyan",
    queued: "warning",
    failed: "destructive",
  };
  return (
    <Badge variant={variantMap[status] || "secondary"}>
      {getStatusLabel(status)}
    </Badge>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  const { jobs, stats } = await getDashboardData(user.id);

  const statCards = [
    { label: "Total Jobs", value: stats.totalJobs, icon: <Film className="w-5 h-5" />, color: "text-violet-400" },
    { label: "Completed", value: stats.completedJobs, icon: <CheckCircle2 className="w-5 h-5" />, color: "text-emerald-400" },
    { label: "Processing", value: stats.processingJobs, icon: <Clock className="w-5 h-5" />, color: "text-amber-400" },
    { label: "Storage Used", value: formatBytes(stats.totalStorageUsed), icon: <TrendingUp className="w-5 h-5" />, color: "text-cyan-400" },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-zinc-400 text-sm">
              Welcome back, {user.user_metadata?.full_name || user.email?.split("@")[0]}
            </p>
          </div>
          <Link href="/upload">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Enhancement
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className={`${stat.color} mb-3`}>{stat.icon}</div>
                <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                <div className="text-xs text-zinc-500">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Jobs Table */}
        <Card>
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Jobs</h2>
            <Link href="/upload">
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="w-3.5 h-3.5" />
                Upload Video
              </Button>
            </Link>
          </div>
          <CardContent className="p-0">
            {jobs.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <Film className="w-10 h-10 text-zinc-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No videos yet</h3>
                <p className="text-sm text-zinc-500 max-w-sm mb-6">
                  Upload your first video to get started with AI enhancement.
                </p>
                <Link href="/upload">
                  <Button className="gap-2">
                    <Zap className="w-4 h-4" />
                    Enhance Your First Video
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Video</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Status</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Resolution</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3 hidden md:table-cell">Size</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3 hidden lg:table-cell">Time</th>
                      <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Created</th>
                      <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-6 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {jobs.map((job) => (
                      <tr key={job.id} className="hover:bg-white/3 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                              <Film className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white truncate max-w-[180px]">
                                {job.original_filename || `Job ${job.id.slice(0, 8)}`}
                              </p>
                              <p className="text-xs text-zinc-500">ID: {job.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <div className="text-xs text-zinc-400">
                            {job.input_resolution || "—"}
                            {job.output_resolution && (
                              <>
                                <span className="text-violet-400 mx-1">→</span>
                                <span className="text-white">{job.output_resolution}</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <span className="text-xs text-zinc-400">
                            {job.input_size ? formatBytes(job.input_size) : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden lg:table-cell">
                          <span className="text-xs text-zinc-400">
                            {job.processing_time ? formatProcessingTime(job.processing_time) : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-zinc-500">{formatRelativeTime(job.created_at)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/jobs/${job.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1.5 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                              View <ArrowRight className="w-3 h-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
