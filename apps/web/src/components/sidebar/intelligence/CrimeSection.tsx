/**
 * CrimeSection — Police UK Street Crime Data
 *
 * Shows crime summary stats for the deal's location.
 */

import { trpc } from "@/api/trpc";
import {
  IntelligenceDataRow,
  IntelligenceSkeleton,
  IntelligenceError,
  IntelligenceUnavailable,
} from "./IntelligenceDataRow";

interface CrimeSectionProps {
  latitude: number;
  longitude: number;
}

export function CrimeSection({ latitude, longitude }: CrimeSectionProps) {
  const { data, isLoading, error } = trpc.crime.getStreetCrime.useQuery(
    { latitude, longitude },
    { staleTime: 86400000 } // 24h — crime data updates monthly
  );

  if (isLoading) return <IntelligenceSkeleton rows={4} />;
  if (error) return <IntelligenceError message="Crime data unavailable" />;
  if (!data) return <IntelligenceUnavailable />;

  return (
    <div className="space-y-0.5">
      <IntelligenceDataRow
        label="Total Crimes (month)"
        value={data.totalCrimes}
      />
      {data.topCategories.map((cat: { category: string; count: number }) => (
        <IntelligenceDataRow
          key={cat.category}
          label={cat.category}
          value={cat.count}
        />
      ))}
      {data.period && (
        <p className="text-[10px] text-land-muted mt-1">
          Data from {data.period}
        </p>
      )}
    </div>
  );
}
