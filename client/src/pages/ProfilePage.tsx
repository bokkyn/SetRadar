import { useEffect } from "react";
import { useAuth } from "../app/auth";
import { cacheLocations } from "../services/locationService";
import { Input, Label, Select } from "../components/ui/Field";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import { initials } from "../utils/formatting";
import { formatDistance } from "../utils/formatting";
import { useRouter } from "../app/router";

export default function ProfilePage() {
  const { user, savedLocations, preferences, updatePreferences, toggleSaved } =
    useAuth();
  const { navigate } = useRouter();
  const saved = savedLocations;

  useEffect(() => {
    cacheLocations(savedLocations);
  }, [savedLocations]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 place-items-center rounded-full border border-line bg-ink-800 font-display text-xl font-bold text-amber-signal">
          {initials(user?.name ?? "Guest")}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            {user?.name}
          </h1>
          <p className="text-sm text-fog-500">
            {user?.role} Â· {user?.email}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-ink-850 p-5">
          <h2 className="mb-4 font-mono text-[11px] uppercase tracking-wider text-fog-500">
            Default travel settings
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="home">Home base</Label>
              <Input
                id="home"
                value={preferences.homeBase}
                onChange={(event) =>
                  updatePreferences({ homeBase: event.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="radius">
                Preferred radius (
                {preferences.units === "imperial" ? "mi" : "km"})
              </Label>
              <Input
                id="radius"
                type="number"
                min={preferences.units === "imperial" ? 3 : 5}
                max={preferences.units === "imperial" ? 62 : 100}
                value={
                  preferences.units === "imperial"
                    ? Math.round(preferences.radiusKm * 0.621371)
                    : preferences.radiusKm
                }
                onChange={(event) =>
                  updatePreferences({
                    radiusKm: Math.min(
                      100,
                      Math.max(
                        5,
                        preferences.units === "imperial"
                          ? Math.round(
                              (Number(event.target.value) || 3) / 0.621371,
                            )
                          : Number(event.target.value) || 5,
                      ),
                    ),
                  })
                }
              />
              <p className="mt-1 text-xs text-fog-600">
                {formatDistance(preferences.radiusKm, preferences.units)} per
                search
              </p>
            </div>
            <div>
              <Label htmlFor="units">Preferred units</Label>
              <Select
                id="units"
                value={preferences.units}
                onChange={(event) =>
                  updatePreferences({
                    units: event.target.value as "metric" | "imperial",
                  })
                }
              >
                <option value="metric">Metric (km)</option>
                <option value="imperial">Imperial (mi)</option>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-ink-850 p-5">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fog-500">
            Saved locations
          </h2>
          <p className="mb-4 text-sm leading-relaxed text-fog-500">
            Your personal shortlist, separate from production projects.
          </p>
          {saved.length ? (
            <ul className="space-y-2">
              {saved.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center gap-2 rounded-xl border border-line bg-ink-900 p-3"
                >
                  <button
                    onClick={() => navigate({ name: "location", id: l.id })}
                    className="min-w-0 flex-1 text-left text-sm text-fog-100 hover:text-amber-signal"
                  >
                    {l.name}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${l.name} from saved locations`}
                    title="Remove saved location"
                    onClick={() => toggleSaved(l.id)}
                    className="rounded-md px-2 py-1 text-fog-600 hover:bg-status-restricted/10 hover:text-status-restricted"
                  >
                    Ă—
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No saved locations yet"
              description="Run a Location Scout search and save promising candidates here."
              action={
                <Button size="sm" onClick={() => navigate({ name: "home" })}>
                  Start scouting
                </Button>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
