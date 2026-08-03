/**
 * TransportSection — PTAL Scores + TfL Journey Times
 *
 * Shows public transport accessibility level and journey times to key
 * London destinations.
 */

import { trpc } from "@/api/trpc";
import {
  IntelligenceDataRow,
  IntelligenceSkeleton,
  IntelligenceUnavailable,
} from "./IntelligenceDataRow";

interface TransportSectionProps {
  latitude: number;
  longitude: number;
}

const PTAL_LABELS: Record<string, string> = {
  "0": "0 — Very poor",
  "1a": "1a — Very poor",
  "1b": "1b — Very poor",
  "2": "2 — Poor",
  "3": "3 — Moderate",
  "4": "4 — Good",
  "5": "5 — Very good",
  "6a": "6a — Excellent",
  "6b": "6b — Excellent",
};

export function TransportSection({ latitude, longitude }: TransportSectionProps) {
  const { data: ptalData, isLoading: ptalLoading } = trpc.transport.getPTAL.useQuery(
    { latitude, longitude },
    { staleTime: 86400000 } // 24h
  );

  const { data: journeyData } = trpc.transport.getJourneyTimes.useQuery(
    { latitude, longitude },
    { staleTime: 86400000 }
  );

  if (ptalLoading) return <IntelligenceSkeleton rows={4} />;

  return (
    <div className="space-y-2">
      {/* PTAL Score */}
      {ptalData && (
        <IntelligenceDataRow
          label="PTAL Score"
          value={PTAL_LABELS[ptalData.score] ?? ptalData.score}
          valueColor={
            ptalData.numericScore >= 5 ? "text-emerald-400" :
            ptalData.numericScore >= 3 ? "text-amber-400" :
            "text-red-400"
          }
        />
      )}

      {/* Journey Times */}
      {journeyData && journeyData.journeys.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-land-muted mb-1">Journey Times</p>
          {journeyData.journeys.map((j: { destination: string; minutes: number }) => (
            <IntelligenceDataRow
              key={j.destination}
              label={j.destination}
              value={`${j.minutes} min`}
            />
          ))}
        </div>
      )}

      {!ptalData && !journeyData && (
        <IntelligenceUnavailable message="Transport data not available for this location" />
      )}
    </div>
  );
}
