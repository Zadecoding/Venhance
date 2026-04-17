"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Zap, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    description: "Perfect for trying out VEnhance",
    features: [
      "3 video enhancements/month",
      "Up to 2x upscaling",
      "720p output quality",
      "100MB max file size",
      "Standard processing queue",
      "Basic denoising & sharpening",
    ],
    cta: "Get Started Free",
    href: "/auth",
    gradient: "from-zinc-800 to-zinc-900",
    popular: false,
  },
  {
    name: "Pro",
    price: "₹1,499",
    period: "/month",
    description: "For serious content creators",
    features: [
      "Unlimited enhancements",
      "Up to 4x upscaling",
      "4K output quality",
      "500MB max file size",
      "Priority processing queue",
      "Advanced denoising & sharpening",
      "Color enhancement",
      "Video stabilization",
      "Email support",
    ],
    cta: "Start Pro Trial",
    href: "/auth",
    gradient: "from-violet-900 to-purple-900",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "₹7,999",
    period: "/month",
    description: "For studios and production houses",
    features: [
      "Everything in Pro",
      "Up to 8x upscaling",
      "8K output quality",
      "2GB max file size",
      "Dedicated processing lane",
      "Batch processing API",
      "Custom AI model tuning",
      "SLA guarantee",
      "Dedicated account manager",
      "White-label options",
    ],
    cta: "Contact Sales",
    href: "/auth",
    gradient: "from-cyan-900 to-blue-900",
    popular: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="gradient-orb w-96 h-96 bg-violet-900/20 top-0 left-1/2 -translate-x-1/2" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-5xl font-bold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Choose the plan that fits your creative workflow. Start free, upgrade when you need more.
          </p>
        </motion.div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Most Popular
                  </span>
                </div>
              )}
              <Card className={`h-full ${plan.popular ? "border-violet-500/40 shadow-2xl shadow-violet-900/30" : "border-white/10"}`}>
                <CardContent className="p-7">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-4`}>
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                  <p className="text-sm text-zinc-500 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-zinc-500 text-sm">{plan.period}</span>
                  </div>

                  <Link href={plan.href}>
                    <Button
                      className={`w-full gap-2 mb-6 ${plan.popular ? "" : "variant-outline"}`}
                      variant={plan.popular ? "default" : "outline"}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  <div className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-zinc-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "What video formats are supported?",
                a: "We support MP4, MOV, WebM, AVI, and MKV. Output is always H.265 MP4 for maximum quality and compatibility.",
              },
              {
                q: "How long does enhancement take?",
                a: "Processing time depends on video length and selected upscale factor. Most videos under 5 minutes complete in 2–10 minutes.",
              },
              {
                q: "Can I swap the AI provider later?",
                a: "Yes! Our service layer is abstracted so you can integrate Topaz AI, Runway ML, Replicate, or any custom endpoint without changing the UI.",
              },
              {
                q: "Is my video data secure?",
                a: "All videos are stored with end-to-end encryption in Supabase Storage with private bucket policies. Videos are only accessible to you.",
              },
            ].map((faq) => (
              <div key={faq.q} className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
