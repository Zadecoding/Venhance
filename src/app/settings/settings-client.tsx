"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  User, Mail, Shield, Trash2, LogOut, Save, Loader2,
  Bell, Key, Zap, Crown, ArrowRight, BarChart3,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import type { User as UserType } from "@/types";

interface SettingsClientProps {
  user: UserType;
  plan: "free" | "paid";
  videosUsedThisMonth: number | null;
}

const FREE_MONTHLY_LIMIT = 3;

export default function SettingsClient({ user, plan, videosUsedThisMonth }: SettingsClientProps) {
  const [name, setName] = useState(user.full_name || "");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const isPaid = plan === "paid";
  const usedCount = videosUsedThisMonth ?? 0;
  const usagePercent = isPaid ? 100 : Math.min(100, (usedCount / FREE_MONTHLY_LIMIT) * 100);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name },
      });
      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  };

  const sections = [
    {
      icon: <User className="w-5 h-5" />,
      title: "Profile",
      description: "Manage your personal information",
      content: (
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
              {(user.full_name || user.email)[0]?.toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{user.full_name || "No name set"}</p>
              <p className="text-sm text-zinc-400">{user.email}</p>
              {/* Plan tier badge */}
              <div className="mt-1.5">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg">
                    <Crown className="w-3 h-3" />
                    Pro Member
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-zinc-300">
                    <Zap className="w-3 h-3" />
                    Free Tier
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fullname">Full Name</Label>
            <Input
              id="fullname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-display">Email Address</Label>
            <Input id="email-display" value={user.email} disabled className="opacity-50 cursor-not-allowed" />
            <p className="text-xs text-zinc-600">Email cannot be changed from this panel</p>
          </div>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </form>
      ),
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: "Plan & Usage",
      description: "Your current plan and monthly video usage",
      content: (
        <div className="space-y-5">
          {/* Current plan card */}
          <div className={`rounded-xl p-4 border ${isPaid ? "border-violet-500/30 bg-violet-500/10" : "border-white/10 bg-white/5"}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                {isPaid ? (
                  <Crown className="w-4 h-4 text-violet-400" />
                ) : (
                  <Zap className="w-4 h-4 text-zinc-400" />
                )}
                <p className="font-semibold text-white">{isPaid ? "Pro Plan" : "Free Plan"}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPaid ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-zinc-400"}`}>
                {isPaid ? "₹499/mo" : "₹0/mo"}
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              {isPaid ? "Unlimited video enhancements, priority queue, no watermark." : "3 video enhancements per month. Watermark applied."}
            </p>
          </div>

          {/* Usage meter (free only) */}
          {!isPaid && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-300">Videos this month</p>
                <p className="text-sm font-bold text-white">
                  {usedCount} / {FREE_MONTHLY_LIMIT}
                </p>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${usagePercent >= 100 ? "bg-red-500" : usagePercent >= 66 ? "bg-amber-500" : "bg-emerald-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${usagePercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              <p className="text-xs text-zinc-600 mt-1.5">
                {usedCount >= FREE_MONTHLY_LIMIT
                  ? "Limit reached. Resets on the 1st of next month."
                  : `${FREE_MONTHLY_LIMIT - usedCount} enhancement${FREE_MONTHLY_LIMIT - usedCount === 1 ? "" : "s"} remaining this month.`}
              </p>
            </div>
          )}

          {/* Upgrade CTA for free users */}
          {!isPaid && (
            <Link href="/pricing">
              <Button className="w-full gap-2 bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90">
                <Crown className="w-4 h-4" />
                Upgrade to Pro — ₹499/month
                <ArrowRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          )}

          {/* Manage subscription for paid users */}
          {isPaid && (
            <div className="glass rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-1">Manage Subscription</p>
              <p className="text-xs text-zinc-500 mb-3">Contact support to make changes to your subscription.</p>
              <a href="mailto:support@venhance.io">
                <Button variant="outline" size="sm" className="gap-2">
                  <Mail className="w-3.5 h-3.5" />
                  Contact Support
                </Button>
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: "Notifications",
      description: "Control how you receive updates",
      content: (
        <div className="space-y-4">
          {[
            { label: "Enhancement completed", desc: "Get notified when your video is ready" },
            { label: "Processing failed", desc: "Alert when enhancement encounters errors" },
            { label: "Weekly digest", desc: "Summary of your enhancement activity" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-zinc-500">{item.desc}</p>
              </div>
              <div className="w-10 h-5 rounded-full bg-violet-600 relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow" />
              </div>
            </div>
          ))}
          <p className="text-xs text-zinc-600">Full notification preferences coming soon</p>
        </div>
      ),
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Security",
      description: "Manage your password and account security",
      content: (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Key className="w-4 h-4 text-violet-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Password</p>
                <p className="text-xs text-zinc-500 mb-3">Use a strong password of at least 8 characters</p>
                <Button variant="outline" size="sm" className="gap-2">
                  Change Password
                </Button>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-cyan-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Account Email</p>
                <p className="text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      icon: <Trash2 className="w-5 h-5" />,
      title: "Danger Zone",
      description: "Irreversible account actions",
      content: (
        <div className="space-y-4">
          <div className="border border-red-500/20 rounded-xl p-4 bg-red-500/5">
            <p className="text-sm font-medium text-white mb-1">Delete Account</p>
            <p className="text-xs text-zinc-500 mb-3">
              Permanently delete your account and all associated data. This cannot be undone.
            </p>
            <Button variant="destructive" size="sm">
              Delete My Account
            </Button>
          </div>
          <div className="border border-white/10 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-1">Sign Out</p>
            <p className="text-xs text-zinc-500 mb-3">Sign out from all devices</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              className="gap-2"
            >
              {signingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              Sign Out
            </Button>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold text-white">Settings</h1>
            {isPaid ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-violet-600 to-cyan-500 text-white">
                <Crown className="w-3 h-3" /> Pro
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 border border-white/20 text-zinc-400">
                Free
              </span>
            )}
          </div>
          <p className="text-zinc-400">Manage your account preferences and security</p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-zinc-400">{section.icon}</span>
                    {section.title}
                  </CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>{section.content}</CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
