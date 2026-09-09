import { useState } from "react"
import Button from "../components/ui/Button"
import EmptyState from "../components/ui/EmptyState"
import StatusBadge from "../components/ui/StatusBadge"
import { Input, Label } from "../components/ui/Field"
import LocationScout from "../components/scout/LocationScout"
import LocationCard from "../components/locations/LocationCard"
import {
  runCityMatch,
  runFilmSearch,
  runHistoryCheck,
} from "../services/researchService"
import type {
  CityMatchResult,
  FilmSearchResult,
  HistoryCheckResult,
  HistoryFindingState,
} from "../types/research"
import { useRouter } from "../app/router"
import { useAuth } from "../app/auth"
import { useProjects } from "../app/projects"
import { getLocationById } from "../data/mockLocations"

const HISTORY_STATE: Record<HistoryFindingState, {
  label: string
  tone: string
}> = {
  confirmed: {
    label: "Confirmed",
    tone: "border-status-confirmed/40 bg-status-confirmed/10 text-status-confirmed",
  },
  likely: {
    label: "Likely",
    tone: "border-status-likely/40 bg-status-likely/10 text-status-likely",
  },
  "potential-issue": {
    label: "Potential issue",
    tone: "border-status-restricted/40 bg-status-restricted/10 text-status-restricted",
  },
  verify: {
    label: "Verify",
    tone: "border-status-verify/40 bg-status-verify/10 text-status-verify",
  },
}

type Mode = "find" | "city" | "film" | "history"

const MODES: { id: Mode label: string blurb: string }[] = [
  {
    id: "find",
    label: "Find Locations",
    blurb: "Describe a scene and find real places within range.",
  },
  {
    id: "city",
    label: "City Match",
    blurb: "Find a part of one city that resembles another.",
  },
  {
    id: "film",
    label: "Film Search",
    blurb: "Discover films shot in or around a city.",
  },
  {
    id: "history",
    label: "History Check",
    blurb: "Test whether a place fits your story's period.",
  },
]

const CITY_SUGGESTIONS = [
  "90s Berlin",
  "Medieval Prague",
  "80s Eastern Europe",
  "Modern Tokyo",
  "1960s Paris",
  "Cyberpunk Seoul",
]
const GENRE_SUGGESTIONS = [
  "Thriller",
  "Crime",
  "Drama",
  "Sci-fi",
  "Romance",
  "Horror",
  "Documentary",
]

let lastResearchMode: Mode = "find"
let lastCityMatchResult: CityMatchResult | null = null

export default function ResearchPage() {
  const { navigate, route } = useRouter()
  const [active, setActive] = useState<Mode>(lastResearchMode)

  return (
    <div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <div className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
        Research
      </div>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">
        One search, different purposes
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-fog-500">
        Pick a research mode. Each one changes the form and the results, but
        it's all the same SetRadar workflow.
      </p>

      {/* Mode selector - available to logged-out and logged-in users alike */}
      <div className="mt-6 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              lastResearchMode = m.id
              setActive(m.id)
            }}
            className={`rounded-lg border px-3.5 py-2 text-left transition-colors ${
              active === m.id
                ? "border-amber-signal/50 bg-amber-signal/10 text-amber-signal"
                : "border-line text-fog-300 hover:border-fog-600/60 hover:text-white"
            }`}
          >
            <div className="text-sm font-semibold">{m.label}</div>
          </button>
        ))}
      </div>

      <p className="mt-4 text-[13px] text-fog-500">
        {MODES.find((m) => m.id === active)!.blurb}
      </p>

      <div className="mt-4">
        {active === "find" && (
          <LocationScout
            initialPrompt={route.name === "research" ? route.prompt : undefined}
          />
        )}
        {active === "city" && <CityMatchMode navigate={navigate} />}
        {active === "film" && <FilmSearchMode />}
        {active === "history" && <HistoryCheckMode />}
      </div>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-ink-850 p-5">
      {children}
    </div>
  )
}

function Running({ label }: { label: string }) {
  return (
    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-line bg-ink-850 p-5 text-sm text-fog-400">
      <span className="h-2 w-2 animate-pulse rounded-full bg-amber-signal" />
      {label}
    </div>
  )
}

