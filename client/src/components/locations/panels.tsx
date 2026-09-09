import { useEffect, useState } from "react"
import type { Location } from "../../types/location"
import type { Verification } from "../../types/common"
import type {
  SunTiming,
  WeatherForecast,
  WeatherRisk,
} from "../../types/weather"
import StatusBadge from "../ui/StatusBadge"
import { formatDistance, formatTravel } from "../../utils/formatting"
import { formatShootDate, isPastShoot } from "../../utils/dates"
import { useAuth } from "../../app/auth"
import { getForecast, type WeatherResult } from "../../services/weatherService"

function PanelHeader({ label }: { label: string }) {
  return (
    <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fog-500">
      {label}
    </h3>
  )
}

const riskStyle: Record<WeatherRisk, string> = {
  low: "text-status-confirmed",
  moderate: "text-status-likely",
  high: "text-status-restricted",
}

function semanticStatus(value: string, fallback: Verification): Verification {
  const normalized = value.toLowerCase()
  if (/(open|available|confirmed|approved|yes|ok)/.test(normalized))
    return "confirmed"
  if (/(restricted|forbidden|prohibited|closed|no)/.test(normalized))
    return "restricted"
  if (/(likely|required|permit)/.test(normalized)) return "likely"
  return fallback
}

function localDateValue(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function localTimeValue(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`
}

function isCompleteDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00`)
  return !Number.isNaN(date.getTime()) && localDateValue(date) === value
}

