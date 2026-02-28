/**
 * LayerControl — Map Layer Visibility Toggle
 *
 * A floating panel (top-right) that lets users toggle map layers on/off.
 * In MVP, there is one data layer: Transport POI (rail/underground stations).
 * Additional layers (footfall heatmap, noise zones etc.) will be added later.
 *
 * TODO (Phase 7): wire up Transport POI layer toggle to trpc.mapbox.queryTransportPOI
 */

import { useState } from "react";
import { Layers } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

export function LayerControl() {
  const [isOpen, setIsOpen] = useState(false);
  const { transportPOIEnabled, setTransportPOIEnabled } = useUIStore();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 glass-panel rounded-lg flex items-center justify-center text-land-muted hover:text-land-text transition-colors"
        title="Toggle map layers"
      >
        <Layers size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-52 glass-panel rounded-xl p-3 space-y-2">
          <p className="text-xs font-medium text-land-muted uppercase tracking-wider px-1">
            Map Layers
          </p>
          <LayerToggle
            label="Transport POI"
            checked={transportPOIEnabled}
            onChange={setTransportPOIEnabled}
          />
        </div>
      )}
    </div>
  );
}

interface LayerToggleProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

function LayerToggle({ label, checked = false, onChange, disabled }: LayerToggleProps) {
  return (
    <label className={`flex items-center justify-between px-1 py-1.5 rounded-lg cursor-pointer ${disabled ? "opacity-40" : "hover:bg-white/5"}`}>
      <span className="text-sm text-land-text">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className="accent-land-accent"
      />
    </label>
  );
}
