import type { Location } from "../../types/location";
import ScoreRing from "../ui/ScoreRing";
import { shootabilityVerdict } from "../../utils/shootability";

const LABELS: Record<string, string> = {
  locationFit: "Location fit",
  access: "Access",
  weather: "Weather",
  permits: "Permits",
};

const conflictAccent: Record<string, string> = {
  weather: "text-status-likely",
  permit: "text-status-verify",
  closing: "text-status-restricted",
  travel: "text-status-verify",
  drone: "text-status-restricted",
  historical: "text-status-likely",
  access: "text-status-likely",
};

export default function ShootabilityPanel({
  location,
}: {
  location: Location;
}) {
  return (
    <div className="rounded-2xl border border-amber-signal/20 bg-gradient-to-b from-ink-800 to-ink-850 p-5">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
        Can we actually shoot this?
      </div>
      <div className="flex items-center gap-5">
        <ScoreRing score={location.shootability} />
        <div>
          <div className="font-display text-xl font-bold text-white">
            {shootabilityVerdict(location.shootability)}
          </div>
          <div className="text-[13px] text-fog-500">
            Deterministic score across five production factors
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-2.5">
        {Object.entries(location.breakdown)
          .filter(([key]) => key !== "timing")
          .map(([key, val]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="w-24 text-[13px] text-fog-400">
                {LABELS[key]}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-amber-signal/80"
                  style={{
                    width: `${val}%`,
                    transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              <span className="w-8 text-right font-mono text-[13px] text-fog-100">
                {val}
              </span>
            </div>
          ))}
      </div>

      {location.conflicts.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fog-500">
            Warnings
          </div>
          <ul className="space-y-2">
            {location.conflicts.map((c, i) => (
              <li key={i} className="flex gap-2.5 text-[13px]">
                <span
                  className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${conflictAccent[c.type] ?? "text-fog-400"} bg-current`}
                />
                <span className="text-fog-300">
                  <span
                    className={`font-mono text-[11px] uppercase tracking-wide ${conflictAccent[c.type] ?? "text-fog-400"}`}
                  >
                    {c.type}
                  </span>{" "}
                  - {c.message}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
