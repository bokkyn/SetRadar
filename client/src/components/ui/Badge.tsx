import type { ReactNode } from "react";
import type { LocationStatus } from "../../types/location";

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-ink-800 px-2.5 py-1 text-[12px] text-fog-300">
      {children}
    </span>
  );
}

const statusStyles: Record<LocationStatus, string> = {
  researching: "text-fog-300 border-line",
  shortlisted: "text-amber-signal border-amber-signal/40",
  contacted: "text-status-likely border-status-likely/40",
  approved: "text-status-confirmed border-status-confirmed/40",
  rejected: "text-status-restricted border-status-restricted/40",
};

export function LocationStatusBadge({ status }: { status: LocationStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-ink-900/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${statusStyles[status]}`}
    >
      {label}
    </span>
  );
}
