/**
 * App — Root Component
 *
 * The top-level component that wires together:
 *  1. tRPC provider (provides the tRPC hooks and React Query context)
 *  2. AuthGuard (redirects to login if no session)
 *  3. WorkspaceProvider (ensures an active workspace is selected)
 *  4. The main map application shell
 *
 * Component tree:
 *   <App>                     — providers only
 *     <AuthGuard>             — shows LoginPage if not authenticated
 *       <WorkspaceProvider>   — shows workspace picker on first login
 *         <MapShell>          — the actual app (map + panels)
 *
 * WHY not use a router (React Router)?
 * The Grounded MVP is a single-screen application — the map IS the app.
 * There are no separate pages to navigate between. A router adds complexity
 * and bundle size for no benefit at this stage. We can add one in v2+
 * if we need a settings page, public deal sharing URLs, etc.
 */

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { trpc, trpcClient, queryClient } from "@/api/trpc";
import { AuthGuard } from "@/features/auth/AuthGuard";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceProvider";
import { MapShell } from "@/components/MapShell";

export function App() {
  return (
    // tRPC provider must wrap everything that uses tRPC hooks.
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      {/* React Query provider must be inside tRPC provider */}
      <QueryClientProvider client={queryClient}>
        {/* Auth gate — shows LoginPage if not authenticated */}
        <AuthGuard>
          {/* Workspace gate — shows workspace picker on first login */}
          <WorkspaceProvider>
            {/* The main app shell: map + floating panels */}
            <MapShell />
          </WorkspaceProvider>
        </AuthGuard>

        {/* React Query DevTools — only rendered in development builds */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools initialIsOpen={false} position="bottom" />
        )}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
