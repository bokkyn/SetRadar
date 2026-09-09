import { forwardRef, useEffect, useState } from "react"
import Button from "../ui/Button"
import { Input, Label, Select } from "../ui/Field"
import ScoutLoading from "./ScoutLoading"
import { findLocations } from "../../services/scoutService"
import { PROJECT_TYPES, SCENE_TYPES } from "../../data/searchOptions"
import type { ProductionType } from "../../types/project"
import type { ScoutQuery } from "../../types/research"
import { useRouter } from "../../app/router"
import { useAuth } from "../../app/auth"

/**
 * Shared location-search form used by both Discover (home) and Research's
 * "Find Locations" mode. This is the single source of truth for the common
 * search fields - edits here appear in every consumer.
 */
const LocationScout = forwardRef<HTMLDivElement, { initialPrompt?: string }>(
  ({ initialPrompt }, ref) => {
    const { navigate } = useRouter()
    const { user, preferences } = useAuth()
    const [prompt, setPrompt] = useState(initialPrompt ?? "")
    const [location, setLocation] = useState(preferences.homeBase)
    const [radiusKm, setRadiusKm] = useState(preferences.radiusKm)
    const [projectType, setProjectType] =
      useState<ProductionType>("Feature Film")
    const [advanced, setAdvanced] = useState(false)
    const [sceneTypes, setSceneTypes] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const promptExamples = [
      "Abandoned industrial warehouse near New York for a sci-fi night scene",
      "Concrete modernist housing estate with open courtyards",
      "Quiet waterfront street with weathered warehouses and loading access",
      "Brutalist civic building with dramatic stairs and deep shadows",
    ]
    const [promptExampleIndex, setPromptExampleIndex] = useState(0)
    const [typedPlaceholder, setTypedPlaceholder] = useState("")

    useEffect(() => {
      if (prompt || initialPrompt) return
      const example = promptExamples[promptExampleIndex]
      let cursor = 0
      setTypedPlaceholder("")
      const timer = window.setInterval(() => {
        cursor += 1
        setTypedPlaceholder(example.slice(0, cursor))
        if (cursor >= example.length) {
          window.clearInterval(timer)
          window.setTimeout(
            () =>
              setPromptExampleIndex(
                (current) => (current + 1) % promptExamples.length,
              ),
            1400,
          )
        }
      }, 35)
      return () => window.clearInterval(timer)
    }, [initialPrompt, prompt, promptExampleIndex])

    const toggleScene = (t: string) =>
      setSceneTypes((prev) =>
        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
      )

    const run = async () => {
      const trimmedPrompt = prompt.trim()
      const trimmedLocation = location.trim()
      if (!trimmedLocation) {
        setError("Tell me which city to scout first.")
        return
      }
      if (!trimmedPrompt) {
        setError("Describe the scene you want to film first.")
        return
      }
      if (
        /[^aeiou]{5,}/i.test(trimmedLocation) ||
        /^(atlantis|gotham|hogwarts|wakanda|narnia)$/i.test(trimmedLocation)
      ) {
        setError("That city does not exist in the real world.")
        return
      }
      if (trimmedPrompt.length < 10) {
        setError("Describe the scene or location in at least 10 characters.")
        return
      }
      const offTopicMessage =
        /\b(capital|president|population|who is|where is|when was|what is)\b/i.test(
          trimmedPrompt,
        )
          ? "That sounds like an atlas question, not a location brief. Try describing the scene you want to shoot."
          : /\b(convert|how long is|how many|miles|kilometers|km|calories|currency)\b/i.test(
                trimmedPrompt,
              )
            ? "I scout places, I do not convert units. Bring me a shootable scene and I will bring you locations."
            : /\b(code|program|programming|debug|equation|calculate|math|solve)\b/i.test(
                  trimmedPrompt,
                )
              ? "My calculator is on a coffee break. Describe a film, TV, or video scene instead."
              : /\b(advice|loan|credit|investment|relationship|therapy)\b/i.test(
                    trimmedPrompt,
                  )
                ? "That belongs with a qualified adviser, not a location scout. I find places to film."
                : ""
      if (offTopicMessage) {
        setError(offTopicMessage)
        return
      }
      if (
        (/\bindoor\b/i.test(trimmedPrompt) &&
          /\boutdoor\b/i.test(trimmedPrompt)) ||
        (/\bmodern(?:istic)?\b/i.test(trimmedPrompt) &&
          /\brural\b/i.test(trimmedPrompt))
      ) {
        setError(
          "Those requirements conflict. How should modernistic and rural both apply here?",
        )
        return
      }
      if (
        /\b(code|programming|write a poem|translate|weather forecast)\b/i.test(
          trimmedPrompt,
        )
      ) {
        setError(
          "This tool is for filming locations, scenes, and production requirements.",
        )
        return
      }
      setError("")
      setLoading(true)
      try {
        const query: ScoutQuery = {
          prompt,
          location,
          radiusKm,
          projectType,
          sceneTypes,
        }
        const result = await findLocations(query)
        if (!result.locations.length) throw new Error("empty")
        navigate({ name: "results", result })
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "We couldn't complete this research. Try adjusting your search.",
        )
      } finally {
        setLoading(false)
      }
    }

    return (
      <div
        ref={ref}
        className="rounded-3xl border border-line bg-ink-850/80 p-5 shadow-2xl sm:p-7"
      >
        {loading ? (
          <ScoutLoading />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
                Location Scout
              </span>
              <span className="font-mono text-[11px] text-fog-600">
                Scene → real locations
              </span>
            </div>

            <Label htmlFor="scout-prompt">
              Describe the scene or location you're looking for
            </Label>
            <textarea
              id="scout-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-line bg-ink-900 p-3.5 text-[15px] leading-relaxed text-fog-100 placeholder:text-fog-600 outline-none transition-colors focus:border-amber-signal/60"
              placeholder={
                typedPlaceholder ||
                "Describe the place your production needs..."
              }
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="loc">Location</Label>
                <Input
                  id="loc"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="rad">
                  Radius ·{" "}
                  {preferences.units === "imperial"
                    ? `${(radiusKm * 0.621371).toFixed(0)} mi`
                    : `${radiusKm} km`}
                </Label>
                <input
                  id="rad"
                  type="range"
                  min={preferences.units === "imperial" ? 3 : 5}
                  max={preferences.units === "imperial" ? 62 : 100}
                  value={
                    preferences.units === "imperial"
                      ? Math.round(radiusKm * 0.621371)
                      : radiusKm
                  }
                  onChange={(e) => {
                    const value = Number(e.target.value)
                    setRadiusKm(
                      preferences.units === "imperial"
                        ? Math.round(value / 0.621371)
                        : value,
                    )
                  }}
                  className="mt-3 w-full accent-amber-signal"
                />
              </div>
            </div>

            {/* Collapsed secondary filters */}
            <div className="mt-4 border-t border-line pt-4">
              <button
                onClick={() => setAdvanced((v) => !v)}
                aria-expanded={advanced}
                className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-wider text-fog-500 transition-colors hover:text-fog-200"
              >
                <span
                  className={`transition-transform ${
                    advanced ? "rotate-90" : ""
                  }`}
                >
                      ⌢
                </span>
                Additional settings
              </button>

              {advanced && (
                <div className="mt-4 space-y-4">
                  <div className="sm:max-w-xs">
                    <Label htmlFor="ptype">Project type</Label>
                    <Select
                      id="ptype"
                      value={projectType}
                      onChange={(e) =>
                        setProjectType(e.target.value as ProductionType)
                      }
                    >
                      {PROJECT_TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label>Scene type · optional</Label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSceneTypes([])}
                        className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
                          sceneTypes.length === 0
                            ? "border-amber-signal/50 bg-amber-signal/10 text-amber-signal"
                            : "border-line text-fog-400 hover:text-white"
                        }`}
                      >
                        Any
                      </button>
                      {SCENE_TYPES.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggleScene(t)}
                          className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
                            sceneTypes.includes(t)
                              ? "border-amber-signal/50 bg-amber-signal/10 text-amber-signal"
                              : "border-line text-fog-400 hover:text-white"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-status-restricted/40 bg-status-restricted/10 p-3 text-sm text-status-restricted">
                {error}
              </div>
            )}

            <div className="mt-5">
              <Button size="lg" onClick={run}>
                Find locations
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M3 8h9M8 4l4 4-4 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Button>
            </div>
          </>
        )}
      </div>
    )
  },
)

LocationScout.displayName = "LocationScout"
export default LocationScout
