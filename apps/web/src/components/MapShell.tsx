/**
 * MapShell — Application Shell
 *
 * The root layout component for the authenticated app.
 * Renders the full-screen map as the background with all floating panels
 * overlaid on top using absolute positioning and z-index layering.
 *
 * Panel layout:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ [LeftPanel]          [LayerControl]                  │
 *   │                                                      │
 *   │                   MapCanvas                          │
 *   │              (Mapbox GL full-screen)                 │
 *   │                                                      │
 *   │                                    [DealSidebar]     │
 *   └─────────────────────────────────────────────────────┘
 *
 * Z-index stacking order:
 *  0  — MapCanvas (base)
 *  10 — Map markers and annotations
 *  20 — Floating panels (LeftPanel, DealSidebar, LayerControl)
 *  30 — Modal overlays (dialogs, dropdowns)
 *
 * This component is intentionally thin — it's a layout shell only.
 * Business logic lives in the individual panel components.
 */

import { useState } from "react";
import { Upload } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";
import { MapCanvas } from "@/components/map/MapCanvas";
import { LeftPanel } from "@/components/left-panel/LeftPanel";
import { DealSidebar } from "@/components/sidebar/DealSidebar";
import { LayerControl } from "@/components/map/LayerControl";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UploadOMModal } from "@/components/upload/UploadOMModal";

export function MapShell() {
  const { sidebarOpen, leftPanelOpen, setPreviewPin } = useUIStore();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  return (
    // Full-screen relative container. All child panels are positioned absolutely.
    <div className="relative w-full h-screen overflow-hidden">
      {/* Base layer: full-screen map */}
      <MapCanvas />

      {/* Top-left panel: deal file manager + create deal form */}
      {leftPanelOpen && (
        <div className="absolute top-4 left-4 z-20 w-80 animate-slide-in-left">
          <ErrorBoundary label="Left panel">
            <LeftPanel />
          </ErrorBoundary>
        </div>
      )}

      {/* Top-right: layer visibility toggle controls */}
      <div className="absolute top-4 right-4 z-20">
        <ErrorBoundary label="Layer control">
          <LayerControl />
        </ErrorBoundary>
      </div>

      {/* Right-side: deal detail sidebar */}
      {sidebarOpen && (
        <div className="absolute top-0 right-0 h-full z-20 w-96 animate-slide-in-right">
          <ErrorBoundary label="Deal sidebar">
            <DealSidebar />
          </ErrorBoundary>
        </div>
      )}

      {/* Floating action button: toggle left panel */}
      <button
        onClick={() =>
          leftPanelOpen
            ? useUIStore.getState().closeLeftPanel()
            : useUIStore.getState().openLeftPanel()
        }
        className="absolute top-4 left-4 z-20 w-10 h-10 bg-land-panel hover:bg-land-surface border border-white/10 rounded-lg flex items-center justify-center text-land-text transition-colors shadow-lg"
        title="Toggle panel"
        style={{ display: leftPanelOpen ? "none" : "flex" }}
      >
        ☰
      </button>

      {/* Upload OM button — bottom-left floating */}
      <button
        onClick={() => setUploadModalOpen(true)}
        className="absolute bottom-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 bg-land-panel hover:bg-land-surface border border-white/10 rounded-xl text-sm font-medium text-land-text transition-colors shadow-lg"
        title="Upload Offering Memorandum"
      >
        <Upload size={15} className="text-land-accent" />
        Upload OM
      </button>

      {/* Upload OM modal */}
      {uploadModalOpen && (
        <UploadOMModal
          onPlot={({ lng, lat, address }) => {
            setPreviewPin({ longitude: lng, latitude: lat, address });
          }}
          onClose={() => setUploadModalOpen(false)}
        />
      )}
    </div>
  );
}
