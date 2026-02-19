/**
 * DealMarkers — Map Pin Layer for All Deals
 *
 * Fetches all deals in the active workspace and renders a Marker for each one
 * using react-map-gl. Clicking a marker opens the deal's sidebar.
 *
 * WHY a separate component instead of inline in MapCanvas?
 * SRP — MapCanvas manages the map instance and viewport. DealMarkers owns
 * the "deal pins on the map" concern. Each concern can be changed independently.
 *
 * WHY react-map-gl Marker instead of a custom Mapbox GL layer?
 * Markers are React components — they stay in the React render tree so we get
 * React event handlers, Tailwind classes, and hover state for free. A custom
 * Mapbox layer (GL Symbols) would require managing GeoJSON sources separately
 * and lose React's declarative model.
 *
 * Performance note:
 * For large datasets (>1000 deals) this approach would struggle. At scale, swap
 * to a Mapbox GL Symbol layer with clustering. For the MVP deal count this is fine.
 */

import { Marker } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import { useWorkspace } from "@/features/workspace/WorkspaceProvider";
import { trpc } from "@/api/trpc";

/** Status colours that match the tailwind config's status-* palette. */
const STATUS_COLOURS: Record<string, string> = {
  SOURCING: "#64748b",      // slate
  UNDERWRITING: "#3b82f6",  // blue
  LEGALS: "#f59e0b",        // amber
  PLANNING: "#8b5cf6",      // violet
  APPROVED: "#10b981",      // emerald
  REJECTED: "#ef4444",      // red
};

export function DealMarkers() {
  const { activeWorkspaceId } = useWorkspace();
  const { openSidebar, activeDealId } = useUIStore();

  const { data: deals } = trpc.deal.list.useQuery(
    { workspaceId: activeWorkspaceId },
    { enabled: !!activeWorkspaceId }
  );

  if (!deals || deals.length === 0) return null;

  return (
    <>
      {deals.map((deal) => {
        const colour = STATUS_COLOURS[deal.status] ?? "#64748b";
        const isActive = deal.id === activeDealId;

        return (
          <Marker
            key={deal.id}
            longitude={deal.longitude}
            latitude={deal.latitude}
            // Disable the default blue circle pin.
            color={undefined}
            // Anchor the pin at its bottom centre so it points precisely at the location.
            anchor="bottom"
            onClick={(e) => {
              // Prevent the click from propagating to the map and setting a new pending pin.
              e.originalEvent.stopPropagation();
              openSidebar(deal.id);
            }}
          >
            {/* Custom pin shape — scales up when the deal's sidebar is open. */}
            <div
              className={`transition-transform cursor-pointer ${isActive ? "scale-125" : "hover:scale-110"}`}
              title={deal.title}
            >
              {/* Pin body */}
              <div
                className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: colour }}
              />
              {/* Pin tail */}
              <div
                className="w-0 h-0 mx-auto -mt-px"
                style={{
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderTop: `5px solid ${colour}`,
                }}
              />
            </div>
          </Marker>
        );
      })}
    </>
  );
}
