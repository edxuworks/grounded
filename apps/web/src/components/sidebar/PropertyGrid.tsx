/**
 * PropertyGrid — Dynamic Custom Field Renderer
 *
 * Fetches the workspace's field definitions and the deal's saved field values,
 * then renders each field as an editable input (text, number, or date).
 *
 * OCP: adding a new FieldType (e.g. BOOLEAN) only requires adding a new
 * renderer case here — no schema changes needed.
 */

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { trpc, queryClient } from "@/api/trpc";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";

interface PropertyGridProps {
  dealId: string;
  fieldValues: Record<string, unknown>;
}

export function PropertyGrid({ dealId, fieldValues }: PropertyGridProps) {
  const { activeWorkspaceId } = useWorkspace();

  const { data: fieldDefs, isLoading } = trpc.fieldDef.list.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!activeWorkspaceId }
  );

  const updateMutation = trpc.deal.updateFieldValues.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["deal", "getById"]] });
    },
  });

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>;
  }

  if (!fieldDefs || fieldDefs.length === 0) {
    return (
      <p className="text-xs text-land-muted py-2">
        No custom fields yet. Add fields in the Fields tab.
      </p>
    );
  }

  const handleSave = (fieldDefId: string, value: string | number | null) => {
    updateMutation.mutate({
      id: dealId,
      workspaceId: activeWorkspaceId,
      fieldValues: { ...fieldValues as Record<string, string | number | null>, [fieldDefId]: value },
    });
  };

  return (
    <div className="space-y-1">
      {fieldDefs.map((def) => (
        <FieldRow
          key={def.id}
          label={def.name}
          fieldType={def.fieldType}
          value={fieldValues[def.id] ?? null}
          onSave={(val) => handleSave(def.id, val)}
          isSaving={updateMutation.isPending}
        />
      ))}
    </div>
  );
}

// ── Individual field row ──────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  fieldType: "TEXT" | "NUMBER" | "DATE";
  value: unknown;
  onSave: (value: string | number | null) => void;
  isSaving: boolean;
}

function FieldRow({ label, fieldType, value, onSave, isSaving }: FieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  const displayValue = value !== null && value !== undefined && value !== ""
    ? String(value)
    : <span className="italic text-land-muted">—</span>;

  const handleConfirm = () => {
    const coerced: string | number | null =
      fieldType === "NUMBER"
        ? (draft === "" ? null : Number(draft))
        : draft || null;
    onSave(coerced);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(String(value ?? ""));
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <span className="text-xs text-land-muted w-28 shrink-0 truncate">{label}</span>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            autoFocus
            type={fieldType === "NUMBER" ? "number" : fieldType === "DATE" ? "date" : "text"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") handleCancel(); }}
            className="flex-1 px-2 py-1 text-xs bg-land-surface border border-land-accent/50 rounded text-land-text focus:outline-none focus:ring-1 focus:ring-land-accent/50"
          />
          <button onClick={handleConfirm} disabled={isSaving} className="text-emerald-400 hover:text-emerald-300 transition-colors">
            <Check size={13} />
          </button>
          <button onClick={handleCancel} className="text-land-muted hover:text-land-text transition-colors">
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs text-land-text flex-1">{displayValue}</span>
          <button
            onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-land-muted hover:text-land-text"
          >
            <Pencil size={11} />
          </button>
        </div>
      )}
    </div>
  );
}
