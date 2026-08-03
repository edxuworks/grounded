/**
 * useAuth — Authentication Hook
 *
 * Single point of access for auth state across the app.
 * Wraps the Supabase auth client and exposes a clean interface.
 *
 * Usage:
 *   const { user, session, isLoading, signIn, signOut } = useAuth()
 *
 * Design notes:
 *  - SRP: this hook only manages auth state and auth operations
 *  - DIP: components depend on this hook's interface, not on Supabase directly,
 *    so swapping Supabase for another auth provider means changing only this file
 */

import { useState, useEffect, useCallback } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { trpc } from "@/api/trpc";

interface UseAuthReturn {
  /** The Supabase User object, or null if not logged in */
  user: User | null;
  /** The full Supabase Session (includes JWT tokens), or null if not logged in */
  session: Session | null;
  /** True while the initial session is being loaded from storage */
  isLoading: boolean;
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  /** Sign up with email and password */
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  /** Sign out and clear the session */
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // tRPC mutation to sync the user into our public.users table after login.
  const syncUser = trpc.auth.syncUser.useMutation();

  useEffect(() => {
    // Get the current session immediately on mount (reads from localStorage).
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // After login/signup, sync the user profile to our database.
        // The API's auth.syncUser upserts the user — safe to call on every login.
        if (session?.user) {
          syncUser.mutate({
            fullName: session.user.user_metadata?.["full_name"] as string | undefined,
            avatarUrl: session.user.user_metadata?.["avatar_url"] as string | undefined,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount — syncUser.mutate reference is stable

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { user, session, isLoading, signIn, signUp, signOut };
}
