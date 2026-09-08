import { useState } from "react"
import type { Location } from "../../types/location"
import Button from "../ui/Button"
import { formatDistance, formatTravel } from "../../utils/formatting"
import { useAuth } from "../../app/auth"

export default function LocationCard({
  location,
  onOpen,
  showLogistics = true,
}: {
  location: Location
  onOpen: () => void
  showLogistics?: boolean
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const initials =
    location.name
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SR"
  const { savedLocationIds, requireAuth, toggleSaved, preferences } = useAuth()
  const saved = savedLocationIds.includes(location.id)

  const save = (e: React.MouseEvent) => {
    e.stopPropagation()
    requireAuth("Save this location to your project", () =>
      toggleSaved(location.id, location),
    )
  }

  return (
    <article
      onClick={onOpen}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen())
      }
      tabIndex={0}
      role="button"
      aria-label={`Open ${location.name}`}
      className="group cursor-pointer overflow-hidden rounded-xl border border-line bg-ink-850 outline-none transition-colors duration-150 hover:border-fog-600/50 focus-visible:ring-2 focus-visible:ring-amber-signal/60"
    >
      <div className="relative aspect-video overflow-hidden bg-ink-800">
        {imageFailed || !location.images[0] ? (
          <div className="flex h-full w-full items-center justify-center bg-ink-900">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-signal font-display text-xl font-bold text-ink-950">
              {initials}
            </div>
          </div>
        ) : (
          <img
            src={location.images[0]}
            alt={`${location.name}, ${location.type} in ${location.city}`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-ink-950/80 via-transparent to-transparent" />
        <span className="absolute left-3 top-3 rounded-md border border-line bg-ink-950/70 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-fog-100">
          {location.type}
        </span>
        <span className="absolute right-3 top-3 rounded-md border border-amber-signal/40 bg-ink-950/80 px-2 py-1 font-mono text-[11px] text-amber-signal">
          {location.shootability}
        </span>
        {showLogistics && (
          <span className="absolute bottom-3 left-3 font-mono text-[11px] text-fog-200">
            {formatDistance(location.logistics.distanceKm, preferences.units)} Â·{" "}
            {formatTravel(location.logistics.travelMinutes)}
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-display text-[17px] font-semibold leading-snug text-white">
          {location.name}
        </h3>
        <p className="mt-0.5 text-[13px] text-fog-500">
          {location.city}, {location.region}
        </p>

        <p className="mt-3 min-h-16 text-[13px] leading-relaxed text-fog-300">
          {location.whyItMatches}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[13px] text-fog-500 transition-colors group-hover:text-amber-signal">
            View details â†’
          </span>
          <Button
            variant={saved ? "secondary" : "outline"}
            size="sm"
            onClick={save}
          >
            {saved ? "Saved âś“" : "Save"}
          </Button>
        </div>
      </div>
    </article>
  )
}
