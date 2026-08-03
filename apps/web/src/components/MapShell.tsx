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
import { Upload, ChevronLeft } from "lucide-react";

const HOME_URL = import.meta.env["VITE_HOME_URL"] ?? "http://localhost:3000";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { MapCanvas } from "@/components/map/MapCanvas";
import { LeftPanel } from "@/components/left-panel/LeftPanel";
import { DealSidebar } from "@/components/sidebar/DealSidebar";
import { LayerControl } from "@/components/map/LayerControl";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { UploadOMModal } from "@/components/upload/UploadOMModal";

const WORKSPACE_KEY = "grounded:activeWorkspaceId";

export function MapShell() {
  const { sidebarOpen, leftPanelOpen, setPreviewPin, setActiveWorkspaceId } = useUIStore();
  const { workspaceName } = useWorkspace();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [is3D, setIs3D] = useState(true);

  const handleBackToDashboard = () => {
    localStorage.removeItem(WORKSPACE_KEY);
    setActiveWorkspaceId(null);
  };

  return (
    // Full-screen relative container. All child panels are positioned absolutely.
    <div className="relative w-full h-screen overflow-hidden">
      {/* Base layer: full-screen map */}
      <MapCanvas is3D={is3D} />

      {/* Top-left panel: deal file manager + create deal form */}
      {leftPanelOpen && (
        <div className="absolute top-4 left-4 z-20 w-80 animate-slide-in-left">
          <ErrorBoundary label="Left panel">
            <LeftPanel />
          </ErrorBoundary>
        </div>
      )}

      {/* Top-right: layer visibility toggle controls — shifts left when sidebar is open */}
      <div className={`absolute top-4 z-20 flex items-center gap-2 transition-all ${sidebarOpen ? "right-[25.5rem]" : "right-4"}`}>
        {/* 2D / 3D toggle */}
        <button
          onClick={() => setIs3D((prev) => !prev)}
          className="h-10 px-3 bg-white hover:bg-gray-100 rounded-lg text-gray-800 font-bold text-sm transition-colors shadow-lg"
          title={is3D ? "Switch to 2D view" : "Switch to 3D view"}
        >
          {is3D ? "2D" : "3D"}
        </button>
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

      {/* Top-left controls: home + back to workspaces + toggle panel */}
      {!leftPanelOpen && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
          {/* Home — back to marketing site */}
          <a
            href={HOME_URL}
            className="flex items-center h-10 px-4 bg-land-accent hover:bg-land-accent-hover rounded-lg shadow-lg transition-colors"
            title="GROUNDED home"
          >
            <span className="text-sm font-bold tracking-widest uppercase text-white">GROUNDED</span>
          </a>
          {/* Back to workspace dashboard */}
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-1.5 h-10 px-3 bg-white hover:bg-gray-100 rounded-lg text-gray-800 transition-colors shadow-lg text-xs font-semibold"
            title="Back to workspaces"
          >
            <ChevronLeft size={13} />
            {workspaceName}
          </button>
          {/* Toggle left panel */}
          <button
            onClick={() => useUIStore.getState().openLeftPanel()}
            className="w-10 h-10 bg-white hover:bg-gray-100 rounded-lg flex items-center justify-center text-gray-700 transition-colors shadow-lg font-bold"
            title="Toggle panel"
          >
            ☰
          </button>
        </div>
      )}

      {/* Upload OM button — bottom-left floating */}
      <button
        onClick={() => setUploadModalOpen(true)}
        className="absolute bottom-6 left-6 z-20 flex items-center gap-2 px-4 py-2.5 bg-land-accent hover:bg-land-accent-hover rounded-xl text-sm font-semibold text-white transition-colors shadow-lg"
        title="Upload Offering Memorandum"
      >
        <Upload size={15} className="text-white" />
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
