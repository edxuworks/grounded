/**
 * tRPC Client Setup
 *
 * This file wires together:
 *  1. The tRPC React client (typed with AppRouter from apps/api)
 *  2. React Query's QueryClient for caching and background refetching
 *  3. The HTTP batch link that sends requests to the API server
 *  4. The Supabase JWT — attached to every request's Authorization header
 *
 * HOW the type safety works:
 *  - `AppRouter` is imported as a TYPE from `@grounded/api`
 *  - No runtime code from apps/api runs in the browser
 *  - TypeScript infers procedure input/output types from the AppRouter definition
 *  - The frontend gets compile-time errors if it passes wrong data to the API
 *
 * HOW auth tokens are attached:
 *  - Before each request, we call supabase.auth.getSession() to get the JWT
 *  - If the session has an access token, it's added as Authorization: Bearer <token>
 *  - The API's createContext() verifies this token with Supabase on every request
 *
 * React Query configuration:
 *  - staleTime: 60s — don't refetch data that was fetched less than 60s ago
 *  - retry: 1 — retry failed requests once before surfacing the error
 *  - These defaults can be overridden per-query with useQuery options
 */

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient } from "@tanstack/react-query";
import type { AppRouter } from "@grounded/api";
import { supabase } from "@/lib/supabase";

// The tRPC React hooks object. Usage:
//   const { data } = trpc.deal.list.useQuery({ workspaceId })
//   const mutation = trpc.deal.create.useMutation()
export const trpc = createTRPCReact<AppRouter>();

// Shared React Query client. Wrap your app in <QueryClientProvider client={queryClient}>
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is "fresh" for 60s — prevents unnecessary refetches for stable data.
      staleTime: 60_000,
      // Retry failed requests once before surfacing the error to the UI.
      // Setting to 1 (not the default 3) gives faster feedback on real errors.
      retry: 1,
      // Don't refetch when the window regains focus in development — it gets
      // noisy and masks actual user-triggered refetches.
      refetchOnWindowFocus: import.meta.env.PROD,
    },
    mutations: {
      // Don't retry failed mutations by default — mutations are not idempotent.
      retry: 0,
    },
  },
});

// Determine the API base URL.
// In development: Vite proxies /api to localhost:3001 (see vite.config.ts).
// In production: VITE_API_URL points to the deployed API.
const apiBaseUrl =
  import.meta.env["VITE_API_URL"] !== undefined
    ? `${import.meta.env["VITE_API_URL"]}/api/trpc`
    : "/api/trpc"; // Fallback to relative URL (Vite proxy in dev)

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: apiBaseUrl,
      // Attach the Supabase JWT to every request's Authorization header.
      // Wrapped in try/catch: in dev (DEV_BYPASS_AUTH=true) there is no
      // Supabase session, so getSession() may throw. We fall back to no
      // auth header and let the backend DEV_BYPASS_AUTH handle it.
      async headers() {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.access_token) return {};

          return { Authorization: `Bearer ${session.access_token}` };
        } catch {
          return {};
        }
      },
    }),
  ],
});
