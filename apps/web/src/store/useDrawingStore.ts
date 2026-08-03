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

/** Minimal GeoJSON Polygon type (avoids importing the full types package). */
export interface DrawnPolygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

interface DrawingStore {
  /** Currently active drawing tool, or null when not drawing */
  activeTool: DrawingTool;

  /** The deal ID that new annotations will be attached to */
  activeDealId: string | null;

  /**
   * In-progress coordinate array for the polygon being drawn.
   * Each point is [longitude, latitude] (GeoJSON order).
   */
  currentPoints: [number, number][];

  /** True while the user is actively placing points */
  isDrawing: boolean;

  /**
   * Set when the user clicks "Finish" with ≥ 3 points.
   * Read by AnnotationPanel to show the save form. Cleared after saving.
   */
  completedPolygon: DrawnPolygon | null;

  // ── Actions ──────────────────────────────────────────────────────────────

  startDrawing: (tool: DrawingTool, dealId: string) => void;
  addPoint: (point: [number, number]) => void;
  /** Finalise the in-progress drawing into completedPolygon. */
  finishDrawing: () => void;
  /** Cancel in-progress drawing without saving. */
  cancelDrawing: () => void;
  /** Clear completedPolygon after annotation has been saved. */
  clearCompleted: () => void;
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  activeTool: null,
  activeDealId: null,
  currentPoints: [],
  isDrawing: false,
  completedPolygon: null,

  startDrawing: (tool, dealId) =>
    set({
      activeTool: tool,
      activeDealId: dealId,
      currentPoints: [],
      isDrawing: true,
      completedPolygon: null,
    }),

  addPoint: (point) =>
    set((state) => ({
      currentPoints: [...state.currentPoints, point],
    })),

  finishDrawing: () => {
    const { currentPoints, activeDealId } = get();
    if (currentPoints.length < 3) return; // Need at least 3 points for a polygon

    // Close the ring: first point repeated at end (GeoJSON spec).
    const ring: [number, number][] = [...currentPoints, currentPoints[0]!];
    set({
      activeTool: null,
      currentPoints: [],
      isDrawing: false,
      // activeDealId kept so AnnotationPanel knows which deal to save to.
      activeDealId,
      completedPolygon: { type: "Polygon", coordinates: [ring] },
    });
  },

  cancelDrawing: () =>
    set({
      activeTool: null,
      activeDealId: null,
      currentPoints: [],
      isDrawing: false,
      completedPolygon: null,
    }),

  clearCompleted: () =>
    set({
      completedPolygon: null,
      activeDealId: null,
    }),
}));
