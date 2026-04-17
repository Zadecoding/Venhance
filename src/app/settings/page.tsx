import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./settings-client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  return <SettingsClient user={{ id: user.id, email: user.email || "", full_name: user.user_metadata?.full_name, avatar_url: user.user_metadata?.avatar_url, created_at: user.created_at }} />;
}
