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
      // Ensure profile row exists (new Google sign-ups bypass the signup trigger
      // if the trigger fires before the session is available).
      // We upsert idempotently so existing profiles are not overwritten.
      try {
        const serviceClient = createServiceClient();
        await serviceClient
          .from("profiles")
          .upsert(
            {
              id: data.user.id,
              email: data.user.email,
              full_name:
                data.user.user_metadata?.full_name ||
                data.user.user_metadata?.name ||
                null,
              avatar_url: data.user.user_metadata?.avatar_url || null,
              plan: "free",
            },
            { onConflict: "id", ignoreDuplicates: true }
          );
      } catch (profileErr) {
        // Non-fatal — profile trigger should have handled it
        console.warn("[Auth Callback] Profile upsert failed:", profileErr);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
