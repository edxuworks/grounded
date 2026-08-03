/**
 * LocationIntelligenceBoard — Intelligence Tab Container
 *
 * Renders collapsible sections of location intelligence data, each independently
 * loaded via its own tRPC query keyed to the deal's coordinates/postcode.
 *
 * Each section handles its own loading/error/empty states independently,
 * so one failing API doesn't block the others.
 */

import { PlanningSection } from "./PlanningSection";
import { CrimeSection } from "./CrimeSection";
import { EnvironmentSection } from "./EnvironmentSection";
import { PropertySection } from "./PropertySection";
import { BroadbandSection } from "./BroadbandSection";
import { TransportSection } from "./TransportSection";

interface LocationIntelligenceBoardProps {
  latitude: number;
  longitude: number;
  address: string;
}

export function LocationIntelligenceBoard({
  latitude,
  longitude,
  address,
}: LocationIntelligenceBoardProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-land-muted">
        Location intelligence auto-populated from public UK data sources.
      </p>

      <IntelligenceSection title="Planning" defaultOpen>
        <PlanningSection latitude={latitude} longitude={longitude} />
      </IntelligenceSection>

      <IntelligenceSection title="Environment" defaultOpen>
        <EnvironmentSection latitude={latitude} longitude={longitude} />
      </IntelligenceSection>

      <IntelligenceSection title="Crime">
        <CrimeSection latitude={latitude} longitude={longitude} />
      </IntelligenceSection>

      <IntelligenceSection title="Transport">
        <TransportSection latitude={latitude} longitude={longitude} />
      </IntelligenceSection>

      <IntelligenceSection title="Property">
        <PropertySection latitude={latitude} longitude={longitude} address={address} />
      </IntelligenceSection>

      <IntelligenceSection title="Broadband">
        <BroadbandSection address={address} />
      </IntelligenceSection>
    </div>
  );
}

// ── Collapsible Section Wrapper ──────────────────────────────────────────────

interface IntelligenceSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function IntelligenceSection({ title, defaultOpen = false, children }: IntelligenceSectionProps) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex items-center justify-between cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
        <span className="text-xs font-medium text-land-text uppercase tracking-wider">
          {title}
        </span>
        <span className="text-land-muted text-xs group-open:rotate-90 transition-transform">
          ▸
        </span>
      </summary>
      <div className="mt-2 pl-1">
        {children}
      </div>
    </details>
  );
}
