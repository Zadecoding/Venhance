"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight, Zap, Clock, Star, ChevronRight,
  Sparkles, ArrowUpRight, Play, Wand2, Layers, Palette,
  Wind, Eye, Cpu, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: <ArrowUpRight className="w-5 h-5" />,
    title: "AI Upscaling",
    description: "Neural network-powered resolution enhancement up to 8x. Transform 480p footage into ultra-sharp 4K.",
    gradient: "from-violet-600 to-purple-800",
    glow: "shadow-violet-500/30",
  },
  {
    icon: <Wind className="w-5 h-5" />,
    title: "Temporal Denoising",
    description: "Intelligently removes grain, compression artifacts, and noise while preserving fine detail.",
    gradient: "from-cyan-600 to-blue-800",
    glow: "shadow-cyan-500/30",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Edge Sharpening",
    description: "Advanced unsharp masking and detail enhancement for crisp, professional-looking edges.",
    gradient: "from-emerald-600 to-teal-800",
    glow: "shadow-emerald-500/30",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Frame Enhancement",
    description: "Per-frame AI processing ensures every single frame is optimized for maximum quality.",
    gradient: "from-orange-600 to-amber-800",
    glow: "shadow-orange-500/30",
  },
  {
    icon: <Palette className="w-5 h-5" />,
    title: "Color Grading",
    description: "Intelligent color enhancement that brings vibrancy and natural depth to your footage.",
    gradient: "from-pink-600 to-rose-800",
    glow: "shadow-pink-500/30",
  },
  {
    icon: <Cpu className="w-5 h-5" />,
    title: "GPU Accelerated",
    description: "Cloud GPU processing delivers results in minutes, not hours. Enterprise-grade infrastructure.",
    gradient: "from-indigo-600 to-violet-800",
    glow: "shadow-indigo-500/30",
  },
];

const stats = [
  { value: "8x", label: "Max Resolution Boost" },
  { value: "60fps", label: "Frame Rate Output" },
  { value: "H.265", label: "Output Codec" },
  { value: "<5min", label: "Processing Time" },
];

const testimonials = [
  {
    text: "VEnhance transformed my old 480p wedding video into stunning 4K. The AI detail recovery is incredible.",
    author: "Sarah M.",
    role: "Videographer",
  },
  {
    text: "We use it for restoring archival footage for our documentary projects. The results speak for themselves.",
    author: "David K.",
    role: "Documentary Director",
  },
  {
    text: "The before/after comparison blew my mind. Game-changer for content creators.",
    author: "Alex R.",
    role: "YouTube Creator",
  },
];

const steps = [
  { num: "01", title: "Upload Your Video", desc: "Drag & drop any video format up to 500MB" },
  { num: "02", title: "AI Analyzes Content", desc: "Our models analyze every frame for optimal enhancement" },
  { num: "03", title: "Enhancement Pipeline", desc: "Upscaling, denoising, sharpening applied simultaneously" },
  { num: "04", title: "Download in HD", desc: "Your enhanced video is ready in minutes" },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
};


