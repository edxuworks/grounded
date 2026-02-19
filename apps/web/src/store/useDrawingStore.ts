/**
 * Drawing State Store — Zustand
 *
 * Manages the state of the map annotation drawing tools.
 * Separated from useUIStore because drawing state has its own lifecycle —
 * it activates, collects in-progress geometry, and resets on completion.
 *
 * Drawing tools available:
 *  - 'polygon'  : Click to place vertices, double-click to close
 *  - 'rectangle': Click-and-drag two corners
 *
 * WHY is this separate from useUIStore?
 * Drawing state changes frequently during a drawing operation (every mouse move
 * updates currentPoints). Keeping it separate prevents unnecessary re-renders
 * of the sidebar and left panel, which subscribe to useUIStore.
 */

import { create } from "zustand";

export type DrawingTool = "polygon" | "rectangle" | null;

interface DrawingStore {
  /** Currently active drawing tool, or null when not drawing */
  activeTool: DrawingTool;

  /** The deal ID that new annotations will be attached to */
  activeDealId: string | null;

  /**
   * In-progress coordinate array for the polygon being drawn.
   * Each point is [longitude, latitude] (GeoJSON order).
   * Used by the DrawingToolbar to show a "points placed" count.
   */
  currentPoints: [number, number][];

  /** True while the user is actively placing points */
  isDrawing: boolean;

  // ── Actions ──────────────────────────────────────────────────────────────

  startDrawing: (tool: DrawingTool, dealId: string) => void;
  addPoint: (point: [number, number]) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
}

export const useDrawingStore = create<DrawingStore>((set) => ({
  activeTool: null,
  activeDealId: null,
  currentPoints: [],
  isDrawing: false,

  startDrawing: (tool, dealId) =>
    set({
      activeTool: tool,
      activeDealId: dealId,
      currentPoints: [],
      isDrawing: true,
    }),

  addPoint: (point) =>
    set((state) => ({
      currentPoints: [...state.currentPoints, point],
    })),

  finishDrawing: () =>
    set({
      // Keep activeDealId intact — the parent component reads it to know
      // which deal the completed geometry should be saved to, then calls
      // cancelDrawing() to reset after saving.
      activeTool: null,
      currentPoints: [],
      isDrawing: false,
    }),

  cancelDrawing: () =>
    set({
      activeTool: null,
      activeDealId: null,
      currentPoints: [],
      isDrawing: false,
    }),
}));
