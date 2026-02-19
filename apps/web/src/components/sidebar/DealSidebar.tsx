/**
 * DealSidebar — Deal Detail Panel (Right Side)
 *
 * Displays full details for the active deal. Structured into tabs:
 *  - Overview: status + custom field values (PropertyGrid)
 *  - Annotations: list of spatial drawings with visibility toggles
 *  - Comments: stakeholder comment thread
 *
 * Data fetching:
 * Uses trpc.deal.getById to load the full deal on open. React Query caches
 * this so switching between deals is instant if previously loaded.
 *
 * TODO (Phase 4): implement deal detail rendering
 * TODO (Phase 5): implement PropertyGrid (custom fields)
 * TODO (Phase 6): implement AnnotationPanel
 * TODO (Phase 7): implement CommentStream
 */

import { X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";

export function DealSidebar() {
  const { activeDealId, closeSidebar } = useUIStore();
  const { activeWorkspaceId } = useWorkspace();

  // Fetch full deal details only when sidebar is open and a deal is selected.
  const { data: deal, isLoading, error } = trpc.deal.getById.useQuery(
    { id: activeDealId!, workspaceId: activeWorkspaceId },
    {
      // Only run when we have a valid deal ID.
      enabled: !!activeDealId,
    }
  );

  return (
    <div className="glass-panel h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
        <h2 className="font-semibold text-land-text truncate">
          {isLoading ? "Loading..." : deal?.title ?? "Deal"}
        </h2>
        <button
          onClick={closeSidebar}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-land-muted hover:text-land-text transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto styled-scrollbar p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-land-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">Failed to load deal</p>
            <p className="text-xs text-land-muted mt-1">{error.message}</p>
          </div>
        )}

        {deal && (
          <div className="space-y-4">
            {/* Address */}
            <p className="text-sm text-land-muted">{deal.address}</p>

            {/* Status badge placeholder */}
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-land-surface border border-white/10 text-xs font-medium text-land-text">
              {deal.status}
            </div>

            {/* Property grid (Phase 5), Annotation panel (Phase 6),
                Comment stream (Phase 7) will render here */}
            <p className="text-xs text-land-muted">
              Full deal card coming in Phase 4–7
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
