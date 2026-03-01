/**
 * BroadbandSection — Ofcom Broadband Speed Data
 *
 * Shows broadband availability and speeds for the deal's postcode.
 */

import { trpc } from "@/api/trpc";
import {
  IntelligenceDataRow,
  IntelligenceSkeleton,
  IntelligenceError,
  IntelligenceUnavailable,
} from "./IntelligenceDataRow";

interface BroadbandSectionProps {
  address: string;
}

export function BroadbandSection({ address }: BroadbandSectionProps) {
  const { data, isLoading, error } = trpc.property.getBroadband.useQuery(
    { address },
    { staleTime: 2592000000 } // 30 days
  );

  if (isLoading) return <IntelligenceSkeleton rows={3} />;
  if (error) return <IntelligenceError message="Broadband data unavailable" />;
  if (!data) return <IntelligenceUnavailable />;

  return (
    <div className="space-y-0.5">
      <IntelligenceDataRow
        label="Avg Download"
        value={`${data.avgDownload} Mbps`}
      />
      <IntelligenceDataRow
        label="Avg Upload"
        value={`${data.avgUpload} Mbps`}
      />
      <IntelligenceDataRow
        label="Ultrafast Available"
        value={data.ultrafastAvailable ? "Yes" : "No"}
        valueColor={data.ultrafastAvailable ? "text-emerald-400" : "text-amber-400"}
      />
      {data.maxDownload && (
        <IntelligenceDataRow
          label="Max Download"
          value={`${data.maxDownload} Mbps`}
        />
      )}
    </div>
  );
}
