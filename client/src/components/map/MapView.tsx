import { useMemo } from "react";
import type { MapLocation } from "../../types/location";

export default function MapView({
  locations,
  activeId,
  onSelect,
  onHover,
}: {
  locations: MapLocation[];
  activeId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  const projected = useMemo(() => {
    const lats = locations.map((l) => l.latitude);
    const lngs = locations.map((l) => l.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1;
    const spanLng = maxLng - minLng || 1;
    return locations.map((l) => ({
      ...l,
      x: 14 + ((l.longitude - minLng) / spanLng) * 72,
      y: 16 + ((maxLat - l.latitude) / spanLat) * 68,
    }));
  }, [locations]);

  return (
    <div className="relative h-full w-full bg-ink-900">
      {/* Cartographic grid + faint terrain wash - static, no animation */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(35,40,47,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(35,40,47,0.7) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(35,40,47,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(35,40,47,0.4) 1px, transparent 1px)",
          backgroundSize: "12px 12px",
        }}
      />

      {/* Connecting lines between candidates for spatial reference */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {projected.map((a, i) =>
          projected.slice(i + 1).map((b) => (
            <line
              key={`${a.id}-${b.id}`}
              x1={`${a.x}%`}
              y1={`${a.y}%`}
              x2={`${b.x}%`}
              y2={`${b.y}%`}
              stroke="rgba(138,146,156,0.14)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          )),
        )}
      </svg>

      {projected.map((m) => {
        const active = m.id === activeId;
        return (
          <button
            key={m.id}
            onClick={() => onSelect?.(m.id)}
            onMouseEnter={() => onHover?.(m.id)}
            onMouseLeave={() => onHover?.(null)}
            className="group absolute -translate-x-1/2 -translate-y-1/2 outline-none focus-visible:ring-2 focus-visible:ring-amber-signal/70 rounded-full"
            style={{ left: `${m.x}%`, top: `${m.y}%`, zIndex: active ? 20 : 10 }}
            aria-label={`${m.title}, shootability ${m.score}`}
          >
            <span
              className={`grid place-items-center rounded-full border font-mono text-[11px] font-semibold transition-colors duration-150 ${
                active
                  ? "h-9 w-9 border-amber-signal bg-amber-signal text-ink-950"
                  : "h-8 w-8 border-line bg-ink-800 text-fog-100 group-hover:border-amber-signal/60 group-hover:text-white"
              }`}
            >
              {m.score}
            </span>
            <span
              className={`pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-ink-850 px-2 py-1 text-[11px] text-fog-100 transition-opacity ${
                active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              {m.title}
            </span>
          </button>
        );
      })}

      <div className="absolute bottom-3 left-3 rounded-md border border-line bg-ink-950/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-600">
        Marker = shootability
      </div>
    </div>
  );
}
