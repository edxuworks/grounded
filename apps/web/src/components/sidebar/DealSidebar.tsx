/**
 * DealSidebar — Deal Detail Panel (Right Side)
 *
 * Tabbed panel with:
 *  - Overview: address, status badge, custom field values (PropertyGrid)
 *  - Comments: stakeholder comment thread (CommentStream)
 *
 * Phase 6 will add an Annotations tab.
 */

import { useState } from "react";
import { X, MapPin } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";
import { PropertyGrid } from "@/components/sidebar/PropertyGrid";
import { CommentStream } from "@/components/sidebar/CommentStream";
import { AnnotationPanel } from "@/components/sidebar/AnnotationPanel";

const STATUS_COLOURS: Record<string, string> = {
  SOURCING: "bg-slate-500/20 text-slate-300",
  UNDERWRITING: "bg-blue-500/20 text-blue-300",
  LEGALS: "bg-amber-500/20 text-amber-300",
  PLANNING: "bg-violet-500/20 text-violet-300",
  APPROVED: "bg-emerald-500/20 text-emerald-300",
  REJECTED: "bg-red-500/20 text-red-300",
};

type Tab = "overview" | "comments" | "annotations";

export function DealSidebar() {
  const { activeDealId, closeSidebar } = useUIStore();
  const { activeWorkspaceId } = useWorkspace();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: deal, isLoading, error } = trpc.deal.getById.useQuery(
    { id: activeDealId!, workspaceId: activeWorkspaceId },
    { enabled: !!activeDealId }
  );

  // Extract fieldValues early so TypeScript resolves it against a simple type,
  // avoiding "type instantiation is excessively deep" from Prisma.JsonValue.
  const dealFieldValues = (deal as { fieldValues?: unknown } | undefined)?.fieldValues as Record<string, unknown> ?? {};

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

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 shrink-0">
        {(["overview", "comments", "annotations"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              tab === t
                ? "bg-land-accent text-white"
                : "text-land-muted hover:text-land-text hover:bg-white/5"
            }`}
          >
            {t}
          </button>
        ))}
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

        {deal && tab === "overview" && (
          <div className="space-y-4">
            {/* Address */}
            <div className="flex items-start gap-2">
              <MapPin size={13} className="text-land-muted mt-0.5 shrink-0" />
              <p className="text-sm text-land-muted">{deal.address}</p>
            </div>

            {/* Status badge */}
            <div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLOURS[deal.status] ?? "bg-white/5 text-land-text"}`}>
                {deal.status.charAt(0) + deal.status.slice(1).toLowerCase()}
              </span>
            </div>

            {/* Custom fields */}
            <div>
              <p className="text-xs font-medium text-land-muted uppercase tracking-wider mb-2">Fields</p>
              <PropertyGrid
                dealId={deal.id}
                fieldValues={dealFieldValues}
              />
            </div>

            {/* Metadata */}
            <div className="pt-2 border-t border-white/5 space-y-1">
              <div className="flex justify-between text-xs text-land-muted">
                <span>Created by</span>
                <span>{deal.createdBy.fullName ?? deal.createdBy.email}</span>
              </div>
              <div className="flex justify-between text-xs text-land-muted">
                <span>Updated</span>
                <span>{new Date(deal.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-xs text-land-muted">
                <span>File</span>
                <span>{deal.dealFile.name}</span>
              </div>
            </div>
          </div>
        )}

        {deal && tab === "comments" && (
          <CommentStream dealId={deal.id} />
        )}

        {deal && tab === "annotations" && (
          <AnnotationPanel dealId={deal.id} />
        )}
      </div>
    </div>
  );
}
