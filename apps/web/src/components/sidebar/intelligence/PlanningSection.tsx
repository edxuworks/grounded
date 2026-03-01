/**
 * PlanningSection — Planning Constraints + Applications
 *
 * Shows MHCLG planning constraint data and PlanIt planning applications
 * for the deal's location.
 */

import { trpc } from "@/api/trpc";
import {
  IntelligenceDataRow,
  IntelligenceSkeleton,
  IntelligenceError,
  IntelligenceUnavailable,
} from "./IntelligenceDataRow";

interface PlanningSectionProps {
  latitude: number;
  longitude: number;
}

export function PlanningSection({ latitude, longitude }: PlanningSectionProps) {
  const { data, isLoading, error } = trpc.planning.getConstraints.useQuery(
    { latitude, longitude },
    { staleTime: 86400000 } // 24h
  );

  const { data: apps } = trpc.planning.getApplications.useQuery(
    { latitude, longitude, radius: 500 },
    { staleTime: 86400000 }
  );

  if (isLoading) return <IntelligenceSkeleton rows={5} />;
  if (error) return <IntelligenceError message="Planning data unavailable" />;
  if (!data) return <IntelligenceUnavailable />;

  return (
    <div className="space-y-3">
      {/* Constraints */}
      <div className="space-y-0.5">
        <IntelligenceDataRow
          label="Conservation Area"
          value={data.conservationArea ? "Yes" : "No"}
          valueColor={data.conservationArea ? "text-amber-400" : "text-land-text"}
        />
        <IntelligenceDataRow
          label="Article 4 Direction"
          value={data.article4 ? "Restricted" : "None"}
          valueColor={data.article4 ? "text-amber-400" : "text-land-text"}
        />
        <IntelligenceDataRow
          label="Listed Buildings (200m)"
          value={data.listedBuildingsCount}
        />
        <IntelligenceDataRow
          label="Green Belt"
          value={data.greenBelt ? "Yes" : "No"}
          valueColor={data.greenBelt ? "text-amber-400" : "text-land-text"}
        />
        <IntelligenceDataRow
          label="Brownfield"
          value={data.brownfield ? "Yes" : "No"}
        />
      </div>

      {/* Recent Applications */}
      {apps && apps.applications.length > 0 && (
        <div>
          <p className="text-xs font-medium text-land-muted mb-1.5">
            Recent Applications ({apps.applications.length})
          </p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto styled-scrollbar">
            {apps.applications.slice(0, 5).map((app: { id: string; description: string; status: string; date: string }) => (
              <div
                key={app.id}
                className="px-2 py-1.5 bg-white/3 rounded-lg"
              >
                <p className="text-xs text-land-text truncate">{app.description}</p>
                <div className="flex justify-between mt-0.5">
                  <span className={`text-[10px] ${
                    app.status === "Approved" ? "text-emerald-400" :
                    app.status === "Refused" ? "text-red-400" :
                    "text-amber-400"
                  }`}>
                    {app.status}
                  </span>
                  <span className="text-[10px] text-land-muted">{app.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
