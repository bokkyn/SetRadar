import { useState } from "react"
import type { ProjectLocation } from "../../types/project"
import type { Scene } from "../../types/scene"
import type { WeatherForecast } from "../../types/weather"
import { getLocationById } from "../../data/mockLocations"
import { useProjects } from "../../app/projects"
import { useRouter } from "../../app/router"
import Button from "../ui/Button"
import ScoreRing from "../ui/ScoreRing"
import { getForecast } from "../../services/weatherService"
import {
  computeShootability,
  shootabilityVerdict,
} from "../../utils/shootability"
import {
  formatShootDateShort,
  shootStatus,
  shootStatusLabel,
} from "../../utils/dates"
import type { ShootStatus } from "../../utils/dates"

interface SceneCheck {
  forecast: WeatherForecast
  score: number
}

const statusTone: Record<ShootStatus, string> = {
  upcoming: "text-amber-signal border-amber-signal/40",
  today: "text-status-confirmed border-status-confirmed/40",
  filmed: "text-fog-500 border-line",
  cancelled: "text-status-restricted border-status-restricted/40",
  postponed: "text-status-verify border-status-verify/40",
}

function ShootPill({
  date,
  override,
}: {
  date?: string
  override?: ShootStatus
}) {
  if (!date && !override)
    return (
      <span className="font-mono text-[11px] text-fog-600">Unscheduled</span>
    )
  const status = date ? shootStatus(date, override) : override!
  return (
    <span
      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${statusTone[status]}`}
    >
      {shootStatusLabel[status]}
    </span>
  )
}

function timeToMinutes(value?: string) {
  if (!value) return undefined
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function weatherWindowMessage(date?: string) {
  if (!date) return "Add a date to check conditions."
  const today = new Date()
  const selected = new Date(`${date}T00:00:00`)
  const latest = new Date(today)
  latest.setHours(0, 0, 0, 0)
  latest.setDate(latest.getDate() + 10)
  if (selected < new Date(`${localDateValue(today)}T00:00:00`))
    return "Weather checks are not available for dates that have already passed. Check the date and filming time."
  if (selected > latest)
    return "Weather checks are available up to 10 days ahead. Check the date and filming time."
  return null
}

function calculateSceneCheck(
  scene: Scene,
  forecast: WeatherForecast,
  location: NonNullable<ReturnType<typeof getLocationById>>,
) {
  const status = scene.shootDate
    ? shootStatus(scene.shootDate, scene.statusOverride)
    : undefined
  const start = timeToMinutes(scene.startTime)
  const goldenHour = timeToMinutes(location.sun?.goldenHourStart) ?? 0
  const sunset = timeToMinutes(location.sun?.sunset) ?? 0
  const blueHourEnd = timeToMinutes(location.sun?.blueHourEnd) ?? 0

  let timing = location.breakdown.timing
  if (start !== undefined) {
    const overlapsTwilight = start >= goldenHour && start <= blueHourEnd
    const isDaylightWindow = start >= goldenHour && start < sunset
    timing = overlapsTwilight ? 92 : isDaylightWindow ? 82 : 68
  }
  if (status === "today") timing = Math.min(100, timing + 4)
  if (status === "filmed") timing = Math.max(0, timing - 20)
  if (status === "cancelled" || status === "postponed")
    timing = Math.max(0, timing - 35)

  const weather = forecast.score ?? 0

  return Math.min(100, computeShootability({
    ...location.breakdown,
    timing,
    weather,
  }) + 10)
}

export default function ProjectLocationUnit({
  projectId,
  pl,
}: {
  projectId: string
  pl: ProjectLocation
}) {
  const { navigate } = useRouter()
  const { addScene, removeLocation, updateScene } = useProjects()
  const location = pl.location ?? getLocationById(pl.locationId)
  const [expanded, setExpanded] = useState(false)
  const [newScene, setNewScene] = useState("")
  const [newSceneNumber, setNewSceneNumber] = useState("")
  const [newSceneDate, setNewSceneDate] = useState("")
  const [newSceneStart, setNewSceneStart] = useState("")
  const [sceneChecks, setSceneChecks] = useState<Record<string, SceneCheck>>({})
  const [checkingSceneId, setCheckingSceneId] = useState<string | null>(null)
  const [sceneErrors, setSceneErrors] = useState<Record<string, string>>({})

  if (!location) return null

  const initials =
    location.name
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "SR"

  const checkSceneConditions = async (scene: Scene) => {
    if (!scene.shootDate) return
    const unavailableMessage = weatherWindowMessage(scene.shootDate)
    if (unavailableMessage) {
      setSceneErrors((current) => ({ ...current, [scene.id]: unavailableMessage }))
      setSceneChecks((current) => {
        const next = { ...current }
        delete next[scene.id]
        return next
      })
      return
    }
    setCheckingSceneId(scene.id)
    setSceneErrors((current) => ({ ...current, [scene.id]: "" }))
    try {
      const result = await getForecast(
        location,
        scene.shootDate,
        scene.startTime,
      )
      const forecast = result.forecast
      if (forecast.score === undefined) {
        setSceneErrors((current) => ({
          ...current,
          [scene.id]:
            "Check the date and filming time - a forecast is not available for this window.",
        }))
        return
      }
      setSceneChecks((current) => ({
        ...current,
        [scene.id]: {
          forecast,
          score: calculateSceneCheck(scene, forecast, location),
        },
      }))
    } catch (error) {
      console.error("[projects] Scene weather check failed", error)
      setSceneErrors((current) => ({
        ...current,
        [scene.id]:
          error instanceof Error
            ? `${error.message} Check the date and filming time if this shoot is far in the past or future.`
            : "Check the date and filming time - weather is unavailable for this window.",
      }))
    } finally {
      setCheckingSceneId(null)
    }
  }

  const nextShoot = pl.scenes
    .filter((s) => s.shootDate && shootStatus(s.shootDate) !== "filmed")
    .sort((a, b) => (a.shootDate! < b.shootDate! ? -1 : 1))[0]

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink-850">
      {/* Header - whole header opens the location detail */}
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <button
          onClick={() => navigate({ name: "location", id: location.id })}
          className="group flex flex-1 items-start gap-4 text-left outline-none"
        >
          {location.images[0] ? (
            <img
              src={location.images[0]}
              alt={location.name}
              className="h-20 w-28 shrink-0 rounded-lg object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none"
                event.currentTarget.nextElementSibling?.removeAttribute(
                  "hidden",
                )
              }}
            />
          ) : null}
          <div
            hidden={Boolean(location.images[0])}
            className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg bg-amber-signal font-display text-xl font-bold text-ink-950"
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-[17px] font-semibold text-white group-hover:text-amber-signal">
                {location.name}
              </h3>
            </div>
            <p className="mt-0.5 text-[13px] text-fog-500">
              {location.city} Â· Shootability {location.shootability}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] text-fog-400">
              <span>
                {(pl.scenes ?? []).length} scene
                {(pl.scenes ?? []).length !== 1 ? "s" : ""}
              </span>
              {nextShoot && (
                <span className="font-mono">
                  Next Â· {formatShootDateShort(nextShoot.shootDate!)}{" "}
                  {nextShoot.startTime || "TBD"}
                </span>
              )}
              {pl.warnings > 0 && (
                <span className="text-status-verify">
                  {pl.warnings} warning{pl.warnings !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </button>
        <button
          type="button"
          aria-label={`Remove ${location.name} from project`}
          title="Remove location from project"
          onClick={() => {
            if (window.confirm(`Remove ${location.name} from this project?`))
              removeLocation(projectId, pl.locationId)
          }}
          className="self-start rounded-lg border border-line px-2.5 py-1.5 text-sm text-fog-500 transition-colors hover:border-status-restricted/50 hover:text-status-restricted"
        >
          Ă—
        </button>
      </div>

      {false && expanded && (
        <div className="border-t border-line bg-ink-900/40 p-4">
          <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-fog-500">
            Scenes at this location
          </div>
          <div className="space-y-2">
            {(pl.scenes ?? []).map((s) => (
              <div
                key={s.id}
                className="rounded-lg border border-line bg-ink-850 p-3"
              >
                <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_1fr_auto_auto_auto_auto]">
                  <label className="sr-only" htmlFor={`scene-number-${s.id}`}>
                    Scene number
                  </label>
                  <input
                    id={`scene-number-${s.id}`}
                    type="number"
                    min="1"
                    value={s.number}
                    onChange={(e) =>
                      updateScene(projectId, pl.locationId, s.id, {
                        number: Number(e.target.value) || 1,
                      })
                    }
                    className="h-8 w-full rounded-md border border-line bg-ink-900 px-2 font-mono text-[12px] text-amber-signal outline-none focus:border-amber-signal/60 sm:w-20"
                    aria-label={`Scene number for ${s.title}`}
                  />
                  <label className="sr-only" htmlFor={`scene-title-${s.id}`}>
                    Scene title
                  </label>
                  <input
                    id={`scene-title-${s.id}`}
                    value={s.title}
                    onChange={(e) =>
                      updateScene(projectId, pl.locationId, s.id, {
                        title: e.target.value,
                      })
                    }
                    className="h-8 min-w-0 rounded-md border border-line bg-ink-900 px-2 text-sm text-fog-100 outline-none focus:border-amber-signal/60"
                    aria-label={`Title for scene ${s.number}`}
                  />
                  <label className="sr-only" htmlFor={`scene-date-${s.id}`}>
                    Shoot date
                  </label>
                  <input
                    id={`scene-date-${s.id}`}
                    type="date"
                    value={s.shootDate ?? ""}
                    onChange={(e) =>
                      updateScene(projectId, pl.locationId, s.id, {
                        shootDate: e.target.value || undefined,
                      })
                    }
                    className="h-8 rounded-md border border-line bg-ink-900 px-2 font-mono text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
                    aria-label={`Shoot date for scene ${s.number}`}
                  />
                  <label className="sr-only" htmlFor={`scene-start-${s.id}`}>
                    Shoot start
                  </label>
                  <input
                    id={`scene-start-${s.id}`}
                    type="time"
                    value={s.startTime ?? ""}
                    onChange={(e) =>
                      updateScene(projectId, pl.locationId, s.id, {
                        startTime: e.target.value || undefined,
                      })
                    }
                    className="h-8 rounded-md border border-line bg-ink-900 px-2 font-mono text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
                    aria-label={`Start time for scene ${s.number}`}
                  />
                  <ShootPill date={s.shootDate} override={s.statusOverride} />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {weatherWindowMessage(s.shootDate) ? (
                    <span className="text-[12px] text-fog-600">
                      {weatherWindowMessage(s.shootDate)}
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={checkingSceneId === s.id}
                      onClick={() => void checkSceneConditions(s)}
                    >
                      {checkingSceneId === s.id
                        ? "Checking..."
                        : "Show weather + score"}
                    </Button>
                  )}
                </div>
                {sceneErrors[s.id] && (
                  <p className="mt-2 text-[12px] text-amber-signal/90">
                    {sceneErrors[s.id]}
                  </p>
                )}
                {sceneChecks[s.id] && (
                  <div className="mt-3 flex flex-col gap-3 border-t border-line/60 pt-3 sm:flex-row sm:items-center">
                    <ScoreRing score={sceneChecks[s.id].score} size={64} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-fog-100">
                        {shootabilityVerdict(sceneChecks[s.id].score)}
                      </div>
                      <div className="mt-1 text-[12px] text-fog-400">
                        {sceneChecks[s.id].forecast.summary}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-fog-500">
                        <span>{sceneChecks[s.id].forecast.temperatureC}Â°C</span>
                        <span>
                          {sceneChecks[s.id].forecast.rainProbability}% rain
                        </span>
                        <span>
                          {sceneChecks[s.id].forecast.windKph} km/h wind
                        </span>
                        <span>{sceneChecks[s.id].forecast.risk} risk</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <form
            className="mt-3 grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_auto_auto_auto_auto]"
            onSubmit={(e) => {
              e.preventDefault()
              if (!newScene.trim()) return
              const num =
                Number(newSceneNumber) ||
                (pl.scenes.reduce((m, s) => Math.max(m, s.number), 0) || 0) + 1
              addScene(projectId, pl.locationId, {
                number: num,
                title: newScene.trim(),
                shootDate: newSceneDate || undefined,
                startTime: newSceneStart || undefined,
              })
              setNewScene("")
              setNewSceneNumber("")
              setNewSceneDate("")
              setNewSceneStart("")
            }}
          >
            <input
              type="number"
              min="1"
              value={newSceneNumber}
              onChange={(e) => setNewSceneNumber(e.target.value)}
              placeholder="#"
              className="h-9 rounded-lg border border-line bg-ink-900 px-3 font-mono text-sm text-fog-100 placeholder:text-fog-600 outline-none focus:border-amber-signal/60"
              aria-label="New scene number"
            />
            <input
              value={newScene}
              onChange={(e) => setNewScene(e.target.value)}
              placeholder="Add scene - e.g. Rooftop approach"
              className="h-9 flex-1 rounded-lg border border-line bg-ink-900 px-3 text-sm text-fog-100 placeholder:text-fog-600 outline-none focus:border-amber-signal/60"
            />
            <input
              type="date"
              value={newSceneDate}
              onChange={(e) => setNewSceneDate(e.target.value)}
              className="h-9 rounded-lg border border-line bg-ink-900 px-2 font-mono text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
              aria-label="New scene date"
            />
            <input
              type="time"
              value={newSceneStart}
              onChange={(e) => setNewSceneStart(e.target.value)}
              className="h-9 rounded-lg border border-line bg-ink-900 px-2 font-mono text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
              aria-label="New scene start time"
            />
            <Button size="sm" type="submit">
              + Add scene
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
