import type { Location } from "../types/location"

import type { SunTiming, WeatherForecast, WeatherRisk } from "../types/weather"

type OpenMeteoResponse = {
  latitude?: number
  longitude?: number
  timezone?: string
  hourly_units?: Record<string, string>
  hourly?: {
    time?: string[]

    temperature_2m?: Array<number | null>

    precipitation_probability?: Array<number | null>

    wind_speed_10m?: Array<number | null>

    cloud_cover?: Array<number | null>

    visibility?: Array<number | null>
    precipitation?: Array<number | null>
  }

  daily?: {
    sunrise?: string[]

    sunset?: string[]
  }
  reason?: string
  error?: boolean
}

type GeocodingResponse = {
  results?: Array<{
    latitude?: number
    longitude?: number
    name?: string
    country?: string
  }>
}

export type WeatherResult = {
  forecast: WeatherForecast

  sun: SunTiming
}

const valueAt = (values: Array<number | null> | undefined, index: number) => {
  const value = values?.[index]

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function addMinutes(value: string | undefined, minutes: number) {
  if (!value) return undefined

  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return undefined

  const totalMinutes =
    (Number(match[1]) * 60 + Number(match[2]) + minutes + 24 * 60) % (24 * 60)
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(
    totalMinutes % 60,
  ).padStart(2, "0")}`
}

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

function isPastDate(value: string) {
  return value < localDateValue()
}

const geocodeCache = new Map<string, { latitude: number longitude: number }>()

async function resolveCoordinates(location: Location) {
  const current = location.geo
  if (
    current &&
    Number.isFinite(current.latitude) &&
    Number.isFinite(current.longitude) &&
    current.latitude !== 0 &&
    current.longitude !== 0
  ) {
    return current
  }

  const query = [location.city, location.region].filter(Boolean).join(", ")
  if (!query) {
    throw new Error(
      "Weather is unavailable because this location has no valid coordinates or city.",
    )
  }

  const cached = geocodeCache.get(query.toLowerCase())
  if (cached) return cached

  const params = new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  })
  const url = `https://geocoding-api.open-meteo.com/v1/search?${params}`
  console.info("[SetRadar weather] Resolving missing coordinates", {
    locationId: location.id,
    location: location.name,
    query,
    url,
  })
  const response = await fetch(url)
  if (!response.ok) {
    console.error("[SetRadar weather] Coordinate geocoding failed", {
      query,
      status: response.status,
    })
    throw new Error(`Location geocoding returned ${response.status}.`)
  }
  const data = (await response.json()) as GeocodingResponse
  const result = data.results?.[0]
  if (
    !result ||
    typeof result.latitude !== "number" ||
    typeof result.longitude !== "number"
  ) {
    console.error("[SetRadar weather] Coordinate geocoding returned no match", {
      query,
      results: data.results,
    })
    throw new Error(`Could not resolve coordinates for ${query}.`)
  }
  const resolved = { latitude: result.latitude, longitude: result.longitude }
  geocodeCache.set(query.toLowerCase(), resolved)
  console.info("[SetRadar weather] Coordinates resolved", {
    query,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    matchedName: result.name,
    matchedCountry: result.country,
  })
  return resolved
}

function weatherScore(values: {
  rain?: number

  wind?: number

  cloud?: number

  temperature?: number
}) {
  const rainPenalty = (values.rain ?? 0) * 0.65

  const windPenalty = Math.min(20, Math.max(0, values.wind ?? 0) * 0.45)

  const cloudPenalty = Math.min(12, Math.max(0, values.cloud ?? 0) * 0.12)

  const temperaturePenalty =
    values.temperature === undefined
      ? 0
      : Math.min(5, Math.abs(values.temperature - 20) * 0.25)

  return Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 - rainPenalty - windPenalty - cloudPenalty - temperaturePenalty,
      ),
    ),
  )
}

