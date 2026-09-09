import { useState } from "react"

import type { Location } from "../../types/location"

import type { ProjectLocation } from "../../types/project"

import type { Scene } from "../../types/scene"

import type { WeatherForecast } from "../../types/weather"

import { useProjects } from "../../app/projects"

import Button from "../ui/Button"

import ScoreRing from "../ui/ScoreRing"

import { getForecast } from "../../services/weatherService"

import {
  computeShootability,
  shootabilityVerdict,
} from "../../utils/shootability"

import { shootStatus, shootStatusLabel } from "../../utils/dates"

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

function weatherWindowMessage(date?: string) {
  if (!date) return "Add a date to check conditions."
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const selected = new Date(`${date}T00:00:00`)
  const latest = new Date(todayStart)
  latest.setDate(latest.getDate() + 10)
  if (selected < todayStart)
    return "Weather checks are not available for dates that have already passed. Check the date and filming time."
  if (selected > latest)
    return "Weather checks are available up to 10 days ahead. Check the date and filming time."
  return null
}

function calculateSceneCheck(
  scene: Scene,

  forecast: WeatherForecast,

  location: Location,
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

  return Math.min(
    100,
    computeShootability({ ...location.breakdown, timing, weather }) + 10,
  )
}

export default function LocationSceneManager({
  projectId,

  pl,

  location,
}: {
  projectId: string

  pl: ProjectLocation

  location: Location
}) {
  const { addScene, updateScene, deleteScene } = useProjects()

  const [newScene, setNewScene] = useState("")

  const [newSceneNumber, setNewSceneNumber] = useState("")

  const [newSceneDate, setNewSceneDate] = useState("")

  const [newSceneStart, setNewSceneStart] = useState("")

  const [sceneChecks, setSceneChecks] = useState<Record<string, SceneCheck>>({})

  const [checkingSceneId, setCheckingSceneId] = useState<string | null>(null)
  const [sceneErrors, setSceneErrors] = useState<Record<string, string>>({})

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

  return (
    <div className="rounded-2xl border border-line bg-ink-850 p-5">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fog-500">
        Scenes at this location
      </div>
      <div className="space-y-2">
        {(pl.scenes ?? []).length === 0 && (
          <p className="text-sm text-fog-500">
            No scenes added to this project at this location yet.
          </p>
        )}
        {(pl.scenes ?? []).map((s) => (
          <div
            key={s.id}
            className="rounded-lg border border-line bg-ink-900 p-3"
          >
            <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[auto_1fr_auto_auto_auto_auto]">
              <input
                type="number"
                min="1"
                value={s.number}
                onChange={(e) =>
                  updateScene(projectId, pl.locationId, s.id, {
                    number: Number(e.target.value) || 1,
                  })
                }
                className="h-8 w-full rounded-md border border-line bg-ink-850 px-2 font-mono text-[12px] text-amber-signal outline-none focus:border-amber-signal/60 sm:w-20"
                aria-label={`Scene number for ${s.title}`}
              />
              <input
                value={s.title}
                onChange={(e) =>
                  updateScene(projectId, pl.locationId, s.id, {
                    title: e.target.value,
                  })
                }
                className="h-8 min-w-0 rounded-md border border-line bg-ink-850 px-2 text-sm text-fog-100 outline-none focus:border-amber-signal/60"
                aria-label={`Title for scene ${s.number}`}
              />
              <input
                type="date"
                value={s.shootDate ?? ""}
                onChange={(e) =>
                  updateScene(projectId, pl.locationId, s.id, {
                    shootDate: e.target.value || undefined,
                  })
                }
                className="h-8 rounded-md border border-line bg-ink-850 px-2 font-mono text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
                aria-label={`Shoot date for scene ${s.number}`}
              />
              <input
                type="time"
                value={s.startTime ?? ""}
                onChange={(e) =>
                  updateScene(projectId, pl.locationId, s.id, {
                    startTime: e.target.value || undefined,
                  })
                }
                className="h-8 rounded-md border border-line bg-ink-850 px-2 font-mono text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
                aria-label={`Start time for scene ${s.number}`}
              />
              <ShootPill date={s.shootDate} override={s.statusOverride} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-status-restricted hover:bg-status-restricted/10"
                  onClick={() => {
                    if (
                      window.confirm(`Delete scene ${s.number} - ${s.title}?`)
                    ) {
                      deleteScene(projectId, pl.locationId, s.id)

                      setSceneChecks((current) => {
                        const next = { ...current }

                        delete next[s.id]

                        return next
                      })
                    }
                  }}
                >
                  Delete scene
                </Button>
              </div>
              {sceneErrors[s.id] && (
                <p className="mt-2 text-[12px] text-amber-signal/90">
                  {sceneErrors[s.id]}
                </p>
              )}
              {!s.shootDate && (
                <span className="text-[12px] text-fog-600">
                  Add a date to check conditions.
                </span>
              )}
            </div>
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
                    <span>{sceneChecks[s.id].forecast.temperatureC}°C</span>
                    <span>
                      {sceneChecks[s.id].forecast.rainProbability}% rain
                    </span>
                    <span>{sceneChecks[s.id].forecast.windKph} km/h wind</span>
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
          placeholder="Add scene title"
          className="h-9 flex-1 rounded-lg border border-line bg-ink-900 px-3 text-sm text-fog-100 placeholder:text-fog-600 outline-none focus:border-amber-signal/60"
          aria-label="New scene title"
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
  )
}
