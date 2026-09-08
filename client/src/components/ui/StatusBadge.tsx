import type { Verification } from "../../types/common";

const map: Record<Verification, { label: string; dot: string; text: string; ring: string }> = {
  confirmed: { label: "Confirmed", dot: "bg-status-confirmed", text: "text-status-confirmed", ring: "border-status-confirmed/30" },
  likely: { label: "Likely", dot: "bg-status-likely", text: "text-status-likely", ring: "border-status-likely/30" },
  verify: { label: "Verify", dot: "bg-status-verify", text: "text-status-verify", ring: "border-status-verify/30" },
  restricted: { label: "Restricted", dot: "bg-status-restricted", text: "text-status-restricted", ring: "border-status-restricted/30" },
};

export default function StatusBadge({ status, label }: { status: Verification; label?: string }) {
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${s.ring} bg-ink-900/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide ${s.text}`}
      title="SetRadar found supporting information, but this should be verified with the location owner or relevant authority before production."
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {label ?? s.label}
    </span>
  );
}
