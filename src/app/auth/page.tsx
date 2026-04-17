"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageSkeleton />}>
      <AuthInner />
    </Suspense>
  );
}

function AuthInner() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [urlError, setUrlError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Read ?error= param set by the callback route on OAuth failure
  useEffect(() => {
    const err = searchParams.get("error");
    if (err) {
      const friendly = friendlyOAuthError(err);
      setUrlError(friendly);
      toast.error(friendly);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setUrlError(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.name },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email to verify your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setUrlError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            // Request refresh token so sessions persist longer
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        toast.error(error.message);
        setGoogleLoading(false);
      }
      // On success, Supabase redirects the browser — no need to setGoogleLoading(false)
    } catch {
      toast.error("Failed to connect to Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="gradient-orb w-96 h-96 bg-violet-900/30 top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2" />
        <div className="gradient-orb w-80 h-80 bg-cyan-900/20 bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">VEnhance</span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-zinc-400 text-sm">
            {mode === "login"
              ? "Sign in to access your enhancement jobs"
              : "Start enhancing your videos for free"}
          </p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-violet-900/20">

          {/* URL Error Banner (OAuth errors from callback redirect) */}
          <AnimatePresence>
            {urlError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{urlError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google OAuth — placed FIRST for conversion (above email form) */}
          <Button
            variant="outline"
            className="w-full gap-3 mb-5 relative"
            size="lg"
            onClick={handleGoogleAuth}
            type="button"
            disabled={googleLoading || loading}
            id="google-signin-button"
          >
            {googleLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting to Google…
              </>
            ) : (
              <>
                {/* Google G logo SVG */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-transparent text-zinc-500">or use email</span>
            </div>
          </div>

          {/* Tab Toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-6">
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setMode(tab); setUrlError(null); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  mode === tab
                    ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      value={form.name}
                      onChange={handleChange}
                      className="pl-10"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className="pl-10 pr-10"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div className="flex justify-end">
                <button type="button" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full gap-2" size="lg" disabled={loading || googleLoading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="text-xs text-zinc-600 text-center mt-4">
              By creating an account, you agree to our{" "}
              <Link href="#" className="text-violet-400 hover:underline">Terms of Service</Link>
              {" "}and{" "}
              <Link href="#" className="text-violet-400 hover:underline">Privacy Policy</Link>
            </p>
          )}
        </div>

        {/* Help text */}
        <p className="text-center text-xs text-zinc-600 mt-4">
          Having trouble?{" "}
          <a href="mailto:support@venhance.io" className="text-violet-400 hover:underline">
            Contact support
          </a>
        </p>
      </motion.div>
    </div>
  );
}

// ─── Skeleton shown while Suspense resolves ───────────────────────────────────

function AuthPageSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-20 pb-10">
      <div className="w-full max-w-md">
        <div className="glass-strong rounded-2xl p-8 shadow-2xl shadow-violet-900/20 animate-pulse">
          <div className="h-8 bg-white/10 rounded-lg mb-6" />
          <div className="h-12 bg-white/10 rounded-lg mb-4" />
          <div className="h-12 bg-white/10 rounded-lg mb-4" />
          <div className="h-12 bg-white/10 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function friendlyOAuthError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("access_denied") || lower.includes("user_cancelled") || lower.includes("cancel")) {
    return "Google sign-in was cancelled. Please try again.";
  }
  if (lower.includes("callback")) {
    return "Sign-in failed after Google redirect. Please try again.";
  }
  if (lower.includes("email")) {
    return "Could not retrieve your email from Google. Make sure your Google account has a verified email.";
  }
  return `Sign-in error: ${raw}. Please try again.`;
}
