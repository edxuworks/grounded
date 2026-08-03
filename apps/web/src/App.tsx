/**
 * App — Root Component
 *
 * The top-level component that wires together:
 *  1. tRPC provider (provides the tRPC hooks and React Query context)
 *  2. AppShell (routes between WorkspaceDashboard and MapShell)
 *
 * Component tree:
 *   <App>                       — providers only
 *     <AppShell>                — view routing (dashboard ↔ map)
 *       <WorkspaceDashboard>    — workspace selection / creation landing page
 *       OR
 *       <WorkspaceProvider>     — provides workspace context to map
 *         <MapShell>            — the actual app (map + panels)
 *
 * No auth required in dev phase — DEV_BYPASS_AUTH=true in apps/api/.env
 * injects a dev user server-side so all tRPC calls work without a JWT.
 */

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient, queryClient } from "@/api/trpc";
import { WorkspaceProvider } from "@/features/workspace/WorkspaceProvider";
import { WorkspaceDashboard } from "@/features/workspace/WorkspaceDashboard";
import { MapShell } from "@/components/MapShell";
import { useUIStore } from "@/store/useUIStore";

const WORKSPACE_KEY = "grounded:activeWorkspaceId";

// Demo mode (set VITE_DEMO_MODE=true at build): skip auth + workspace
// selection entirely and drop straight into the map interface. Used for the
// public deployment so anyone can click "Launch" and land on the map.
const DEMO_MODE = import.meta.env["VITE_DEMO_MODE"] === "true";

export function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AppShell />
      </QueryClientProvider>
    </trpc.Provider>
  );
}

/**
 * AppShell — Routes between the dashboard and the map.
 *
 * On first render, restores the last active workspace from localStorage.
 * If a workspace ID is saved, the map view opens directly (skips dashboard).
 * Otherwise the dashboard is shown so the user can pick or create a workspace.
 */
function AppShell() {
  const { activeWorkspaceId, setActiveWorkspaceId } = useUIStore();

  // Restore the last workspace from localStorage on first render.
  useEffect(() => {
    if (!activeWorkspaceId) {
      const saved = localStorage.getItem(WORKSPACE_KEY);
      if (saved) setActiveWorkspaceId(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo mode: bypass the workspace dashboard and go straight to the map.
  if (!DEMO_MODE && !activeWorkspaceId) {
    return <WorkspaceDashboard />;
  }

  return (
    <WorkspaceProvider>
      <MapShell />
    </WorkspaceProvider>
  );
}
