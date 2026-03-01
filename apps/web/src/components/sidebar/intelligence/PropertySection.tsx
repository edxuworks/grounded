/**
 * PropertySection — EPC + VOA Property Data
 *
 * Shows energy performance certificate data and VOA rateable values.
 */

import { trpc } from "@/api/trpc";
import {
  IntelligenceDataRow,
  IntelligenceSkeleton,
  IntelligenceError,
  IntelligenceUnavailable,
} from "./IntelligenceDataRow";

interface PropertySectionProps {
  latitude: number;
  longitude: number;
  address: string;
}

export function PropertySection({ latitude, longitude, address }: PropertySectionProps) {
  const { data: epcData, isLoading: epcLoading, error: epcError } =
    trpc.property.getEPC.useQuery(
      { address, latitude, longitude },
      { staleTime: 604800000 } // 7 days
    );

  if (epcLoading) return <IntelligenceSkeleton rows={4} />;

  // EPC is the primary data source; if it fails, show what we have
  if (epcError && !epcData) {
    return <IntelligenceError message="Property data unavailable" />;
  }

  if (!epcData) return <IntelligenceUnavailable message="No EPC data found for this address" />;

  const ratingColor =
    epcData.rating <= "B" ? "text-emerald-400" :
    epcData.rating <= "D" ? "text-amber-400" :
    "text-red-400";

  return (
    <div className="space-y-0.5">
      <IntelligenceDataRow
        label="EPC Rating"
        value={epcData.rating}
        valueColor={ratingColor}
      />
      {epcData.floorArea && (
        <IntelligenceDataRow
          label="Floor Area"
          value={`${epcData.floorArea.toLocaleString()} m²`}
        />
      )}
      <IntelligenceDataRow
        label="MEES Compliant"
        value={epcData.meesCompliant ? "Yes" : "No"}
        valueColor={epcData.meesCompliant ? "text-emerald-400" : "text-red-400"}
      />
      {epcData.expiryDate && (
        <IntelligenceDataRow
          label="Certificate Expires"
          value={epcData.expiryDate}
        />
      )}
    </div>
  );
}
