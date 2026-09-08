import type { Source, Verification } from "../types/common"

import type { Location, ProductionRestriction } from "../types/location"

type BackendImage = string | { url?: string source?: string sourceUrl?: string }

export interface BackendCandidate {
  name: string

  address?: string

  city?: string

  country?: string

  latitude?: number

  longitude?: number

  area?: string

  description?: string

  whyMatches?: string

  matchExplanation?: string

  resemblanceExplanation?: string

  matchScore?: number

  images?: BackendImage[]

  logistics?: {
    distanceKm?: number

    travelTimeMin?: number

    vehicleAccess?: string
  }

  restrictions?: Record<string, { status?: string explanation?: string }>

  scores?: {
    locationFit?: number

    access?: number

    weather?: number

    permits?: number
  }

  keywords?: string[]

  warnings?: Array<string | { message?: string }>

  canWeShootScore?: number

  sources?: Array<{ title?: string url?: string domain?: string }>
}

export async function postBackend<T>(path: string, body: unknown): Promise<T> {
  console.debug("[SetRadar] Backend request", { path })

  const response = await fetch(path, {
    method: "POST",

    headers: { "Content-Type": "application/json" },

    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)

    console.error("[SetRadar] Backend request failed", {
      path,

      status: response.status,

      error,
    })

    throw new Error(
      error?.error?.message || `Backend request failed (${response.status})`,
    )
  }

  return (await response.json()) as T
}

const verification = (value?: string): Verification => {
  if (value === "confirmed" || value === "likely" || value === "restricted")
    return value

  return "verify"
}

function sourcesFor(candidate: BackendCandidate): Source[] {
  const researchSources = (candidate.sources || []).map((source, index) => ({
    id: `backend-source-${index}`,

    label: source.title || source.domain || "Research source",

    kind: "editorial",

    url: source.url,
  }))
  const imageSources = (candidate.images || [])
    .filter(
      (image): image is { url?: string; source?: string; sourceUrl?: string } =>
        typeof image !== "string" && Boolean(image.sourceUrl || image.url),
    )
    .map((image, index) => ({
      id: `backend-image-source-${index}`,
      label: image.source || "Image source",
      kind: "editorial" as const,
      url: image.sourceUrl || image.url,
    }))
  return [...researchSources, ...imageSources]
}

function restrictionsFor(candidate: BackendCandidate): ProductionRestriction[] {
  return Object.entries(candidate.restrictions || {}).map(
    ([key, restriction]) => ({
      key,

      label: key[0].toUpperCase() + key.slice(1),

      value: restriction.status || "Verify",

      status: verification(restriction.status),

      detail: restriction.explanation,
    }),
  )
}

export function normalizeCandidate(
  candidate: BackendCandidate,

  index: number,
): Location {
  const images = (candidate.images || [])

    .map((image) => (typeof image === "string" ? image : image.url || ""))

    .filter(Boolean)

  const imageAttributions = (candidate.images || []).map((image) =>
    typeof image === "string"
      ? "SetRadar research"
      : image.source || image.sourceUrl || "SetRadar research",
  )

  const fit = candidate.scores?.locationFit ?? candidate.matchScore ?? 0

  const access = candidate.scores?.access ?? 0

  const permits = candidate.scores?.permits ?? 0

  const weather = candidate.scores?.weather ?? 80

  const shootability =
    candidate.canWeShootScore ??
    Math.min(100, Math.max(60, Math.round((fit + access + permits + weather) / 4)))

  const restrictions = restrictionsFor(candidate)
  const hasCoordinates =
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number" &&
    Number.isFinite(candidate.latitude) &&
    Number.isFinite(candidate.longitude) &&
    candidate.latitude !== 0 &&
    candidate.longitude !== 0 &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180

  return {
    id: `backend-${candidate.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,

    name: candidate.name,

    type: candidate.area || "Research candidate",

    city: candidate.city || "",

    region: candidate.country || "",

    geo: hasCoordinates
      ? { latitude: candidate.latitude!, longitude: candidate.longitude! }
      : undefined,

    images,

    imageAttributions,

    whyItMatches:
      candidate.whyMatches ||
      candidate.resemblanceExplanation ||
      candidate.matchExplanation ||
      candidate.description ||
      "Research candidate returned by SetRadar.",

    tags: candidate.keywords || [],

    status: "researching",

    logistics: {
      distanceKm: candidate.logistics?.distanceKm ?? 0,

      travelMinutes: candidate.logistics?.travelTimeMin ?? 0,

      vehicleAccess: verification(candidate.logistics?.vehicleAccess),

      parking: "verify",

      parkingNote: "Confirm parking and load-in with the location owner.",

      loadInMeters: 0,
    },

    restrictions,

    weather: {
      risk: "moderate",

      summary: "Select a shoot date to load a forecast.",
    },

    sun: {
      sunrise: "--:--",

      goldenHourStart: "--:--",

      sunset: "--:--",

      blueHourEnd: "--:--",
    },

    sources: sourcesFor(candidate),

    conflicts: (candidate.warnings || []).map((warning) => ({
      type: "access",

      severity: "warning",

      message:
        typeof warning === "string"
          ? warning
          : warning.message || "Production detail needs verification.",
    })),

    shootability,

    breakdown: { locationFit: fit, access, timing: 0, weather, permits },
  }
}

export function normalizeLocation(location: Location): Location {
  const geo =
    location.geo &&
    Number.isFinite(location.geo.latitude) &&
    Number.isFinite(location.geo.longitude) &&
    location.geo.latitude !== 0 &&
    location.geo.longitude !== 0 &&
    location.geo.latitude >= -90 &&
    location.geo.latitude <= 90 &&
    location.geo.longitude >= -180 &&
    location.geo.longitude <= 180
      ? location.geo
      : undefined

  return {
    ...location,
    geo,
    images: Array.isArray(location.images) ? location.images : [],
    tags: Array.isArray(location.tags) ? location.tags : [],
    restrictions: Array.isArray(location.restrictions)
      ? location.restrictions
      : [],
    sources: Array.isArray(location.sources) ? location.sources : [],
    conflicts: Array.isArray(location.conflicts) ? location.conflicts : [],
    logistics: location.logistics ?? {
      distanceKm: 0,
      travelMinutes: 0,
      vehicleAccess: "verify",
      parking: "verify",
      parkingNote: "Verify logistics with the location owner.",
      loadInMeters: 0,
    },
    weather: location.weather ?? {
      risk: "moderate",
      summary: "Select a shoot date to load a forecast.",
    },
    sun: location.sun ?? {},
    breakdown: location.breakdown ?? {
      locationFit: 0,
      access: 0,
      timing: 0,
      weather: 0,
      permits: 0,
    },
  }
}
