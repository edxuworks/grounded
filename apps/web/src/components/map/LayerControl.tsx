/**
 * LayerControl — Data-Driven Map Layer Visibility Toggle
 *
 * Floating panel (top-right) that renders toggles for every layer in the
 * LAYER_REGISTRY, grouped by category. State is stored in useUIStore.enabledLayers.
 */

import { useState } from "react";
import { Layers } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { LAYER_REGISTRY, getLayerCategories } from "@/components/map/layerRegistry";

export function LayerControl() {
  const [isOpen, setIsOpen] = useState(false);
  const { enabledLayers, toggleLayer, activeDealId } = useUIStore();
  const categories = getLayerCategories();

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 bg-land-panel border border-land-accent/30 hover:border-land-accent rounded-lg flex items-center justify-center text-land-accent transition-colors shadow-md"
        title="Toggle map layers"
      >
        <Layers size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-12 right-0 w-56 glass-panel rounded-xl p-3 space-y-3">
          {categories.map((category) => {
            const layers = LAYER_REGISTRY.filter((l) => l.category === category);
            return (
              <div key={category}>
                <p className="text-xs font-medium text-land-muted uppercase tracking-wider px-1 mb-1.5">
                  {category}
                </p>
                <div className="space-y-0.5">
                  {layers.map((layer) => {
                    const disabled = layer.requiresDealSelection && !activeDealId;
                    return (
                      <LayerToggle
                        key={layer.id}
                        label={layer.label}
                        checked={enabledLayers[layer.id] ?? false}
                        onChange={() => toggleLayer(layer.id)}
                        disabled={disabled}
                        disabledReason={disabled ? "Select a deal first" : undefined}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LayerToggleProps {
  label: string;
  checked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}

function LayerToggle({ label, checked = false, onChange, disabled, disabledReason }: LayerToggleProps) {
  return (
    <label
      className={`flex items-center justify-between px-1 py-1.5 rounded-lg cursor-pointer ${disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-land-accent/10"}`}
      title={disabledReason}
    >
      <span className="text-sm text-land-text">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="accent-land-accent"
      />
    </label>
  );
}