export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* ====== HERO ====== */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16">
        {/* Animated orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="gradient-orb w-[600px] h-[600px] bg-violet-800/25 -top-20 -left-20"
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="gradient-orb w-[500px] h-[500px] bg-cyan-800/20 -bottom-20 -right-20"
          />
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(rgba(139,92,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.8) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Video Enhancement
              <span className="bg-violet-500/20 text-violet-300 text-xs px-2 py-0.5 rounded-full">New</span>
            </motion.div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight mb-6">
              <span className="text-white">Elevate Your</span>
              <br />
              <span className="gradient-text">Video Quality</span>
              <br />
              <span className="text-white">With AI</span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Transform low-resolution, noisy footage into stunning professional-quality video.
              Upscale to 4K, reduce noise, sharpen details — in minutes.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/auth">
                <Button size="xl" className="gap-3 text-base font-semibold px-8">
                  <Zap className="w-5 h-5" />
                  Start Enhancing Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="outline" size="xl" className="gap-3 text-base">
                  <Play className="w-5 h-5" />
                  See How It Works
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="glass rounded-xl p-4 text-center"
                >
                  <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-xs text-zinc-500 mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Hero Preview Card */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-20 max-w-4xl mx-auto"
          >
            <div className="glass rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-900/20">
              {/* Browser bar mockup */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/3">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <div className="flex-1 h-6 rounded-md bg-white/5 mx-4 flex items-center justify-center">
                  <span className="text-xs text-zinc-600">venhance.ai/dashboard</span>
                </div>
              </div>
              {/* Before/After Preview */}
              <div className="grid grid-cols-2 gap-0 aspect-[16/7]">
                <div className="relative bg-zinc-900 flex items-center justify-center border-r border-white/10">
                  <div className="absolute inset-0 flex items-center justify-center opacity-20"
                    style={{ backgroundImage: "repeating-linear-gradient(45deg, #333 0, #333 1px, transparent 0, transparent 50%)", backgroundSize: "12px 12px" }}
                  />
                  <div className="text-center z-10">
                    <div className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">Before</div>
                    <div className="text-zinc-600 text-4xl font-bold opacity-30">480p</div>
                  </div>
                  <div className="absolute top-3 left-3 text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-white/10">Original</div>
                </div>
                <div className="relative bg-zinc-950 flex items-center justify-center overflow-hidden">
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-cyan-900/15" />
                  <div className="text-center z-10">
                    <div className="text-xs font-medium text-violet-400 mb-2 uppercase tracking-wider">After</div>
                    <div className="gradient-text text-4xl font-bold">4K</div>
                  </div>
                  <div className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-violet-900/50 text-violet-400 border border-violet-500/30">
                    Enhanced ✨
                  </div>
                  {/* Particles */}
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 rounded-full bg-violet-400/60"
                      animate={{
                        y: [0, -30, 0],
                        opacity: [0, 1, 0],
                        x: [0, (i % 2 === 0 ? 1 : -1) * 10, 0],
                      }}
                      transition={{
                        duration: 2,
                        delay: i * 0.3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      style={{
                        left: `${15 + i * 12}%`,
                        bottom: `${20 + (i % 3) * 15}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== FEATURES ====== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 text-violet-400 text-sm font-medium mb-4 px-4 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/10">
              <Wand2 className="w-3.5 h-3.5" />
              Powered by Advanced AI
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Everything your video needs
            </motion.h2>
            <motion.p variants={itemVariants} className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Our multi-stage AI pipeline applies the right enhancement at every level of your footage.
            </motion.p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="h-full group hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} shadow-lg ${feature.glow} flex items-center justify-center mb-4 text-white group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ====== HOW IT WORKS ====== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="gradient-orb w-96 h-96 bg-violet-900/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 text-cyan-400 text-sm font-medium mb-4 px-4 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10">
              <Clock className="w-3.5 h-3.5" />
              Ready in minutes
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">Simple 4-step process</h2>
            <p className="text-zinc-400 text-lg">From upload to download in under 5 minutes.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative group"
              >
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[calc(100%-0px)] w-full h-px bg-gradient-to-r from-white/20 to-transparent z-0" />
                )}
                <div className="glass rounded-2xl p-6 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 relative z-10">
                  <div className="text-4xl font-black gradient-text opacity-60 mb-4">{step.num}</div>
                  <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== TESTIMONIALS ====== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Loved by creators worldwide</h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <Card className="h-full hover:border-white/20 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-0.5 mb-4">
                      {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                    <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
                        {t.author[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{t.author}</p>
                        <p className="text-xs text-zinc-500">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CTA BANNER ====== */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-purple-900/40 to-cyan-900/50" />
            <div className="absolute inset-0 border border-white/10 rounded-3xl" />
            <div className="relative p-12 md:p-16 text-center">
              <div className="text-5xl mb-6">⚡</div>
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Ready to enhance your video?
              </h2>
              <p className="text-zinc-300 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of creators already using VEnhance to make their content look professional.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth">
                  <Button size="xl" className="gap-2 text-base">
                    <Zap className="w-5 h-5" />
                    Start Free Today
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button variant="outline" size="xl" className="text-base">
                    View Pricing
                  </Button>
                </Link>
              </div>
              <div className="flex items-center justify-center gap-6 mt-8 text-sm text-zinc-400">
                {["No credit card required", "Free tier available", "Cancel anytime"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