export async function getForecast(
  location: Location,

  shootDate: string,

  startTime?: string,
): Promise<WeatherResult> {
  if (!shootDate) {
    throw new Error("Select a shoot date to load weather.")
  }

  const coordinates = await resolveCoordinates(location)
  const latitude = coordinates.latitude
  const longitude = coordinates.longitude
  const archive = isPastDate(shootDate)
  const endpoint = archive
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast"
  const params = new URLSearchParams({
    latitude: String(latitude),

    longitude: String(longitude),

    hourly:
      "temperature_2m,precipitation_probability,wind_speed_10m,cloud_cover,visibility",

    daily: "sunrise,sunset",

    timezone: "auto",

    start_date: shootDate,

    end_date: shootDate,
  })

  const requestUrl = `${endpoint}?${params}`
  console.info("[SetRadar weather] Requesting forecast", {
    locationId: location.id,
    location: location.name,
    city: location.city,
    region: location.region,
    latitude,
    longitude,
    shootDate,
    requestedStartTime: startTime ?? "12:00",
    endpoint: archive ? "Open-Meteo archive" : "Open-Meteo forecast",
    url: requestUrl,
  })
  const response = await fetch(requestUrl)

  if (!response.ok) {
    const body = await response.text()
    console.error("[SetRadar weather] Open-Meteo request failed", {
      status: response.status,
      body,
      requestUrl,
    })
    throw new Error(`Weather service returned ${response.status}.`)
  }

  const data = (await response.json()) as OpenMeteoResponse
  console.info("[SetRadar weather] Open-Meteo response", {
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone,
    hourlyCount: data.hourly?.time?.length ?? 0,
    firstHour: data.hourly?.time?.[0],
    lastHour: data.hourly?.time?.at(-1),
    dailySunrise: data.daily?.sunrise?.[0],
    dailySunset: data.daily?.sunset?.[0],
    availableHourlyFields: Object.keys(data.hourly ?? {}),
    reason: data.reason,
  })

  const hour = `${(startTime || "12:00").slice(0, 2)}:00`

  const index =
    data.hourly?.time?.findIndex(
      (time) => time === `${shootDate}T${hour}` || time.endsWith(`T${hour}`),
    ) ?? -1

  console.info("[SetRadar weather] Matching hourly forecast", {
    requestedStartTime: startTime ?? "12:00",
    matchedHour: hour,
    matchedIndex: index,
    matchedTimestamp: index >= 0 ? data.hourly?.time?.[index] : undefined,
  })

  if (index < 0) {
    console.warn("[SetRadar weather] No hourly forecast matched", {
      requestedDate: shootDate,
      requestedStartTime: startTime,
      availableHours: data.hourly?.time?.slice(0, 5),
    })
    throw new Error("Weather forecast is unavailable for that time.")
  }

  const temperatureC = valueAt(data.hourly?.temperature_2m, index)

  const rainProbability = valueAt(data.hourly?.precipitation_probability, index)

  const windKph = valueAt(data.hourly?.wind_speed_10m, index)

  const cloudCover = valueAt(data.hourly?.cloud_cover, index)

  const visibilityKm = valueAt(data.hourly?.visibility, index)
  if (temperatureC === undefined || windKph === undefined) {
    console.error(
      "[SetRadar weather] Open-Meteo returned incomplete weather data",
      {
        temperatureC,
        rainProbability,
        windKph,
        cloudCover,
        visibilityKm,
        archive,
      },
    )
    throw new Error(
      "Open-Meteo returned incomplete weather data for that time.",
    )
  }

  const score = weatherScore({
    rain: rainProbability,

    wind: windKph,

    cloud: cloudCover,

    temperature: temperatureC,
  })

  const risk: WeatherRisk =
    score >= 75 ? "low" : score >= 50 ? "moderate" : "high"

  const sunrise = data.daily?.sunrise?.[0]?.split("T")[1]

  const sunset = data.daily?.sunset?.[0]?.split("T")[1]

  return {
    forecast: {
      temperatureC,

      rainProbability,

      windKph,

      cloudCover,

      visibilityKm:
        visibilityKm === undefined ? undefined : visibilityKm / 1000,

      risk,

      score,

      summary: `Forecast for ${shootDate} at ${hour}.`,
    },

    sun: {
      sunrise,
      goldenHourStart: addMinutes(sunset, -60),

      sunset,

      blueHourEnd: addMinutes(sunset, 30),
    },
  }
}
