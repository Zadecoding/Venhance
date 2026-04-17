"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, ArrowRight, Settings2, Loader2,
  ArrowUpRight, Wind, Eye, Palette, Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import VideoDropzone from "@/components/upload/video-dropzone";
import ProcessingPipeline, { getDefaultProcessingSteps } from "@/components/jobs/processing-pipeline";
import type { ProcessingStep } from "@/types";
import { toast } from "sonner";



export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [fileInfo, setFileInfo] = useState<{ duration: number; resolution: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps] = useState<ProcessingStep[]>(getDefaultProcessingSteps());
  const [upscale, setUpscale] = useState("2x");
  const [targetFps, setTargetFps] = useState<string>("source"); // "source" | "24" | "30" | "60"
  const [toggles, setToggles] = useState({ denoise: true, sharpen: true, color: true });
  const [progress, setProgress] = useState(0);

  const updateStep = (id: string, status: ProcessingStep["status"]) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    );
  };

  const handleFileSelect = (selectedFile: File, info: typeof fileInfo) => {
    setFile(selectedFile);
    setFileInfo(info);
    setSteps(getDefaultProcessingSteps());
    setProgress(0);
  };

  const handleEnhance = async () => {
    if (!file || !fileInfo) {
      toast.error("Please select a video first");
      return;
    }

    setUploading(true);
    setProcessing(true);
    updateStep("upload", "active");
    setProgress(5);

    try {
      // Step 1: Upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("resolution", fileInfo.resolution);
      formData.append("duration", String(fileInfo.duration));
      formData.append("fileSize", String(fileInfo.size));
      if (targetFps !== "source") {
        formData.append("targetFps", targetFps);
      }

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.error || "Upload failed");
      }

      const { jobId } = await uploadRes.json();
      toast.success("Video uploaded successfully!");
      updateStep("upload", "completed");
      updateStep("analyze", "active");
      setProgress(25);
      setUploading(false);

      // Step 2: Process
      const processRes = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          options: {
            upscaleResolution: upscale as "2x" | "4x" | "8x",
            denoise: toggles.denoise,
            sharpen: toggles.sharpen,
            colorEnhance: toggles.color,
          },
        }),
      });

      // Simulate pipeline steps
      setTimeout(() => { updateStep("analyze", "completed"); updateStep("enhance", "active"); setProgress(50); }, 2000);
      setTimeout(() => { updateStep("enhance", "completed"); updateStep("render", "active"); setProgress(75); }, 7000);

      if (!processRes.ok) {
        const err = await processRes.json();
        throw new Error(err.error || "Processing failed");
      }

      updateStep("render", "completed");
      updateStep("ready", "completed");
      setProgress(100);

      toast.success("Enhancement complete! Redirecting to results...");
      setTimeout(() => router.push(`/jobs/${jobId}`), 1500);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Something went wrong";
      toast.error(msg);
      setSteps(getDefaultProcessingSteps());
      setProgress(0);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const isActive = uploading || processing;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="gradient-orb w-80 h-80 bg-violet-900/20 top-1/4 left-0" />
        <div className="gradient-orb w-64 h-64 bg-cyan-900/15 bottom-1/4 right-0" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium mb-4">
            <Zap className="w-3.5 h-3.5" />
            AI Enhancement Studio
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
            Upload Your Video
          </h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Drop your video below and configure your enhancement settings.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Drop + Process */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-400">1</div>
                    Select Video
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VideoDropzone onFileSelect={handleFileSelect} disabled={isActive} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Processing Pipeline */}
            <AnimatePresence>
              {isActive && (
                <motion.div
                  initial={{ opacity: 0, y: 20, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: 20, height: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                        Enhancement in Progress
                      </CardTitle>
                      <CardDescription>Processing your video through our AI pipeline</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ProcessingPipeline steps={steps} currentProgress={progress} />
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Settings + CTA */}
          <div className="space-y-6">
            {/* Enhancement Settings */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">2</div>
                    <Settings2 className="w-4 h-4 text-zinc-400" />
                    Enhancement Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Upscale selector */}
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Upscale Resolution
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {["2x", "4x", "8x"].map((val) => (
                        <button
                          key={val}
                          disabled={isActive}
                          onClick={() => setUpscale(val)}
                          className={`py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            upscale === val
                              ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md"
                              : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frame rate selector */}
                  <div>
                    <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Timer className="w-3.5 h-3.5" />
                      Output Frame Rate
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: "Source", value: "source" },
                        { label: "24fps", value: "24" },
                        { label: "30fps", value: "30" },
                        { label: "60fps", value: "60" },
                      ].map(({ label, value }) => (
                        <button
                          key={value}
                          disabled={isActive}
                          onClick={() => setTargetFps(value)}
                          className={`py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                            targetFps === value
                              ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md"
                              : "bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Toggle options */}
                  {[
                    { key: "denoise", icon: <Wind className="w-3.5 h-3.5" />, label: "Denoising" },
                    { key: "sharpen", icon: <Eye className="w-3.5 h-3.5" />, label: "Sharpening" },
                    { key: "color", icon: <Palette className="w-3.5 h-3.5" />, label: "Color Enhance" },
                  ].map(({ key, icon, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <span className="text-zinc-500">{icon}</span>
                        {label}
                      </div>
                      <button
                        disabled={isActive}
                        onClick={() => setToggles((p) => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                        className={`relative w-10 h-5.5 rounded-full transition-all duration-200 ${
                          toggles[key as keyof typeof toggles] ? "bg-violet-600" : "bg-white/10"
                        } disabled:opacity-50`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          toggles[key as keyof typeof toggles] ? "left-[22px]" : "left-0.5"
                        }`} />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* File Info */}
            {fileInfo && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-white/10">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-3">File Info</p>
                    <div className="space-y-2">
                      {[
                        { label: "Resolution", value: fileInfo.resolution || "Unknown" },
                        { label: "Duration", value: `${Math.round(fileInfo.duration)}s` },
                        { label: "Size", value: fileInfo.size > 0 ? `${(fileInfo.size / 1024 / 1024).toFixed(1)} MB` : "—" },
                        { label: "Output", value: fileInfo.resolution ? `${parseInt(fileInfo.resolution.split("x")[0]) * parseInt(upscale)}×${parseInt(fileInfo.resolution.split("x")[1]) * parseInt(upscale)}` : "—" },
                      ].map((info) => (
                        <div key={info.label} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">{info.label}</span>
                          <span className={`font-medium ${info.label === "Output" ? "gradient-text" : "text-white"}`}>{info.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Enhance CTA */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Button
                onClick={handleEnhance}
                disabled={!file || isActive}
                size="lg"
                className="w-full gap-2 text-base"
              >
                {isActive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {uploading ? "Uploading..." : "Enhancing..."}
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Enhance Video
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              <p className="text-xs text-zinc-600 text-center mt-2">
                Processing takes 2–10 minutes depending on video length
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
