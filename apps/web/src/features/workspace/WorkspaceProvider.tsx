/**
 * WorkspaceProvider
 *
 * Provides the active workspace to all MapShell children via React context.
 * The workspace to load is determined by `activeWorkspaceId` in UIStore,
 * which is set by WorkspaceDashboard when the user selects a workspace.
 *
 * This component's only job:
 *  1. Look up the selected workspace from the cached list query
 *  2. Show a spinner while the list is loading
 *  3. If the workspace is no longer found (deleted externally), clear the
 *     selection — AppShell will transition back to the dashboard automatically
 *  4. Provide WorkspaceContext to children (MapShell)
 */

import { createContext, useContext, useEffect } from "react";
import { trpc } from "@/api/trpc";
import { useUIStore } from "@/store/useUIStore";

interface WorkspaceContextValue {
  activeWorkspaceId: string;
  workspaceName: string;
  userRole: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

// Demo mode: provide a stub workspace with no backend dependency so the map
// interface loads instantly without login, workspace creation, or a database.
const DEMO_MODE = import.meta.env["VITE_DEMO_MODE"] === "true";

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { activeWorkspaceId, setActiveWorkspaceId } = useUIStore();

  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery(undefined, {
    retry: 2,
    // Skip the API entirely in demo mode — no DB is required to load the map.
    enabled: !DEMO_MODE,
  });

  // Derive the active workspace from the cached list.
  const activeWorkspace = workspaces?.find((w) => w.id === activeWorkspaceId);

  // If workspaces loaded but the selected one is gone (e.g. deleted externally),
  // clear the selection — AppShell will fall back to the dashboard.
  useEffect(() => {
    if (!DEMO_MODE && !isLoading && workspaces && activeWorkspaceId && !activeWorkspace) {
      localStorage.removeItem("grounded:activeWorkspaceId");
      setActiveWorkspaceId(null);
    }
  }, [isLoading, workspaces, activeWorkspace, activeWorkspaceId, setActiveWorkspaceId]);

  // Demo mode: hand children a stub workspace and skip the loading gate.
  if (DEMO_MODE) {
    return (
      <WorkspaceContext.Provider
        value={{ activeWorkspaceId: "demo", workspaceName: "Demo Workspace", userRole: "owner" }}
      >
        {children}
      </WorkspaceContext.Provider>
    );
  }

  if (isLoading || !activeWorkspace) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-land-bg">
        <div className="w-6 h-6 border-2 border-land-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspaceId: activeWorkspace.id,
        workspaceName: activeWorkspace.name,
        userRole: activeWorkspace.myRole,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/** Hook to access the active workspace context. Must be used inside WorkspaceProvider. */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