export function WeatherPanel({
  location,
  shootDate,
  onWeatherResult,
}: {
  location: Location
  shootDate?: string
  onWeatherResult?: (result: WeatherResult | null) => void
}) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null)
  const [selectedDate, setSelectedDate] = useState(() =>
    shootDate && isCompleteDate(shootDate) ? shootDate : localDateValue(),
  )
  const [startTime, setStartTime] = useState(() => localTimeValue())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!isCompleteDate(selectedDate)) {
      setWeather(null)
      onWeatherResult?.(null)
      return
    }
    let active = true
    setLoading(true)
    setError("")
    getForecast(location, selectedDate, startTime || undefined)
      .then((result) => {
        if (active) {
          setWeather(result.forecast)
          onWeatherResult?.(result)
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          console.error(
            "[SetRadar weather] Forecast unavailable in WeatherPanel",
            {
              locationId: location.id,
              location: location.name,
              selectedDate,
              startTime,
              reason,
            },
          )
          setWeather(null)
          onWeatherResult?.(null)
          setError(
            reason instanceof Error ? reason.message : "Weather unavailable.",
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [
    location.id,
    location.geo?.latitude,
    location.geo?.longitude,
    location.city,
    location.region,
    selectedDate,
    startTime,
    onWeatherResult,
  ])

  const completeDate = isCompleteDate(selectedDate)
  const past = completeDate && isPastShoot(selectedDate)

  const rows = [
    weather?.temperatureC === undefined
      ? null
      : ["Temperature", `${weather.temperatureC}°C`],
    weather?.rainProbability === undefined
      ? null
      : ["Rain / precipitation probability", `${weather.rainProbability}%`],
    weather?.windKph === undefined ? null : ["Wind", `${weather.windKph} km/h`],
    weather?.cloudCover === undefined
      ? null
      : ["Cloud cover", `${weather.cloudCover}%`],
    weather?.visibilityKm === undefined
      ? null
      : ["Visibility", `${weather.visibilityKm.toFixed(1)} km`],
  ].filter((row): row is [string, string] => row !== null)
  return (
    <div className="rounded-2xl border border-line bg-ink-850 p-5">
      <div className="flex items-center justify-between">
        <PanelHeader
          label={
            completeDate
              ? `Weather · ${formatShootDate(selectedDate)}`
              : "Weather"
          }
        />
        {weather && (
          <span
            className={`font-mono text-[11px] uppercase tracking-wider ${riskStyle[weather.risk]}`}
          >
            {weather.risk} risk · {weather.score}/100
          </span>
        )}
      </div>
      {past && (
        <p className="mb-4 text-sm text-fog-500">
          This date is in the past. You can still change it to plan another
          shoot.
        </p>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="weather-shoot-date"
            className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-fog-600"
          >
            Shoot date
          </label>
          <input
            id="weather-shoot-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 w-full rounded-lg border border-line bg-ink-900 px-2 text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
          />
        </div>
        <div>
          <label
            htmlFor="weather-start-time"
            className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-fog-600"
          >
            Start time
          </label>
          <input
            id="weather-start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-9 w-full rounded-lg border border-line bg-ink-900 px-2 text-[12px] text-fog-100 outline-none focus:border-amber-signal/60"
          />
        </div>
      </div>
      {loading && (
        <p className="mb-4 text-sm text-fog-400">
          Loading forecast…
        </p>
      )}
      {error && (
        <>
          <p className="mb-1 text-sm text-status-restricted">{error}</p>
          <p className="mb-4 text-[11px] text-amber-signal/80">
            Check the date and filming time - forecasts may be unavailable far
            in the past or future.
          </p>
        </>
      )}
      {!loading && !error && weather && (
        <p className="mb-4 text-sm text-fog-300">{weather.summary}</p>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between border-b border-line/60 pb-1.5"
          >
            <dt className="text-[13px] text-fog-500">{k}</dt>
            <dd className="font-mono text-[13px] text-fog-100">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function SunTimeline({
  location,
  sun,
}: {
  location: Location
  sun?: SunTiming
}) {
  const s = sun ?? {}
  const marks = [
    ...(s.sunrise ? [{ t: s.sunrise, label: "Sunrise", key: "sunrise" }] : []),
    ...(s.goldenHourStart
      ? [{ t: s.goldenHourStart, label: "Golden hour", key: "golden" }]
      : []),
    ...(s.sunset ? [{ t: s.sunset, label: "Sunset", key: "sunset" }] : []),
    ...(s.blueHourEnd
      ? [{ t: s.blueHourEnd, label: "Blue hour", key: "blue" }]
      : []),
  ]
  return (
    <div className="rounded-2xl border border-line bg-ink-850 p-5">
      <PanelHeader label="Shoot timing · Sun" />
      {/* Horizontal on desktop, vertical on mobile */}
      <ol className="relative grid grid-cols-1 gap-4 sm:grid-cols-4 sm:gap-0">
        <div className="absolute left-2 top-2 bottom-2 w-px bg-line sm:left-0 sm:right-0 sm:top-2 sm:h-px sm:w-auto" />
        {marks.map((m) => (
          <li
            key={m.key}
            className="relative flex items-center gap-3 sm:flex-col sm:items-center sm:gap-1.5 sm:text-center"
          >
            <span className="z-10 h-3.5 w-3.5 rounded-full border-2 border-amber-signal bg-ink-950" />
            <div>
              <div className="font-mono text-[13px] text-white">{m.t}</div>
              <div className="text-[11px] text-fog-500">{m.label}</div>
            </div>
          </li>
        ))}
      </ol>
      {marks.length === 0 && (
        <p className="text-sm text-fog-500">
          Sun timing will appear after a weather forecast loads.
        </p>
      )}
      {location.alternativeWindow && (
        <div className="mt-5 rounded-xl border border-amber-signal/30 bg-amber-signal/5 p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-signal">
            Better shoot time
          </div>
          <div className="mt-1 text-sm text-fog-100">
            {location.alternativeWindow.label}
          </div>
          <ul className="mt-1.5 space-y-0.5 text-[13px] text-fog-400">
            {location.alternativeWindow.reasons.map((r) => (
              <li key={r}>? {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function ProductionRestrictions({ location }: { location: Location }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-850 p-5">
      <PanelHeader label="Production restrictions" />
      <div className="divide-y divide-line/60">
        {location.restrictions
          .filter((r) => r.key !== "private")
          .map((r) => (
            <details key={r.key} className="group py-2.5">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="text-sm text-fog-200">{r.label}</span>
                <span className="flex items-center gap-2">
                  {semanticStatus(r.value, r.status) === "confirmed" &&
                  r.value.length > 8 ? (
                    <span className="font-mono text-[12px] text-fog-100">
                      {r.value}
                    </span>
                  ) : (
                    <StatusBadge
                      status={semanticStatus(r.value, r.status)}
                      label={r.value}
                    />
                  )}
                  {r.detail && (
                    <span className="flex h-5 w-4 items-center justify-center text-fog-600 transition-transform group-open:rotate-180">
                      ⌄
                    </span>
                  )}
                </span>
              </summary>
              {r.detail && (
                <p className="mt-2 pl-1 text-[13px] leading-relaxed text-fog-500">
                  {r.detail ??
                    "Confirm with the location owner or relevant authority before production."}
                </p>
              )}
            </details>
          ))}
      </div>
    </div>
  )
}

export function LocationLogistics({ location }: { location: Location }) {
  const { preferences } = useAuth()
  const l = location.logistics
  const rows: [string, string, typeof l.vehicleAccess | null][] = [
    [
      "Distance from origin",
      formatDistance(l.distanceKm, preferences.units),
      null,
    ],
    ["Travel time", formatTravel(l.travelMinutes), null],
    ["Vehicle access", "", l.vehicleAccess],
  ]
  return (
    <div className="rounded-2xl border border-line bg-ink-850 p-5">
      <PanelHeader label="Logistics" />
      <dl className="space-y-2.5">
        {rows.map(([k, v, status]) => (
          <div
            key={k}
            className="flex items-center justify-between gap-3 border-b border-line/60 pb-2"
          >
            <dt className="text-[13px] text-fog-500">{k}</dt>
            <dd className="flex items-center gap-2 text-right">
              {v && (
                <span className="font-mono text-[13px] text-fog-100">{v}</span>
              )}
              {status && (
                <StatusBadge
                  status={semanticStatus(status, status)}
                  label={status}
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function LocationSources({ location }: { location: Location }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-line bg-ink-850 p-5">
      <button
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <PanelHeader label="Sources" />
        <span className="text-fog-500">{open ? "⌃" : "⌄"}</span>
      </button>
      {open && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {location.sources.map((s) => (
              <a
                key={s.id}
                href={s.url ?? "#"}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-900 px-2.5 py-1.5 text-[13px] text-fog-300 transition-colors hover:border-fog-500 hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-signal/70" />
                {s.label}
              </a>
            ))}
          </div>
          <p className="mt-3 text-[12px] leading-relaxed text-fog-600">
            Research-derived information and images are attributed to sources.
            Treat uncertain legal or logistical details as leads to verify, not
            confirmed facts.
          </p>
        </>
      )}
    </div>
  )
}
