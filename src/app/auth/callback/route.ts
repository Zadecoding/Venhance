import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";

  // OAuth provider returned an error (e.g. user denied permission)
  if (errorParam) {
    const msg = errorDescription || errorParam;
    console.error("[Auth Callback] OAuth error:", msg);
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(msg)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      let isNewUser = false;

      try {
        const serviceClient = createServiceClient();

        // Check if profile already exists (returning user)
        const { data: existingProfile } = await serviceClient
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();

        isNewUser = !existingProfile;

        // Create profile for new users
        if (isNewUser) {
          await serviceClient.from("profiles").insert({
            id: data.user.id,
            email: data.user.email,
            full_name:
              data.user.user_metadata?.full_name ||
              data.user.user_metadata?.name ||
              null,
            avatar_url: data.user.user_metadata?.avatar_url || null,
            plan: "free",
          });
        }
      } catch (profileErr) {
        // Non-fatal — profile trigger should have handled it
        console.warn("[Auth Callback] Profile upsert failed:", profileErr);
      }

      // New users → pricing page to choose a plan
      // Returning users → dashboard (or ?next= param)
      const redirectTo = isNewUser ? `${origin}/pricing?new=1` : `${origin}${next}`;
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}

