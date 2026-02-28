/**
 * AnnotationPanel — Deal Annotation Management
 *
 * Three states:
 *  1. Default: list existing annotations + "Draw" button to start a polygon
 *  2. Drawing: in-progress indicator with Finish / Cancel controls
 *  3. Saving: name + category form shown after drawing is complete
 *
 * Integrates with useDrawingStore for drawing lifecycle and
 * trpc.annotation.* for persistence.
 */

import { useState } from "react";
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";
import { trpc, queryClient } from "@/api/trpc";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { useDrawingStore } from "@/store/useDrawingStore";

const CATEGORY_OPTIONS = [
  { value: "ACCESS", label: "Access" },
  { value: "GREEN_SPACE", label: "Green Space" },
  { value: "COMPETITOR", label: "Competitor" },
  { value: "DEMAND_GENERATOR", label: "Demand Generator" },
  { value: "HAZARD", label: "Hazard" },
  { value: "RISK_ZONE", label: "Risk Zone" },
  { value: "NEW_PROJECT", label: "New Project" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  ACCESS: "bg-blue-500/20 text-blue-300",
  GREEN_SPACE: "bg-green-500/20 text-green-300",
  COMPETITOR: "bg-red-500/20 text-red-300",
  DEMAND_GENERATOR: "bg-amber-500/20 text-amber-300",
  HAZARD: "bg-orange-500/20 text-orange-300",
  RISK_ZONE: "bg-red-700/20 text-red-400",
  NEW_PROJECT: "bg-violet-500/20 text-violet-300",
};

interface AnnotationPanelProps {
  dealId: string;
}

export function AnnotationPanel({ dealId }: AnnotationPanelProps) {
  const { activeWorkspaceId, userRole } = useWorkspace();
  const { isDrawing, currentPoints, startDrawing, finishDrawing, cancelDrawing, completedPolygon, clearCompleted } =
    useDrawingStore();

  // Save-form state (shown after drawing is complete)
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(CATEGORY_OPTIONS[0].value);

  const { data: annotations, isLoading } = trpc.annotation.listByDeal.useQuery(
    { dealId, workspaceId: activeWorkspaceId },
    { enabled: !!dealId }
  );

  const createMutation = trpc.annotation.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["annotation", "listByDeal"]] });
      setName("");
      setCategory(CATEGORY_OPTIONS[0].value);
      clearCompleted();
    },
  });

  const deleteMutation = trpc.annotation.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["annotation", "listByDeal"]] });
    },
  });

  const canEdit = userRole !== "VIEWER";

  const handleSave = () => {
    if (!completedPolygon || !name.trim()) return;
    createMutation.mutate({
      dealId,
      workspaceId: activeWorkspaceId,
      name: name.trim(),
      category: category as (typeof CATEGORY_OPTIONS)[number]["value"],
      geometry: completedPolygon,
    });
  };

  // ── Saving state (polygon drawn, waiting for name + category) ────────────
  if (completedPolygon) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-land-muted uppercase tracking-wider">Save annotation</p>
        <div className="space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Annotation name"
            autoFocus
            className="w-full px-2.5 py-2 text-xs bg-land-surface border border-white/10 rounded-lg text-land-text placeholder-land-muted focus:outline-none focus:ring-1 focus:ring-land-accent/50"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2.5 py-2 text-xs bg-land-surface border border-white/10 rounded-lg text-land-text focus:outline-none focus:ring-1 focus:ring-land-accent/50"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!name.trim() || createMutation.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-land-accent hover:bg-land-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <CheckCircle size={12} />
            {createMutation.isPending ? "Saving…" : "Save"}
          </button>
          <button
            onClick={clearCompleted}
            className="px-3 py-1.5 text-xs text-land-muted hover:text-land-text hover:bg-white/5 rounded-lg transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    );
  }

  // ── Drawing state ────────────────────────────────────────────────────────
  if (isDrawing) {
    return (
      <div className="space-y-3">
        <div className="p-3 bg-land-accent/10 border border-land-accent/30 rounded-lg">
          <p className="text-xs font-medium text-land-accent mb-1">Drawing active</p>
          <p className="text-xs text-land-muted">
            Click on the map to place vertices ({currentPoints.length} placed).
            Need at least 3 to finish.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={finishDrawing}
            disabled={currentPoints.length < 3}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-land-accent hover:bg-land-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <CheckCircle size={12} />
            Finish
          </button>
          <button
            onClick={cancelDrawing}
            className="px-3 py-1.5 text-xs text-land-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <XCircle size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Default: list + draw button ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <button
          onClick={() => startDrawing("polygon", dealId)}
          className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-white/20 hover:border-land-accent/50 rounded-lg text-xs text-land-muted hover:text-land-accent transition-colors"
        >
          <Pencil size={12} />
          Draw polygon annotation
        </button>
      )}

      {(!annotations || annotations.length === 0) && (
        <p className="text-xs text-land-muted text-center py-4">No annotations yet.</p>
      )}

      <div className="space-y-2">
        {(annotations as unknown as { id: string; name: string; category: string }[] | undefined)?.map((a) => (
          <div key={a.id} className="group flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-land-text truncate">{a.name}</p>
              <span
                className={`inline-block mt-0.5 text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[a.category] ?? "bg-white/5 text-land-muted"}`}
              >
                {CATEGORY_OPTIONS.find((o) => o.value === a.category)?.label ?? a.category}
              </span>
            </div>
            {canEdit && (
              <button
                onClick={() => deleteMutation.mutate({ id: a.id, workspaceId: activeWorkspaceId })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-land-muted hover:text-red-400 shrink-0 mt-0.5"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
