/**
 * Supabase Browser Client
 *
 * The browser-side Supabase client used for authentication only.
 * It uses the ANON key (safe to expose in browser) and handles:
 *  - Login/signup (email+password for MVP; OAuth providers later)
 *  - Session management (JWT storage, refresh)
 *  - Exposing the current JWT to the tRPC client for API calls
 *
 * NOT used for database queries — all data comes via tRPC → API → Prisma.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. " +
      "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env"
  );
}

// In dev bypass mode, disable all Supabase background operations (session storage,
// auto-refresh, URL detection). This prevents the sb_publishable_ key format from
// triggering internal URL-pattern errors when no real auth session exists.
const isDev = import.meta.env["VITE_DEV_BYPASS_AUTH"] === "true";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: !isDev,
    autoRefreshToken: !isDev,
    detectSessionInUrl: !isDev,
  },
});
