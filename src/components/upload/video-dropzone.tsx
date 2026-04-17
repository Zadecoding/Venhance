"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Film, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, validateVideoFile, getVideoDuration, getVideoResolution } from "@/lib/utils";

interface FileInfo {
  file: File;
  duration: number;
  width: number;
  height: number;
}

interface VideoDropzoneProps {
  onFileSelect: (file: File, info: { duration: number; resolution: string; size: number }) => void;
  disabled?: boolean;
}

export default function VideoDropzone({ onFileSelect, disabled }: VideoDropzoneProps) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    const file = acceptedFiles[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setLoading(true);
    try {
      const [duration, resolution] = await Promise.all([
        getVideoDuration(file),
        getVideoResolution(file),
      ]);
      const info = { file, duration, width: resolution.width, height: resolution.height };
      setFileInfo(info);
      onFileSelect(file, {
        duration,
        resolution: `${resolution.width}x${resolution.height}`,
        size: file.size,
      });
    } catch {
      setError("Could not read video metadata");
    } finally {
      setLoading(false);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".webm", ".avi", ".mkv"] },
    maxFiles: 1,
    disabled: disabled || loading,
  });

  const removeFile = () => {
    setFileInfo(null);
    setError(null);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!fileInfo ? (
          <div
            key="dropzone"
            {...getRootProps()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
              isDragActive && !isDragReject
                ? "border-violet-500 bg-violet-500/10 scale-[1.01]"
                : isDragReject
                ? "border-red-500 bg-red-500/10"
                : "border-white/20 bg-white/5 hover:border-violet-500/50 hover:bg-white/10"
            }`}
          >
            <input {...getInputProps()} />

            {/* Animated background grid */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: "linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
              />
            </div>

            <motion.div
              animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                isDragActive ? "bg-violet-500/30" : "bg-white/10"
              }`}>
                <Upload className={`w-8 h-8 transition-colors ${isDragActive ? "text-violet-400" : "text-zinc-400"}`} />
              </div>

              <div>
                <p className="text-lg font-semibold text-white mb-1">
                  {isDragActive ? "Drop your video here" : "Drag & drop your video"}
                </p>
                <p className="text-sm text-zinc-400">
                  or <span className="text-violet-400 underline cursor-pointer">browse to choose</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {["MP4", "MOV", "WebM", "AVI", "MKV"].map((fmt) => (
                  <span key={fmt} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-zinc-400 border border-white/10">
                    {fmt}
                  </span>
                ))}
              </div>
              <p className="text-xs text-zinc-500">Maximum file size: 500MB</p>
            </motion.div>
          </div>

        ) : (
          <motion.div
            key="fileinfo"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border border-emerald-500/30 bg-emerald-500/5 rounded-2xl p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Film className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <p className="font-semibold text-white">{fileInfo.file.name}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-zinc-400">
                    <span>{formatBytes(fileInfo.file.size)}</span>
                    <span>•</span>
                    <span>{fileInfo.width}×{fileInfo.height}</span>
                    <span>•</span>
                    <span>{Math.round(fileInfo.duration)}s duration</span>
                    <span>•</span>
                    <span>{fileInfo.file.type || "video"}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                className="flex-shrink-0 text-zinc-500 hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
