/**
 * Supabase Service Role Client
 *
 * Used ONLY on the server for:
 *  - Queue worker (needs to read/write ALL jobs, not just the current user's)
 *  - Webhook handlers
 *  - Background processing tasks
 *
 * NEVER expose this client to the browser — it bypasses RLS.
 */
import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
