import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "../app/router"
import { useAuth } from "../app/auth"
import { useProjects } from "../app/projects"
import AddToProjectModal from "../components/projects/AddToProjectModal"
import Button from "../components/ui/Button"
import { Chip } from "../components/ui/Badge"
import EmptyState from "../components/ui/EmptyState"
import LocationSceneManager from "../components/projects/LocationSceneManager"
import {
  deleteProductionNote,
  loadProductionNote,
  saveProductionNote,
} from "../services/databaseService"
import { getLocation } from "../services/locationService"
import type { WeatherResult } from "../services/weatherService"
import type { Location } from "../types/location"
import type { SunTiming } from "../types/weather"
import ShootabilityPanel from "../components/shootability/ShootabilityPanel"
import { computeShootability } from "../utils/shootability"
import {
  LocationLogistics,
  LocationSources,
  ProductionRestrictions,
  SunTimeline,
  WeatherPanel,
} from "../components/locations/panels"
import ImageGallery from "../components/locations/ImageGallery"

function LockedLocationSection({
  title,
  children,
  onSignIn,
}: {
  title: string
  children: React.ReactNode
  onSignIn: () => void
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-ink-850">
      <div className="pointer-events-none select-none blur-[2px] opacity-80">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-ink-950/55 p-5">
        <button
          onClick={onSignIn}
          className="rounded-xl border border-amber-signal/40 bg-ink-950/90 px-5 py-4 text-center shadow-xl transition-colors hover:border-amber-signal"
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-signal">
            Sign-in required
          </div>
          <div className="mt-1 font-display text-lg font-semibold text-white">
            {title}
          </div>
          <div className="mt-1 text-sm text-fog-400">
            Sign in to view and manage this production data.
          </div>
        </button>
      </div>
    </div>
  )
}

