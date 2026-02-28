/**
 * FieldDefManager — Custom Field Schema Editor
 *
 * Shown in the "Fields" tab of the left panel. Lets workspace owners/admins
 * define custom fields (name + type) that appear on every deal in the workspace.
 */

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { trpc, queryClient } from "@/api/trpc";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";

const FIELD_TYPES = [
  { value: "TEXT", label: "Text" },
  { value: "NUMBER", label: "Number" },
  { value: "DATE", label: "Date" },
] as const;

export function FieldDefManager() {
  const { activeWorkspaceId, userRole } = useWorkspace();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"TEXT" | "NUMBER" | "DATE">("TEXT");

  const canEdit = userRole === "OWNER" || userRole === "ADMIN";

  const { data: fieldDefs, isLoading } = trpc.fieldDef.list.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!activeWorkspaceId }
  );

  const createMutation = trpc.fieldDef.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["fieldDef", "list"]] });
      setNewName("");
      setNewType("TEXT");
      setShowAdd(false);
    },
  });

  const deleteMutation = trpc.fieldDef.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [["fieldDef", "list"]] });
    },
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMutation.mutate({
      workspaceId: activeWorkspaceId,
      name: newName.trim(),
      fieldType: newType,
    });
  };

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-land-muted">
        Custom fields appear on every deal in this workspace.
      </p>

      {/* Field list */}
      <div className="space-y-1">
        {(!fieldDefs || fieldDefs.length === 0) && (
          <p className="text-xs text-land-muted py-2 text-center">No fields yet.</p>
        )}
        {fieldDefs?.map((def) => (
          <div key={def.id} className="flex items-center gap-2 px-3 py-2 bg-land-surface rounded-lg border border-white/5">
            <span className="flex-1 text-sm text-land-text truncate">{def.name}</span>
            <span className="text-xs text-land-muted bg-white/5 px-1.5 py-0.5 rounded">
              {def.fieldType.toLowerCase()}
            </span>
            {canEdit && (
              <button
                onClick={() => deleteMutation.mutate({ id: def.id, workspaceId: activeWorkspaceId })}
                disabled={deleteMutation.isPending}
                className="text-land-muted hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add field */}
      {canEdit && (
        showAdd ? (
          <div className="space-y-2 p-3 bg-land-surface rounded-lg border border-white/10">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowAdd(false); }}
              placeholder="Field name"
              className="w-full px-2.5 py-1.5 text-sm bg-land-bg border border-white/10 rounded text-land-text placeholder-land-muted focus:outline-none focus:ring-1 focus:ring-land-accent/50"
            />
            <div className="flex gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as typeof newType)}
                className="flex-1 px-2 py-1.5 text-sm bg-land-bg border border-white/10 rounded text-land-text focus:outline-none"
              >
                {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || createMutation.isPending}
                className="px-3 py-1.5 text-sm bg-land-accent text-white rounded hover:bg-land-accent-hover transition-colors disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 text-sm text-land-muted hover:text-land-text transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-white/10 text-land-muted hover:border-land-accent/40 hover:text-land-text transition-colors text-sm"
          >
            <Plus size={14} />
            Add field
          </button>
        )
      )}
    </div>
  );
}
