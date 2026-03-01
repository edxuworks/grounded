/**
 * UI State Store — Zustand
 *
 * Manages purely client-side UI state: which panels are open, which deal is
 * selected, what the map is focused on. NO server data lives here.
 *
 * WHY Zustand for UI state + React Query for server state?
 * Mixing server data into Zustand creates synchronisation problems — if a
 * deal is updated via a mutation, you'd need to manually update both the
 * React Query cache and the Zustand store. React Query already handles
 * caching and invalidation. Zustand just needs to hold things like
 * "is the sidebar open" and "which dealId is active".
 *
 * State is deliberately minimal — only what can't be derived from server data.
 */

import { create } from "zustand";

interface MapCoordinates {
  longitude: number;
  latitude: number;
  zoom?: number;
}

interface PreviewPin {
  longitude: number;
  latitude: number;
  /** Full formatted address extracted from the OM */
  address: string;
}

export interface CompetitorPin {
  name: string;
  address: string;
  longitude: number;
  latitude: number;
}

interface UIStore {
  // ── Panel visibility ─────────────────────────────────────────────────────

  /** Right-side deal detail sidebar */
  sidebarOpen: boolean;
  /** Left panel (create deal form or deal file manager) */
  leftPanelOpen: boolean;
  /** Which mode the left panel is in */
  leftPanelMode: "create-deal" | "deal-files" | "field-settings";

  // ── Active selections ────────────────────────────────────────────────────

  /** The deal whose details are shown in the sidebar */
  activeDealId: string | null;
  /**
   * A pending map pin — set when the user clicks the map to start creating
   * a deal, before the form is submitted. Cleared on form submit or cancel.
   */
  pendingPin: MapCoordinates | null;

  /**
   * A preview pin set after OM document analysis + geocoding.
   * Shown as a pulsing marker on the map with a floating confirmation card.
   * Cleared when the user saves as a deal or cancels.
   */
  previewPin: PreviewPin | null;

  /**
   * Address pre-filled from OM analysis — read by CreateDealForm as a
   * default value so the user doesn't have to retype the address.
   * Cleared after CreateDealForm mounts and reads it.
   */
  pendingAddress: string | null;

  /** The active workspace ID (persisted to localStorage by the WorkspaceProvider) */
  activeWorkspaceId: string | null;

  // ── Map control ──────────────────────────────────────────────────────────

  /**
   * When set, the map animates (flyTo) to this location.
   * Cleared by the MapCanvas component after the animation starts.
   */
  flyToTarget: MapCoordinates | null;

  // ── Annotation UI ────────────────────────────────────────────────────────

  /** The annotation currently selected (clicked) on the map — shows popup */
  selectedAnnotationId: string | null;
  /**
   * Categories whose annotations are hidden on the map.
   * Toggled by the layer control panel.
   */
  hiddenAnnotationCategories: string[];

  // ── Actions ──────────────────────────────────────────────────────────────

  openSidebar: (dealId: string) => void;
  closeSidebar: () => void;

  openLeftPanel: (mode?: UIStore["leftPanelMode"]) => void;
  closeLeftPanel: () => void;
  setLeftPanelMode: (mode: UIStore["leftPanelMode"]) => void;

  /** Competitor properties extracted from OM analysis, shown as red pins */
  competitorPins: CompetitorPin[];
  setCompetitorPins: (pins: CompetitorPin[]) => void;

  setPendingPin: (coords: MapCoordinates | null) => void;
  setPreviewPin: (pin: PreviewPin | null) => void;
  setPendingAddress: (address: string | null) => void;
  setFlyToTarget: (target: MapCoordinates | null) => void;
  setActiveWorkspaceId: (id: string | null) => void;

  // ── Map layers ──────────────────────────────────────────────────────────

  /** Which data layers are currently enabled on the map */
  enabledLayers: Record<string, boolean>;
  /** Toggle a layer on/off by its registry ID */
  toggleLayer: (layerId: string) => void;
  /** Check if a specific layer is enabled */
  isLayerEnabled: (layerId: string) => boolean;

  /** @deprecated Use isLayerEnabled('transport-poi') instead */
  transportPOIEnabled: boolean;

  selectAnnotation: (id: string | null) => void;
  toggleAnnotationCategory: (category: string) => void;
  /** @deprecated Use toggleLayer('transport-poi') instead */
  setTransportPOIEnabled: (enabled: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // ── Initial state ────────────────────────────────────────────────────────

  sidebarOpen: false,
  leftPanelOpen: false,
  leftPanelMode: "deal-files",
  activeDealId: null,
  pendingPin: null,
  previewPin: null,
  competitorPins: [],
  pendingAddress: null,
  activeWorkspaceId: null,
  flyToTarget: null,
  selectedAnnotationId: null,
  hiddenAnnotationCategories: [],
  transportPOIEnabled: false,
  enabledLayers: {},

  // ── Actions ──────────────────────────────────────────────────────────────

  openSidebar: (dealId) =>
    set({ sidebarOpen: true, activeDealId: dealId }),

  closeSidebar: () =>
    set({ sidebarOpen: false, activeDealId: null, pendingPin: null }),

  openLeftPanel: (mode = "deal-files") =>
    set({ leftPanelOpen: true, leftPanelMode: mode }),

  closeLeftPanel: () =>
    set({ leftPanelOpen: false }),

  setLeftPanelMode: (mode) =>
    set({ leftPanelMode: mode }),

  setPendingPin: (coords) =>
    set({ pendingPin: coords }),

  setCompetitorPins: (pins) =>
    set({ competitorPins: pins }),

  setPreviewPin: (pin) =>
    set({ previewPin: pin }),

  setPendingAddress: (address) =>
    set({ pendingAddress: address }),

  setFlyToTarget: (target) =>
    set({ flyToTarget: target }),

  setActiveWorkspaceId: (id) =>
    set({ activeWorkspaceId: id }),

  selectAnnotation: (id) =>
    set({ selectedAnnotationId: id }),

  setTransportPOIEnabled: (enabled) =>
    set((state) => ({
      transportPOIEnabled: enabled,
      enabledLayers: { ...state.enabledLayers, "transport-poi": enabled },
    })),

  toggleLayer: (layerId) =>
    set((state) => {
      const current = state.enabledLayers[layerId] ?? false;
      const updated = { ...state.enabledLayers, [layerId]: !current };
      return {
        enabledLayers: updated,
        // Keep transportPOIEnabled in sync for backwards compat
        ...(layerId === "transport-poi" ? { transportPOIEnabled: !current } : {}),
      };
    }),

  isLayerEnabled: (_layerId) => {
    // Reads go through enabledLayers state directly via selectors.
    // This function exists for the interface — consumers should use:
    // useUIStore(s => s.enabledLayers[layerId] ?? false)
    return false;
  },

  toggleAnnotationCategory: (category) =>
    set((state) => ({
      hiddenAnnotationCategories: state.hiddenAnnotationCategories.includes(category)
        // Remove from hidden (make visible)
        ? state.hiddenAnnotationCategories.filter((c) => c !== category)
        // Add to hidden
        : [...state.hiddenAnnotationCategories, category],
    })),
}));
