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

  setPendingPin: (coords: MapCoordinates | null) => void;
  setPreviewPin: (pin: PreviewPin | null) => void;
  setPendingAddress: (address: string | null) => void;
  setFlyToTarget: (target: MapCoordinates | null) => void;
  setActiveWorkspaceId: (id: string | null) => void;

  /** Whether the Transport POI layer is visible on the map */
  transportPOIEnabled: boolean;

  selectAnnotation: (id: string | null) => void;
  toggleAnnotationCategory: (category: string) => void;
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
  pendingAddress: null,
  activeWorkspaceId: null,
  flyToTarget: null,
  selectedAnnotationId: null,
  hiddenAnnotationCategories: [],
  transportPOIEnabled: false,

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
    set({ transportPOIEnabled: enabled }),

  toggleAnnotationCategory: (category) =>
    set((state) => ({
      hiddenAnnotationCategories: state.hiddenAnnotationCategories.includes(category)
        // Remove from hidden (make visible)
        ? state.hiddenAnnotationCategories.filter((c) => c !== category)
        // Add to hidden
        : [...state.hiddenAnnotationCategories, category],
    })),
}));
