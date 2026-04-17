"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Upload, Brain, Cpu, Download, ArrowRight,
  Sparkles, CheckCircle2, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    num: "01",
    icon: <Upload className="w-6 h-6" />,
    title: "Upload Your Video",
    description: "Drag and drop any video file — MP4, MOV, WebM, AVI. We accept files up to 500MB. Your video is encrypted in transit and stored securely.",
    details: ["File type validation", "Browser-side metadata extraction", "Secure upload to Supabase Storage"],
    color: "from-violet-600 to-purple-700",
    glow: "shadow-violet-500/30",
  },
  {
    num: "02",
    icon: <Brain className="w-6 h-6" />,
    title: "AI Analyzes Your Content",
    description: "Our system uses FFprobe to extract detailed metadata — resolution, frame rate, codec, duration, and bitrate — to plan the optimal enhancement strategy.",
    details: ["Resolution & codec detection", "Frame rate analysis", "Quality assessment scoring"],
    color: "from-cyan-600 to-blue-700",
    glow: "shadow-cyan-500/30",
  },
  {
    num: "03",
    icon: <Cpu className="w-6 h-6" />,
    title: "Multi-Stage Enhancement",
    description: "The AI pipeline runs multiple enhancement passes simultaneously: neural upscaling, temporal denoising, edge sharpening, and color grading.",
    details: ["Neural super-resolution (ESRGAN)", "Temporal noise reduction", "Unsharp mask sharpening", "Color histogram balancing"],
    color: "from-emerald-600 to-teal-700",
    glow: "shadow-emerald-500/30",
  },
  {
    num: "04",
    icon: <Download className="w-6 h-6" />,
    title: "Download in High Quality",
    description: "Your enhanced video is encoded in H.265 (HEVC) for the best quality-to-size ratio, then made available for instant preview and download.",
    details: ["H.265 encoding (best ratio)", "Side-by-side preview", "Instant browser download", "Permanent storage link"],
    color: "from-orange-600 to-amber-700",
    glow: "shadow-orange-500/30",
  },
];

const techStack = [
  { name: "Next.js 15", desc: "App Router + Server Actions" },
  { name: "Supabase", desc: "Auth, Database & Storage" },
  { name: "FFmpeg", desc: "Video metadata & processing" },
  { name: "AI Enhancement", desc: "Swappable model layer" },
  { name: "Framer Motion", desc: "Smooth UI animations" },
  { name: "H.265/HEVC", desc: "Output encoding" },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="gradient-orb w-96 h-96 bg-violet-900/20 top-1/4 right-0" />
        <div className="gradient-orb w-64 h-64 bg-cyan-900/15 bottom-0 left-0" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Under The Hood
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4">
            How VEnhance Works
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            A transparent look at our AI-powered video enhancement pipeline — from upload to download.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-8 mb-20">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: i % 2 === 0 ? -40 : 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className={`flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} gap-8 items-center`}
            >
              {/* Icon side */}
              <div className="flex-shrink-0 flex flex-col items-center gap-4">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} shadow-2xl ${step.glow} flex items-center justify-center text-white`}>
                  {step.icon}
                </div>
                <span className="text-5xl font-black gradient-text opacity-40">{step.num}</span>
              </div>

              {/* Content */}
              <Card className="flex-1 hover:border-white/20 transition-all duration-300">
                <CardContent className="p-7">
                  <h2 className="text-2xl font-bold text-white mb-3">{step.title}</h2>
                  <p className="text-zinc-400 leading-relaxed mb-5">{step.description}</p>
                  <div className="space-y-2">
                    {step.details.map((detail) => (
                      <div key={detail} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span className="text-zinc-300">{detail}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tech Stack */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-white text-center mb-8">Built With</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {techStack.map((tech) => (
              <div key={tech.name} className="glass rounded-xl p-4 text-center hover:border-white/20 transition-colors">
                <p className="font-semibold text-white mb-0.5">{tech.name}</p>
                <p className="text-xs text-zinc-500">{tech.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-4">Ready to enhance your video?</h2>
          <p className="text-zinc-400 mb-8">Get started for free. No credit card required.</p>
          <Link href="/auth">
            <Button size="xl" className="gap-3">
              <Zap className="w-5 h-5" />
              Start Enhancing
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
