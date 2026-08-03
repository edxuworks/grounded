/**
 * DealFileManager — Deal File (Folder) CRUD UI
 *
 * Renders the list of deal files (coloured folders) for the active workspace,
 * with inline create form and per-file delete (OWNER/ADMIN only).
 *
 * Data flow:
 *  - dealFile.list query → renders the file list
 *  - dealFile.create mutation → creates a file then invalidates the list
 *  - dealFile.delete mutation → deletes a file then invalidates the list
 *
 * Clicking a deal file filters the deal markers on the map (Phase 4 follow-up).
 */

import { useState } from "react";
import { Plus, Trash2, FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { trpc, queryClient } from "@/api/trpc";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { useUIStore } from "@/store/useUIStore";

/** Colour swatches for deal files — matches Tailwind's land-* colour config. */
const COLOUR_OPTIONS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

export function DealFileManager() {
  const { activeWorkspaceId, userRole } = useWorkspace();
  const { setFlyToTarget } = useUIStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileColor, setNewFileColor] = useState(COLOUR_OPTIONS[0]!);
  // Track which deal file is expanded (showing its deal list)
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  // ── Queries & Mutations ──────────────────────────────────────────────────

  const { data: dealFiles, isLoading } = trpc.dealFile.list.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!activeWorkspaceId }
  );

  const createMutation = trpc.dealFile.create.useMutation({
    onSuccess: () => {
      // Invalidate the list so the new file appears immediately.
      queryClient.invalidateQueries({ queryKey: [["dealFile", "list"]] });
      setNewFileName("");
      setNewFileColor(COLOUR_OPTIONS[0]!);
      setShowCreateForm(false);
    },
  });

  const deleteMutation = trpc.dealFile.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["dealFile", "list"]] });
    },
  });

  // ── Derived permissions ──────────────────────────────────────────────────

  // Only OWNER or ADMIN can delete deal files.
  const canDelete = userRole === "OWNER" || userRole === "ADMIN";

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = () => {
    if (!newFileName.trim()) return;
    createMutation.mutate({
      workspaceId: activeWorkspaceId,
      name: newFileName.trim(),
      color: newFileColor,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this deal file? All deals inside will be permanently deleted.")) return;
    deleteMutation.mutate({ id, workspaceId: activeWorkspaceId });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Deal file list */}
      {dealFiles && dealFiles.length > 0 ? (
        <ul className="space-y-1">
          {dealFiles.map((file) => (
            <li key={file.id}>
              <div className="group flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
                {/* Expand / collapse toggle */}
                <button
                  onClick={() =>
                    setExpandedFileId(expandedFileId === file.id ? null : file.id)
                  }
                  className="text-land-muted hover:text-land-text transition-colors flex-shrink-0"
                  title="Toggle deal list"
                >
                  {expandedFileId === file.id ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>

                {/* Colour dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: file.color }}
                />

                {/* Name + deal count */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-land-text truncate block">
                    {file.name}
                  </span>
                  <span className="text-xs text-land-muted">
                    {file._count.deals} deal{file._count.deals !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Delete button — OWNER/ADMIN only, shown on hover */}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-land-muted hover:text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete deal file"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {/* Expanded deal list within file */}
              {expandedFileId === file.id && (
                <DealListInFile
                  workspaceId={activeWorkspaceId}
                  dealFileId={file.id}
                  fileColor={file.color}
                  onDealClick={(deal) =>
                    setFlyToTarget({
                      longitude: deal.longitude,
                      latitude: deal.latitude,
                      zoom: 15,
                    })
                  }
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-8 text-land-muted text-sm">
          <FolderOpen size={32} className="mx-auto mb-2 opacity-40" />
          <p>No deal files yet.</p>
          <p className="text-xs mt-1">Create a folder to start organising deals.</p>
        </div>
      )}

      {/* Create form (inline toggle) */}
      {showCreateForm ? (
        <div className="mt-3 p-3 bg-land-surface rounded-lg border border-white/10 space-y-3">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Folder name"
            autoFocus
            className="w-full px-3 py-2 bg-land-bg border border-white/10 rounded-lg text-sm text-land-text placeholder-land-muted focus:outline-none focus:ring-2 focus:ring-land-accent/50"
          />

          {/* Colour picker */}
          <div className="flex gap-1.5 flex-wrap">
            {COLOUR_OPTIONS.map((colour) => (
              <button
                key={colour}
                onClick={() => setNewFileColor(colour)}
                className={`w-5 h-5 rounded-full transition-transform ${
                  newFileColor === colour ? "scale-125 ring-2 ring-white/50" : "hover:scale-110"
                }`}
                style={{ backgroundColor: colour }}
                title={colour}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newFileName.trim() || createMutation.isPending}
              className="flex-1 py-1.5 bg-land-accent hover:bg-land-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewFileName("");
              }}
              className="px-3 py-1.5 text-sm text-land-muted hover:text-land-text hover:bg-white/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>

          {createMutation.isError && (
            <p className="text-xs text-red-400">{createMutation.error.message}</p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-land-muted hover:text-land-text hover:bg-white/5 rounded-lg transition-colors"
        >
          <Plus size={14} />
          New deal file
        </button>
      )}
    </div>
  );
}

// ── Nested: deals within a file ──────────────────────────────────────────────

interface DealListInFileProps {
  workspaceId: string;
  dealFileId: string;
  fileColor: string;
  onDealClick: (deal: { longitude: number; latitude: number }) => void;
}

/**
 * Sub-list that fetches and renders deals for a specific deal file.
 * Mounted lazily (only when the file row is expanded) so we don't
 * over-fetch all deals on page load.
 */
function DealListInFile({ workspaceId, dealFileId, fileColor, onDealClick }: DealListInFileProps) {
  const openSidebar = useUIStore((s) => s.openSidebar);

  const { data: deals, isLoading } = trpc.deal.list.useQuery(
    { workspaceId, dealFileId },
    { enabled: !!workspaceId && !!dealFileId }
  );

  if (isLoading) {
    return <div className="ml-7 h-8 bg-white/5 rounded animate-pulse mt-1" />;
  }

  if (!deals || deals.length === 0) {
    return (
      <p className="ml-7 text-xs text-land-muted py-1.5">No deals yet in this folder.</p>
    );
  }

  return (
    <ul className="ml-7 mt-1 space-y-0.5">
      {deals.map((deal) => (
        <li key={deal.id}>
          <button
            onClick={() => {
              onDealClick(deal);
              openSidebar(deal.id);
            }}
            className="w-full flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors text-left"
          >
            {/* Status dot using file colour */}
            <span
              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: fileColor }}
            />
            <div className="min-w-0">
              <span className="text-xs font-medium text-land-text truncate block">
                {deal.title}
              </span>
              <span className="text-xs text-land-muted truncate block">{deal.address}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
