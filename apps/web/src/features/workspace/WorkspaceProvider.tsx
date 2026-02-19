/**
 * WorkspaceProvider
 *
 * Makes the active workspace available throughout the app via React context.
 * On first login (no saved workspace), shows a workspace selection/creation screen.
 *
 * Persistence:
 * The active workspace ID is stored in localStorage so the user returns to their
 * last workspace on refresh. This is intentional UX — not a security concern because
 * all API calls are still authenticated and workspace-scoped server-side.
 *
 * Flow:
 *  1. Load user's workspaces from API
 *  2. If they have a saved activeWorkspaceId in localStorage, use it
 *  3. If not (or if the saved workspace no longer exists), show the workspace picker
 *  4. Once a workspace is selected, store in localStorage + render children
 */

import { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "@/api/trpc";
import { useUIStore } from "@/store/useUIStore";

const WORKSPACE_STORAGE_KEY = "grounded:activeWorkspaceId";

interface WorkspaceContextValue {
  activeWorkspaceId: string;
  workspaceName: string;
  userRole: string;
  switchWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const setActiveWorkspaceId = useUIStore((s) => s.setActiveWorkspaceId);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    localStorage.getItem(WORKSPACE_STORAGE_KEY)
  );

  // Fetch all workspaces the user belongs to.
  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery(undefined, {
    // Keep workspace list fresh — retry if it fails (network hiccup on login)
    retry: 2,
  });

  // Derive the active workspace from the list.
  const activeWorkspace = workspaces?.find((w) => w.id === selectedId);

  // If the user has no saved workspace or the saved one no longer exists,
  // default to the first workspace in their list.
  useEffect(() => {
    if (!workspaces || workspaces.length === 0) return;
    if (!activeWorkspace && workspaces[0]) {
      handleSwitch(workspaces[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaces, activeWorkspace]);

  const handleSwitch = (id: string) => {
    setSelectedId(id);
    setActiveWorkspaceId(id);
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-land-bg">
        <div className="w-6 h-6 border-2 border-land-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No workspaces yet — show workspace creation prompt.
  if (!workspaces || workspaces.length === 0) {
    return <CreateWorkspacePrompt onCreated={handleSwitch} />;
  }

  // Workspace is selected and found.
  if (activeWorkspace) {
    return (
      <WorkspaceContext.Provider
        value={{
          activeWorkspaceId: activeWorkspace.id,
          workspaceName: activeWorkspace.name,
          userRole: activeWorkspace.myRole,
          switchWorkspace: handleSwitch,
        }}
      >
        {children}
      </WorkspaceContext.Provider>
    );
  }

  // Loading state while workspace list resolves.
  return (
    <div className="flex items-center justify-center w-full h-screen bg-land-bg">
      <div className="w-6 h-6 border-2 border-land-accent border-t-transparent rounded-full animate-spin" />
    </div>
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

// ── Create Workspace Prompt ──────────────────────────────────────────────────

interface CreateWorkspacePromptProps {
  onCreated: (id: string) => void;
}

function CreateWorkspacePrompt({ onCreated }: CreateWorkspacePromptProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: (workspace) => {
      onCreated(workspace.id);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Auto-generate slug from name: lowercase, replace spaces with hyphens,
  // remove non-alphanumeric characters.
  const handleNameChange = (value: string) => {
    setName(value);
    setError(null);
    setSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/^-+|-+$/g, "")
    );
  };

  return (
    <div className="flex items-center justify-center w-full h-screen bg-land-bg">
      <div className="w-full max-w-md p-8 glass-panel rounded-xl">
        <h2 className="text-xl font-semibold text-land-text mb-2">
          Create your workspace
        </h2>
        <p className="text-land-muted text-sm mb-6">
          A workspace groups your deal files, deals, and team members.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-land-text mb-1.5">
              Workspace name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Capital"
              className="w-full px-3 py-2.5 bg-land-surface border border-white/10 rounded-lg text-land-text placeholder-land-muted focus:outline-none focus:ring-2 focus:ring-land-accent/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-land-text mb-1.5">
              URL slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="acme-capital"
              className="w-full px-3 py-2.5 bg-land-surface border border-white/10 rounded-lg text-land-text placeholder-land-muted focus:outline-none focus:ring-2 focus:ring-land-accent/50"
            />
            <p className="mt-1 text-xs text-land-muted">
              app.grounded.io/{slug || "your-workspace"}
            </p>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            disabled={!name || !slug || createMutation.isPending}
            onClick={() => createMutation.mutate({ name, slug })}
            className="w-full py-2.5 bg-land-accent hover:bg-land-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "Creating..." : "Create workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
