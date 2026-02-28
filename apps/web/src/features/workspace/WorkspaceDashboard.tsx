/**
 * WorkspaceDashboard — Personal landing page
 *
 * The first screen the user sees. Shows their workspaces and lets them
 * create new ones. Clicking a workspace enters the map view.
 *
 * No authentication UI here — auth is bypassed in dev via DEV_BYPASS_AUTH.
 */

import { useState } from "react";
import { trpc } from "@/api/trpc";
import { useUIStore } from "@/store/useUIStore";

const WORKSPACE_KEY = "grounded:activeWorkspaceId";

export function WorkspaceDashboard() {
  const setActiveWorkspaceId = useUIStore((s) => s.setActiveWorkspaceId);
  const [showCreate, setShowCreate] = useState(false);

  const { data: workspaces, isLoading } = trpc.workspace.list.useQuery();

  const enterWorkspace = (id: string) => {
    localStorage.setItem(WORKSPACE_KEY, id);
    setActiveWorkspaceId(id);
  };

  return (
    <div className="min-h-screen bg-land-bg flex flex-col">
      {/* Header */}
      <header className="px-8 py-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-land-accent flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 2L14 6V14H2V6L8 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="text-land-text font-semibold text-lg tracking-tight">
            Grounded
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-12">
        <h1 className="text-2xl font-semibold text-land-text mb-1">
          Your Workspaces
        </h1>
        <p className="text-land-muted text-sm mb-8">
          Select a workspace to open the map, or create a new one.
        </p>

        {isLoading ? (
          <div className="flex items-center gap-3 text-land-muted text-sm">
            <div className="w-4 h-4 border-2 border-land-accent border-t-transparent rounded-full animate-spin" />
            Loading workspaces…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Existing workspace cards */}
            {workspaces?.map((ws) => (
              <button
                key={ws.id}
                onClick={() => enterWorkspace(ws.id)}
                className="text-left glass-panel rounded-xl p-5 border border-white/10 hover:border-land-accent/60 transition-all duration-150 cursor-pointer group"
              >
                <p className="text-land-text font-medium text-base mb-1 group-hover:text-white transition-colors">
                  {ws.name}
                </p>
                <p className="text-land-muted text-xs">
                  {ws._count.deals} deal{ws._count.deals !== 1 ? "s" : ""}{" "}
                  &middot; {ws._count.members} member
                  {ws._count.members !== 1 ? "s" : ""}
                </p>
                <p className="mt-3 text-xs text-land-accent opacity-0 group-hover:opacity-100 transition-opacity">
                  Open workspace →
                </p>
              </button>
            ))}

            {/* Create new workspace card / form */}
            {showCreate ? (
              <CreateWorkspaceForm
                onCreated={enterWorkspace}
                onCancel={() => setShowCreate(false)}
              />
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="text-left glass-panel rounded-xl p-5 border border-dashed border-white/20 hover:border-land-accent/50 transition-all duration-150 cursor-pointer group flex flex-col items-start gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-land-accent/10 group-hover:bg-land-accent/20 flex items-center justify-center transition-colors">
                  <span className="text-land-accent text-xl leading-none">+</span>
                </div>
                <p className="text-land-muted group-hover:text-land-text text-sm font-medium transition-colors">
                  New workspace
                </p>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ── Inline create workspace form ─────────────────────────────────────────────

interface CreateWorkspaceFormProps {
  onCreated: (id: string) => void;
  onCancel: () => void;
}

function CreateWorkspaceForm({ onCreated, onCancel }: CreateWorkspaceFormProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: (workspace) => {
      utils.workspace.list.invalidate();
      onCreated(workspace.id);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

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
    <div className="glass-panel rounded-xl p-5 border border-land-accent/40 col-span-full sm:col-span-1">
      <p className="text-land-text font-medium text-sm mb-4">New workspace</p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-land-muted mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Acme Capital"
            autoFocus
            className="w-full px-3 py-2 bg-land-surface border border-white/10 rounded-lg text-sm text-land-text placeholder-land-muted focus:outline-none focus:ring-1 focus:ring-land-accent/50"
          />
        </div>
        <div>
          <label className="block text-xs text-land-muted mb-1">Slug</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-capital"
            className="w-full px-3 py-2 bg-land-surface border border-white/10 rounded-lg text-sm text-land-text placeholder-land-muted focus:outline-none focus:ring-1 focus:ring-land-accent/50"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            disabled={!name || !slug || createMutation.isPending}
            onClick={() => createMutation.mutate({ name, slug })}
            className="flex-1 py-2 bg-land-accent hover:bg-land-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 text-land-muted hover:text-land-text text-sm rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
