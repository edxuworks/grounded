/**
 * EnvironmentSection — EA Flood Risk Data
 *
 * Shows flood zone classification and active warnings for the deal's location.
 */

import { trpc } from "@/api/trpc";
import {
  IntelligenceDataRow,
  IntelligenceSkeleton,
  IntelligenceError,
  IntelligenceUnavailable,
} from "./IntelligenceDataRow";

interface EnvironmentSectionProps {
  latitude: number;
  longitude: number;
}

export function EnvironmentSection({ latitude, longitude }: EnvironmentSectionProps) {
  const { data, isLoading, error } = trpc.environment.getFloodRisk.useQuery(
    { latitude, longitude },
    { staleTime: 900000 } // 15min — warnings change frequently
  );

  if (isLoading) return <IntelligenceSkeleton rows={3} />;
  if (error) return <IntelligenceError message="Flood data unavailable" />;
  if (!data) return <IntelligenceUnavailable />;

  const zoneColor =
    data.floodZone === "Zone 3" ? "text-red-400" :
    data.floodZone === "Zone 2" ? "text-amber-400" :
    "text-emerald-400";

  return (
    <div className="space-y-0.5">
      <IntelligenceDataRow
        label="Flood Zone"
        value={data.floodZone ?? "Zone 1 (low risk)"}
        valueColor={zoneColor}
      />
      <IntelligenceDataRow
        label="Active Warnings"
        value={data.activeWarnings}
        valueColor={data.activeWarnings > 0 ? "text-red-400" : undefined}
      />
      {data.nearestStation && (
        <IntelligenceDataRow
          label="Nearest Monitoring"
          value={data.nearestStation}
        />
      )}
    </div>
  );
}
