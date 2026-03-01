/**
 * CompetitorPinsLayer — Red Map Pins for Competitor Properties
 *
 * Renders one red pin per competitor extracted from an uploaded OM PDF.
 * Pins are shown alongside the amber PreviewPinMarker (subject property)
 * and cleared when the user dismisses the preview or closes the modal.
 *
 * Hover to see the competitor's name and address in a tooltip card.
 */

import { useState } from "react";
import { Marker } from "react-map-gl";
import { useUIStore } from "@/store/useUIStore";
import type { CompetitorPin } from "@/store/useUIStore";

export function CompetitorPinsLayer() {
  const competitorPins = useUIStore((s) => s.competitorPins);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (competitorPins.length === 0) return null;

  return (
    <>
      {competitorPins.map((pin: CompetitorPin, i: number) => (
        <Marker
          key={`competitor-${i}`}
          longitude={pin.longitude}
          latitude={pin.latitude}
          anchor="bottom"
          color={undefined}
        >
          <div
            className="flex flex-col items-center cursor-pointer"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Tooltip card on hover */}
            {hoveredIndex === i && (
              <div className="mb-2 w-52 bg-land-panel border border-red-500/40 rounded-xl shadow-2xl overflow-hidden">
                <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20">
                  <span className="text-xs font-semibold text-red-400">Competitor</span>
                </div>
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-land-text">{pin.name}</p>
                  <p className="text-xs text-land-muted mt-0.5 leading-relaxed">{pin.address}</p>
                </div>
              </div>
            )}

            {/* Pin body */}
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg" />
            {/* Pin tail */}
            <div
              className="w-0 h-0 -mt-px"
              style={{
                borderLeft: "4px solid transparent",
                borderRight: "4px solid transparent",
                borderTop: "5px solid #ef4444",
              }}
            />
          </div>
        </Marker>
      ))}
    </>
  );
}
