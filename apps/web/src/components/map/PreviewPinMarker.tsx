/**
 * PreviewPinMarker — Temporary Map Pin After OM Analysis
 *
 * Shown after a successful document upload + geocode, before the user
 * confirms and saves the deal. Renders:
 *  - A pulsing amber pin on the map at the geocoded coordinates
 *  - A floating confirmation card showing the address with a "Save as Deal" button
 *
 * On "Save as Deal":
 *  1. Sets pendingPin + pendingAddress in UIStore (so CreateDealForm is pre-filled)
 *  2. Opens the left panel in 'create-deal' mode
 *  3. Clears the preview pin
 *
 * On "Dismiss":
 *  - Clears the preview pin without creating a deal
 */

import { Marker } from "react-map-gl";
import { MapPin, X } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

export function PreviewPinMarker() {
  const {
    previewPin,
    setPreviewPin,
    setCompetitorPins,
    setPendingPin,
    setPendingAddress,
    openLeftPanel,
  } = useUIStore();

  if (!previewPin) return null;

  const handleSaveAsDeal = () => {
    // Pre-fill the CreateDealForm with the geocoded location + extracted address.
    setPendingPin({ longitude: previewPin.longitude, latitude: previewPin.latitude });
    setPendingAddress(previewPin.address);
    setPreviewPin(null);
    openLeftPanel("create-deal");
  };

  const handleDismiss = () => {
    setPreviewPin(null);
    setCompetitorPins([]);
  };

  return (
    <Marker
      longitude={previewPin.longitude}
      latitude={previewPin.latitude}
      anchor="bottom"
      color={undefined}
    >
      <div className="flex flex-col items-center">
        {/* Floating confirmation card */}
        <div className="mb-2 w-64 bg-land-panel border border-land-accent/40 rounded-xl shadow-2xl overflow-hidden">
          {/* Card header */}
          <div className="flex items-center justify-between px-3 py-2 bg-land-accent/10 border-b border-land-accent/20">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-land-accent" />
              <span className="text-xs font-semibold text-land-accent">AI-extracted location</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss();
              }}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 text-land-muted hover:text-land-text transition-colors"
            >
              <X size={11} />
            </button>
          </div>

          {/* Address */}
          <div className="px-3 py-2">
            <p className="text-xs text-land-text leading-relaxed">{previewPin.address}</p>
          </div>

          {/* Action */}
          <div className="px-3 pb-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveAsDeal();
              }}
              className="w-full py-1.5 bg-land-accent hover:bg-land-accent-hover text-white text-xs font-medium rounded-lg transition-colors"
            >
              Save as Deal
            </button>
          </div>
        </div>

        {/* Pulsing pin */}
        <div className="relative flex items-center justify-center">
          {/* Pulse ring */}
          <div className="absolute w-8 h-8 rounded-full bg-amber-400/30 animate-ping" />
          {/* Pin body */}
          <div className="relative w-5 h-5 rounded-full bg-amber-400 border-2 border-white shadow-lg z-10" />
        </div>
        {/* Pin tail */}
        <div
          className="w-0 h-0 -mt-px"
          style={{
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "6px solid #fbbf24",
          }}
        />
      </div>
    </Marker>
  );
}