export default function LocationDetailPage({ id }: { id: string }) {
  const { navigate, goBack } = useRouter()
  const { user, savedLocationIds, requireAuth, toggleSaved } = useAuth()
  const { projects } = useProjects()
  const [location, setLocation] = useState<Location | null>(null)
  const [locationLoading, setLocationLoading] = useState(true)
  const [note, setNote] = useState("")
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [sun, setSun] = useState<SunTiming | undefined>()
  const handleWeatherResult = useCallback((result: WeatherResult | null) => {
    setSun(result?.sun)
    if (result) {
      setLocation((current) =>
        current
          ? {
              ...current,
              weather: result.forecast,
              breakdown: {
                ...current.breakdown,
                weather: result.forecast.score ?? current.breakdown.weather,
              },
              shootability: computeShootability({
                ...current.breakdown,
                weather: result.forecast.score ?? current.breakdown.weather,
              }),
            }
          : current,
      )
    }
  }, [])

  useEffect(() => {
    let active = true
    setLocationLoading(true)
    getLocation(id)
      .then((loaded) => {
        if (active) setLocation(loaded ?? null)
      })
      .finally(() => {
        if (active) setLocationLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (!user) {
      setSavedNote(null)
      return
    }
    let active = true
    loadProductionNote(user, id)
      .then((storedNote) => {
        if (active) setSavedNote(storedNote)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [user, id])

  const assigned = useMemo(() => {
    const projectLocations = projects.flatMap((p) =>
      p.locations
        .filter((l) => l.locationId === id)
        .map((locationProject) => ({
          projectId: p.id,
          projectTitle: p.title,
          locationProject,
        })),
    )
    const rows = projectLocations.flatMap(({ projectTitle, locationProject }) =>
      (locationProject.scenes ?? []).map((scene) => ({
        project: projectTitle,
        scene,
      })),
    )
    const next = rows
      .filter((r) => r.scene.shootDate)
      .sort((a, b) => (a.scene.shootDate! < b.scene.shootDate! ? -1 : 1))[0]
    return { projectLocations, shootDate: next?.scene.shootDate }
  }, [projects, id])

  if (locationLoading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24 text-center text-sm text-fog-500">
        Loading locationâ€¦
      </div>
    )
  }

  if (!location) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <EmptyState
          title="Location not found"
          description="This candidate is no longer available. Run a new scout to find fresh locations."
          action={
            <Button onClick={() => navigate({ name: "home" })}>
              Start scouting
            </Button>
          }
        />
      </div>
    )
  }

  const saved = savedLocationIds.includes(location.id)
  const save = () =>
    requireAuth("Save this location to your profile", () =>
      toggleSaved(location.id, location),
    )
  const addToProject = () =>
    requireAuth("Add this location to a project", () => setAddOpen(true))
  const addNote = () =>
    requireAuth("Add a private production note", () => {
      if (!user || !note.trim()) return
      void saveProductionNote(user, location.id, note.trim())
        .then(() => {
          setSavedNote(note.trim())
          setNote("")
        })
        .catch((error) => {
          console.error("[SetRadar] Could not save production note", error)
        })
    })
  const removeNote = () =>
    requireAuth("Delete this private production note", () => {
      if (!user || !savedNote) return
      void deleteProductionNote(user, location.id)
        .then(() => setSavedNote(null))
        .catch((error) => {
          console.error("[SetRadar] Could not delete production note", error)
        })
    })

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">
      <button
        onClick={goBack}
        className="mb-4 text-sm text-fog-500 hover:text-fog-100"
      >
        â† Back
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
              {location.type}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-white">
            {location.name}
          </h1>
          <p className="mt-1 text-fog-500">
            {location.city}, {location.region}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={saved ? "secondary" : "primary"} onClick={save}>
            {saved ? "Saved âś“" : "Save"}
          </Button>
          <Button variant="outline" onClick={addToProject}>
            Add to project
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* Compact gallery stays with the location content in the left column. */}
          <ImageGallery
            name={location.name}
            city={location.city}
            images={location.images}
          />

          {/* Why it matches */}
          <div className="rounded-2xl border border-line bg-ink-850 p-5">
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
              Why it fits
            </div>
            <p className="leading-relaxed text-fog-200">
              {location.whyItMatches}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {location.tags.map((t) => (
                <Chip key={t}>{t}</Chip>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-fog-600">
              A match assessment, not an independently verified fact - confirm
              the practical details below.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <LocationLogistics location={location} />
            <WeatherPanel
              location={location}
              shootDate={assigned.shootDate}
              onWeatherResult={handleWeatherResult}
            />
          </div>

          <SunTimeline location={location} sun={sun} />
          <ProductionRestrictions location={location} />

          {/* Scene management belongs to the opened location, grouped by project. */}
          {user ? (
            assigned.projectLocations.map(
              ({ projectId, projectTitle, locationProject }) => (
                <div key={projectId}>
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fog-600">
                    Project Â· {projectTitle}
                  </div>
                  <LocationSceneManager
                    projectId={projectId}
                    pl={locationProject}
                    location={location}
                  />
                </div>
              ),
            )
          ) : (
            <LockedLocationSection
              title="Scenes at this location"
              onSignIn={() => navigate({ name: "signin" })}
            >
              <div className="p-5">
                <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fog-500">
                  Scenes at this location
                </div>
                <div className="space-y-2">
                  <div className="h-12 rounded-lg border border-line bg-ink-900" />
                  <div className="h-12 rounded-lg border border-line bg-ink-900" />
                </div>
              </div>
            </LockedLocationSection>
          )}

          {/* Notes */}
          {user ? (
            <div className="rounded-2xl border border-line bg-ink-850 p-5">
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fog-500">
                Production notes
              </h3>
              {savedNote && (
                <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-line bg-ink-900 p-3 text-sm text-fog-200">
                  <span>{savedNote}</span>
                  <button
                    className="shrink-0 text-xs text-status-restricted hover:text-white"
                    onClick={removeNote}
                  >
                    Delete
                  </button>
                </div>
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Ask municipality about night filmingâ€¦"
                className="w-full resize-none rounded-xl border border-line bg-ink-900 p-3 text-sm text-fog-100 placeholder:text-fog-600 outline-none focus:border-amber-signal/60"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={addNote} disabled={!note.trim()}>
                  Save note
                </Button>
              </div>
            </div>
          ) : (
            <LockedLocationSection
              title="Production notes"
              onSignIn={() => navigate({ name: "signin" })}
            >
              <div className="p-5">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fog-500">
                  Production notes
                </h3>
                <div className="h-20 rounded-xl border border-line bg-ink-900" />
                <div className="mt-2 flex justify-end">
                  <div className="h-8 w-24 rounded-lg bg-amber-signal/50" />
                </div>
              </div>
            </LockedLocationSection>
          )}

          <LocationSources location={location} />
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <ShootabilityPanel location={location} />
        </div>
      </div>

      <AddToProjectModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        location={location}
      />
    </div>
  )
}
