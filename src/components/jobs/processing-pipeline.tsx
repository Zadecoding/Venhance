"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Clock, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ProcessingStep } from "@/types";

interface ProcessingPipelineProps {
  steps: ProcessingStep[];
  currentProgress?: number;
  className?: string;
}

const stepIcons = {
  pending: <Clock className="w-4 h-4 text-zinc-500" />,
  active: <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />,
  completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  failed: <XCircle className="w-4 h-4 text-red-400" />,
};

const stepColors = {
  pending: "border-white/10 bg-white/5",
  active: "border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/20",
  completed: "border-emerald-500/30 bg-emerald-500/10",
  failed: "border-red-500/30 bg-red-500/10",
};

export default function ProcessingPipeline({
  steps,
  currentProgress,
  className = "",
}: ProcessingPipelineProps) {
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const totalProgress = currentProgress ?? Math.round((completedCount / steps.length) * 100);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Overall Progress</span>
          <span className="text-white font-semibold">{totalProgress}%</span>
        </div>
        <Progress value={totalProgress} className="h-2" />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-500 ${stepColors[step.status]}`}
          >
            {/* Step Number / Icon */}
            <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center">
              {step.status === "pending" ? (
                <span className="text-xs font-bold text-zinc-500">{index + 1}</span>
              ) : (
                stepIcons[step.status]
              )}
            </div>

            {/* Step Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                step.status === "completed" ? "text-emerald-400" :
                step.status === "active" ? "text-white" :
                step.status === "failed" ? "text-red-400" :
                "text-zinc-500"
              }`}>
                {step.label}
              </p>
              {step.description && step.status === "active" && (
                <p className="text-xs text-zinc-400 mt-0.5">{step.description}</p>
              )}
            </div>

            {/* Active indicator */}
            {step.status === "active" && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0"
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Default processing steps for the enhancement pipeline
export function getDefaultProcessingSteps(): ProcessingStep[] {
  return [
    {
      id: "upload",
      label: "Uploading Video",
      description: "Securely uploading your video to our servers",
      status: "pending",
    },
    {
      id: "analyze",
      label: "Analyzing Content",
      description: "Extracting metadata and analyzing video quality",
      status: "pending",
    },
    {
      id: "enhance",
      label: "AI Enhancement",
      description: "Applying neural upscaling, denoising, and sharpening",
      status: "pending",
    },
    {
      id: "render",
      label: "Rendering Output",
      description: "Encoding enhanced video in H.265 format",
      status: "pending",
    },
    {
      id: "ready",
      label: "Ready for Download",
      description: "Your enhanced video is ready",
      status: "pending",
    },
  ];
}
