/**
 * CreateDealForm — New Deal Creation Form
 *
 * Shown in the left panel when the user clicks an empty area on the map.
 * The map click sets `pendingPin` in the UI store with the lng/lat coordinates.
 * This form uses those coordinates to pre-fill the location and asks for:
 *   - Deal title
 *   - Address (free-text; coordinates come from the map click, not geocoding)
 *   - Deal file (which folder to save to)
 *
 * On successful create:
 *   1. The deals query is invalidated so the new marker appears on the map.
 *   2. The left panel switches back to the deal file list mode.
 *   3. The new deal's sidebar opens automatically.
 *   4. The pending pin is cleared.
 *
 * Validation is handled by react-hook-form + zodResolver with CreateDealSchema.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, X } from "lucide-react";
import { z } from "zod";
import { trpc, queryClient } from "@/api/trpc";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { useUIStore } from "@/store/useUIStore";

// Form schema — a subset of CreateDealSchema without workspaceId (added programmatically).
// We omit workspaceId/coordinates from the form because we source them from context/store.
const FormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  address: z.string().min(1, "Address is required").max(500),
  dealFileId: z.string().min(1, "Please select a deal file"),
});
type FormValues = z.infer<typeof FormSchema>;

export function CreateDealForm() {
  const { activeWorkspaceId } = useWorkspace();
  const { pendingPin, setPendingPin, setLeftPanelMode, openSidebar } = useUIStore();

  // Fetch deal files to populate the "save to" select.
  const { data: dealFiles } = trpc.dealFile.list.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!activeWorkspaceId }
  );

  const createMutation = trpc.deal.create.useMutation({
    onSuccess: (deal: { id: string }) => {
      // Refresh the deal list so the map marker appears immediately.
      queryClient.invalidateQueries({ queryKey: [["deal", "list"]] });
      // Clear the pending pin, switch panel to deal files, open the new deal sidebar.
      setPendingPin(null);
      setLeftPanelMode("deal-files");
      openSidebar(deal.id);
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      // Pre-select the first deal file if one exists.
      dealFileId: dealFiles?.[0]?.id ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!pendingPin) return;
    createMutation.mutate({
      workspaceId: activeWorkspaceId,
      dealFileId: values.dealFileId,
      title: values.title,
      address: values.address,
      longitude: pendingPin.longitude,
      latitude: pendingPin.latitude,
    });
  };

  const handleCancel = () => {
    setPendingPin(null);
    setLeftPanelMode("deal-files");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-land-text">Add new deal</h3>
        <button
          onClick={handleCancel}
          className="w-6 h-6 flex items-center justify-center rounded text-land-muted hover:text-land-text hover:bg-white/5 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Pin coordinates display */}
      {pendingPin && (
        <div className="flex items-center gap-2 px-3 py-2 bg-land-accent/10 border border-land-accent/20 rounded-lg">
          <MapPin size={14} className="text-land-accent flex-shrink-0" />
          <span className="text-xs text-land-muted">
            {pendingPin.latitude.toFixed(5)}, {pendingPin.longitude.toFixed(5)}
          </span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-land-text mb-1">
            Deal title <span className="text-red-400">*</span>
          </label>
          <input
            {...register("title")}
            placeholder="123 High Street"
            autoFocus
            className="w-full px-3 py-2 bg-land-bg border border-white/10 rounded-lg text-sm text-land-text placeholder-land-muted focus:outline-none focus:ring-2 focus:ring-land-accent/50"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-land-text mb-1">
            Address <span className="text-red-400">*</span>
          </label>
          <input
            {...register("address")}
            placeholder="123 High Street, London, EC1A 1AA"
            className="w-full px-3 py-2 bg-land-bg border border-white/10 rounded-lg text-sm text-land-text placeholder-land-muted focus:outline-none focus:ring-2 focus:ring-land-accent/50"
          />
          {errors.address && (
            <p className="mt-1 text-xs text-red-400">{errors.address.message}</p>
          )}
        </div>

        {/* Deal file selector */}
        <div>
          <label className="block text-xs font-medium text-land-text mb-1">
            Deal file <span className="text-red-400">*</span>
          </label>
          {dealFiles && dealFiles.length > 0 ? (
            <select
              {...register("dealFileId")}
              className="w-full px-3 py-2 bg-land-bg border border-white/10 rounded-lg text-sm text-land-text focus:outline-none focus:ring-2 focus:ring-land-accent/50"
            >
              {dealFiles.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2 bg-land-bg border border-white/10 rounded-lg text-sm text-land-muted">
              No deal files — create one in the Deals tab first.
            </div>
          )}
          {errors.dealFileId && (
            <p className="mt-1 text-xs text-red-400">{errors.dealFileId.message}</p>
          )}
        </div>

        {/* Server error */}
        {createMutation.isError && (
          <p className="text-xs text-red-400">{createMutation.error.message}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || !pendingPin}
            className="flex-1 py-2 bg-land-accent hover:bg-land-accent-hover text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "Saving…" : "Save deal"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-2 text-sm text-land-muted hover:text-land-text hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