function CityMatchMode({
  navigate,
}: {
  navigate: (r: { name: "location" id: string }) => void
}) {
  const { preferences } = useAuth()
  const [city, setCity] = useState(preferences.homeBase)
  const [target, setTarget] = useState("1990s Berlin")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CityMatchResult | null>(
    lastCityMatchResult,
  )

  const run = async () => {
    setLoading(true)
    const nextResult = await runCityMatch({ city, target })
    lastCityMatchResult = nextResult
    setResult(nextResult)
    setLoading(false)
  }

  return (
    <>
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="cm-city">Find a place in</Label>
            <Input
              id="cm-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="cm-target">that looks like</Label>
            <Input
              id="cm-target"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="1990s Berlin"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CITY_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setTarget(s)}
              className="rounded-full border border-line px-3 py-1 text-[13px] text-fog-400 transition-colors hover:border-amber-signal/40 hover:text-white"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={run}
            disabled={loading || !city.trim() || !target.trim()}
          >
            {loading ? "Matching…" : "Find matches"}
          </Button>
        </div>
      </Panel>

      {loading && (
        <Running
          label={`Looking for ${city} locations that could pass for ${target}…`}
        />
      )}

      {result && !loading && (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-fog-400">
            Places in <span className="text-fog-100">{result.city}</span> that
            could read as <span className="text-fog-100">{result.target}</span>.
          </p>
          {result.warnings.map((w) => (
            <div
              key={w}
              className="rounded-lg border border-status-verify/30 bg-status-verify/5 p-2.5 text-[13px] text-status-verify"
            >
              {w}
            </div>
          ))}
          <div className="grid gap-5 sm:grid-cols-2">
            {result.entries.map(({ location, reason }) => (
              <div key={location.id} className="space-y-2">
                <div className="rounded-lg border border-amber-signal/25 bg-amber-signal/5 p-3 text-[13px] leading-relaxed text-fog-300">
                  {reason}
                </div>
                <LocationCard
                  location={location}
                  showLogistics={false}
                  onOpen={() => navigate({ name: "location", id: location.id })}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function FilmSearchMode() {
  const { preferences } = useAuth()
  const [city, setCity] = useState(preferences.homeBase)
  const [genre, setGenre] = useState("Thriller")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FilmSearchResult | null>(null)

  const run = async () => {
    setLoading(true)
    setResult(await runFilmSearch({ city, genre }))
    setLoading(false)
  }

  return (
    <>
      <Panel>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="fs-city">City · required</Label>
            <Input
              id="fs-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="fs-genre">Genre · optional</Label>
            <Input
              id="fs-genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Any genre - type your own or pick one"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {GENRE_SUGGESTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
                genre.trim().toLowerCase() === g.toLowerCase()
                  ? "border-amber-signal/50 bg-amber-signal/10 text-amber-signal"
                  : "border-line text-fog-400 hover:border-amber-signal/40 hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={run} disabled={loading || !city.trim()}>
            {loading ? "Searching…" : "Search films"}
          </Button>
        </div>
      </Panel>

      {loading && (
        <Running label={`Finding films shot in or around ${city}…`} />
      )}

      {result && !loading && (
        <div className="mt-5">
          <h2 className="font-display text-lg font-semibold text-white">
            {result.genre ? `${result.genre} films` : "Films"} shot in or around{" "}
            {result.city}
          </h2>
          {result.films.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No matching films"
                description="Try a broader genre, or leave genre empty to see everything."
              />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {result.films.map((f) => (
                <div
                  key={f.id}
                  className="rounded-xl border border-line bg-ink-850 p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-display text-base font-semibold text-white">
                      {f.title}
                    </h3>
                    <span className="font-mono text-[12px] text-fog-500">
                      {f.year} · {f.genre}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-fog-400">
                    {f.description}
                  </p>
                  {f.locations.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-fog-600">
                        Filming locations
                      </span>
                      {f.locations.map((l) => (
                        <span
                          key={l}
                          className="rounded-md border border-line bg-ink-900 px-2 py-0.5 text-[12px] text-fog-300"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}

function HistoryCheckMode() {
  const { user, savedLocationIds, preferences } = useAuth()
  const { projects } = useProjects()
  const [location, setLocation] = useState(preferences.homeBase)
  const [year, setYear] = useState("1974")
  const [context, setContext] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<HistoryCheckResult | null>(null)


  const savedNames = user
    ? Array.from(
        new Set(
          [
            ...savedLocationIds,
            ...projects.flatMap((p) => p.locations.map((l) => l.locationId)),
          ]
            .map((id) => getLocationById(id)?.name)
            .filter((n): n is string => Boolean(n)),
        ),
      )
    : []

  const run = async () => {
    setLoading(true)
    setResult(
      await runHistoryCheck({
        location,
        storyYear: Number(year) || new Date().getFullYear(),
        context,
      }),
    )
    setLoading(false)
  }

  return (
    <>
      <Panel>
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div>
            <Label htmlFor="hc-loc">Location</Label>
            <Input
              id="hc-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="hc-year">Story year</Label>
            <Input
              id="hc-year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </div>
        </div>

        {savedNames.length > 0 && (
          <div className="mt-3">
            <Label>Quick-check a saved location</Label>
            <div className="flex flex-wrap gap-2">
              {savedNames.map((n) => (
                <button
                  key={n}
                  onClick={() => setLocation(n)}
                  className={`rounded-full border px-3 py-1 text-[13px] transition-colors ${
                    location === n
                      ? "border-amber-signal/50 bg-amber-signal/10 text-amber-signal"
                      : "border-line text-fog-400 hover:border-amber-signal/40 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3">
          <Label htmlFor="hc-ctx">Scene / context · optional</Label>
          <Input
            id="hc-ctx"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Exterior night scene"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={run} disabled={loading || !location.trim()}>
            {loading ? "Checking…" : "Check historical fit"}
          </Button>
        </div>
      </Panel>

      {loading && (
        <Running label={`Checking whether ${location} fits ${year}…`} />
      )}

      {result && !loading && (
        <div className="mt-5 space-y-4">
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">
                Historical fit
              </h2>
              <StatusBadge status={result.confidence} />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-fog-300">
              {result.summary}
            </p>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            <Panel>
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-fog-500">
                Period findings
              </h3>
              <ul className="space-y-2.5 text-[13px] leading-relaxed text-fog-300">
                {result.findings.map((f) => (
                  <li key={f.label} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${HISTORY_STATE[f.state].tone}`}
                    >
                      {HISTORY_STATE[f.state].label}
                    </span>
                    <span>
                      {f.label}
                      {f.explanation && (
                        <span className="mt-0.5 block text-fog-500">
                          {f.explanation}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel>
              <h3 className="mb-3 font-mono text-[11px] uppercase tracking-wider text-amber-signal">
                What to verify
              </h3>
              <ul className="space-y-1.5 text-[13px] leading-relaxed text-fog-300">
                {result.toVerify.map((v) => (
                  <li key={v}>? {v}</li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}
