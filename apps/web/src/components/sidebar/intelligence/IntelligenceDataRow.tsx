/**
 * IntelligenceDataRow — Shared row component for intelligence sections.
 * Displays a label/value pair in a consistent format.
 */

interface IntelligenceDataRowProps {
  label: string;
  value: string | number | null | undefined;
  /** Optional colour class for the value (e.g. "text-emerald-400" for positive) */
  valueColor?: string;
}

export function IntelligenceDataRow({ label, value, valueColor }: IntelligenceDataRowProps) {
  return (
    <div className="flex justify-between items-start gap-2 py-1">
      <span className="text-xs text-land-muted shrink-0">{label}</span>
      <span className={`text-xs text-right ${valueColor ?? "text-land-text"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

/** Loading skeleton for an intelligence section */
export function IntelligenceSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3 w-24 bg-white/5 rounded" />
          <div className="h-3 w-16 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Error state for an intelligence section */
export function IntelligenceError({ message }: { message?: string }) {
  return (
    <div className="px-2 py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg">
      <p className="text-xs text-red-400">{message ?? "Data unavailable"}</p>
    </div>
  );
}

/** Empty/unavailable state */
export function IntelligenceUnavailable({ message }: { message?: string }) {
  return (
    <p className="text-xs text-land-muted italic">
      {message ?? "No data available for this location"}
    </p>
  );
}
