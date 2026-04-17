import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | VEnhance",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Fetch plan from profiles table
  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("plan, videos_used_this_month")
    .eq("id", user.id)
    .single();

  return (
    <SettingsClient
      user={{
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: user.created_at,
      }}
      plan={(profile?.plan as "free" | "paid") || "free"}
      videosUsedThisMonth={profile?.videos_used_this_month ?? null}
    />
  );
}

