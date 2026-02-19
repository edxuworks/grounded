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
  setFlyToTarget: (target: MapCoordinates | null) => void;
  setActiveWorkspaceId: (id: string | null) => void;

  selectAnnotation: (id: string | null) => void;
  toggleAnnotationCategory: (category: string) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // ── Initial state ────────────────────────────────────────────────────────

  sidebarOpen: false,
  leftPanelOpen: false,
  leftPanelMode: "deal-files",
  activeDealId: null,
  pendingPin: null,
  activeWorkspaceId: null,
  flyToTarget: null,
  selectedAnnotationId: null,
  hiddenAnnotationCategories: [],

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

  setFlyToTarget: (target) =>
    set({ flyToTarget: target }),

  setActiveWorkspaceId: (id) =>
    set({ activeWorkspaceId: id }),

  selectAnnotation: (id) =>
    set({ selectedAnnotationId: id }),

  toggleAnnotationCategory: (category) =>
    set((state) => ({
      hiddenAnnotationCategories: state.hiddenAnnotationCategories.includes(category)
        // Remove from hidden (make visible)
        ? state.hiddenAnnotationCategories.filter((c) => c !== category)
        // Add to hidden
        : [...state.hiddenAnnotationCategories, category],
    })),
}));
