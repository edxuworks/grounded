/**
 * Supabase Admin Client
 *
 * Used server-side for:
 *  1. Verifying JWTs by calling supabase.auth.getUser(token)
 *  2. Creating user records in our public.users table after signup
 *     (triggered via Supabase Auth webhook or called directly here)
 *
 * WHY the anon key for JWT verification?
 * Calling createClient with the user's own JWT and then getUser() is the
 * Supabase-recommended way to verify tokens server-side. It doesn't require
 * knowing the JWT secret and works seamlessly with token refresh.
 *
 * WHY the service role key for admin operations?
 * The service role key bypasses Postgres Row Level Security (RLS) and allows
 * writing to auth-adjacent tables. It must NEVER be exposed to the client.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env["SUPABASE_URL"];
const supabaseAnonKey = process.env["SUPABASE_ANON_KEY"];
const supabaseServiceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY"
  );
}

/**
 * Creates a per-request Supabase client scoped to the user's JWT.
 * Calling getUser() on this client verifies the JWT with Supabase.
 *
 * A new client is created per request (not a singleton) because each
 * request carries a different user token.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    // Disable automatic token refresh — this is server-side, we don't persist sessions.
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Singleton Supabase admin client using the service role key.
 * Use only for trusted server-to-server operations (e.g. user provisioning).
 * Never expose this to the client — it bypasses all RLS policies.
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl!, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;
