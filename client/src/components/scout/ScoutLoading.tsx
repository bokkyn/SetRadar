import { useEffect, useState } from "react";
import { scoutStages } from "../../services/scoutService";

export default function ScoutLoading() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setStage((s) => Math.min(s + 1, scoutStages.length - 1)),
      640,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center py-14">
      <div className="relative grid h-24 w-24 place-items-center">
        <div className="absolute inset-0 rounded-full border border-amber-signal/20" />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(224,169,74,0.35), transparent 55%)",
            animation: "sr-sweep 1.6s linear infinite",
          }}
        />
        <div className="h-2 w-2 rounded-full bg-amber-signal" />
      </div>
      <h3 className="mt-6 font-display text-lg font-semibold text-white">
        Researching locations…
      </h3>
      <ul className="mt-4 space-y-2">
        {scoutStages.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              className={`grid h-4 w-4 place-items-center rounded-full border text-[9px] ${
                i < stage
                  ? "border-status-confirmed bg-status-confirmed/15 text-status-confirmed"
                  : i === stage
                    ? "border-amber-signal text-amber-signal"
                    : "border-line text-fog-600"
              }`}
            >
              {i < stage ? "✓" : ""}
            </span>
            <span className={i <= stage ? "text-fog-100" : "text-fog-600"}>
              {s}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
