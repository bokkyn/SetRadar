import { useEffect, useMemo, useState } from "react"
import { useProjects } from "../app/projects"
import { useAuth } from "../app/auth"
import { getLocationById } from "../data/mockLocations"
import type { Location } from "../types/location"
import type { ProjectLocation } from "../types/project"
import StatusBadge from "../components/ui/StatusBadge"
import EmptyState from "../components/ui/EmptyState"
import Button from "../components/ui/Button"
import { formatDistance, formatTravel } from "../utils/formatting"
import { useRouter } from "../app/router"

interface Cell {
  location: Location
  projectLocation: ProjectLocation
}

const MAX_COLUMNS = 3

export default function ComparisonPage() {
  const { navigate } = useRouter()
  const { projects } = useProjects()
  const { preferences } = useAuth()
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([])
  const project = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id)
  }, [projectId, projects])

  const comparisonOptions = useMemo(() => {
    if (!project) return []
    return project.locations.flatMap((projectLocation) => {
      const location =
        projectLocation.location ?? getLocationById(projectLocation.locationId)
      return location ? [{ location, projectLocation }] : []
    })
  }, [project])

  useEffect(() => {
    setSelectedLocationIds(
      comparisonOptions
        .slice(0, MAX_COLUMNS)
        .map(({ projectLocation }) => projectLocation.locationId),
    )
  }, [comparisonOptions])

  const cells = useMemo<Cell[]>(() => {
    if (!project) return []
    return selectedLocationIds
      .map((locationId) =>
        comparisonOptions.find(
          ({ projectLocation }) => projectLocation.locationId === locationId,
        ),
      )
      .filter((cell): cell is Cell => cell !== undefined)
  }, [comparisonOptions, project, selectedLocationIds])

  const changeProject = (id: string) => {
    setProjectId(id)
  }

  const changeLocation = (column: number, locationId: string) => {
    setSelectedLocationIds((current) => {
      const next = [...current]
      next[column] = locationId
      return next
    })
  }

  const rows: { label: string render: (c: Cell) => React.ReactNode }[] = [
    {
      label: "Distance",
      render: (c) =>
        formatDistance(c.location.logistics.distanceKm, preferences.units),
    },
    {
      label: "Travel time",
      render: (c) => formatTravel(c.location.logistics.travelMinutes),
    },
    {
      label: "Scenes",
      render: (c) => (c.projectLocation.scenes ?? []).length,
    },
    {
      label: "Shootability",
      render: (c) => (
        <span className="font-display text-lg font-bold text-amber-signal">
          {c.location.shootability}
        </span>
      ),
    },
    {
      label: "Permit",
      render: (c) => (
        <StatusBadge
          status={c.location.restrictions[0].status}
          label={c.location.restrictions[0].value}
        />
      ),
    },
    {
      label: "Access hours",
      render: (c) =>
        c.location.restrictions.find((r) => r.key === "hours")?.value ?? "-",
    },
    {
      label: "Parking",
      render: (c) => <StatusBadge status={c.location.logistics.parking} />,
    },
  ]

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <div className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
        Decision tool
      </div>
      <h1 className="mt-1 font-display text-3xl font-bold text-white">
        Compare locations
      </h1>
      <p className="mt-1 text-sm text-fog-500">
        Comparison is scoped to a single production. Choose a project, then
        choose up to three locations to compare.
      </p>

      {projects.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nothing to compare yet"
            description="Add at least two locations to a project to compare them for a production decision."
            action={
              <Button onClick={() => navigate({ name: "projects" })}>
                Go to projects
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Choose project */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <label
              htmlFor="comparison-project"
              className="font-mono text-[11px] uppercase tracking-wider text-fog-600"
            >
              Project
            </label>
            <select
              id="comparison-project"
              value={projectId}
              onChange={(e) => changeProject(e.target.value)}
              className="h-9 min-w-56 rounded-lg border border-line bg-ink-850 px-3 text-sm text-fog-100 outline-none focus:border-amber-signal/60"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {cells.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No locations in this project"
                description="Add locations to this production before comparing them."
                action={
                  <Button
                    onClick={() => navigate({ name: "project", id: projectId })}
                  >
                    Open project
                  </Button>
                }
              />
            </div>
          ) : cells.length < 2 ? (
            <div className="mt-8">
              <EmptyState
                title="Not enough locations to compare"
                description="Add at least one more location to this project to compare them."
                action={
                  <Button
                    onClick={() => navigate({ name: "project", id: projectId })}
                  >
                    Open project
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-230 table-fixed border-collapse">
                <colgroup>
                  <col className="w-36" />
                  {cells.map((cell) => (
                    <col key={cell.location.id} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-ink-900 p-4 text-left font-mono text-[11px] uppercase tracking-wider text-fog-600">
                      Metric
                    </th>
                    {cells.map((c, index) => (
                      <th
                        key={c.location.id}
                        className="border-l border-line bg-ink-850 p-4 text-left align-top"
                      >
                        <div className="flex h-12 items-start overflow-hidden">
                          <button
                            onClick={() =>
                              navigate({ name: "location", id: c.location.id })
                            }
                            className="min-h-10 text-left font-display text-sm font-semibold text-white hover:text-amber-signal"
                          >
                            {c.location.name}
                          </button>
                        </div>
                        <div className="h-5 truncate text-[12px] text-fog-500">
                          {c.location.type}
                        </div>
                        <label
                          className="sr-only"
                          htmlFor={`compare-location-${index}`}
                        >
                          Location {index + 1}
                        </label>
                        <select
                          id={`compare-location-${index}`}
                          value={c.projectLocation.locationId}
                          onChange={(event) =>
                            changeLocation(index, event.target.value)
                          }
                          className="mt-3 h-9 w-full rounded-lg border border-line bg-ink-900 px-2 text-xs text-fog-100 outline-none focus:border-amber-signal/60"
                        >
                          {comparisonOptions.map(
                            ({ projectLocation, location }) => (
                              <option
                                key={projectLocation.locationId}
                                value={projectLocation.locationId}
                                disabled={selectedLocationIds.some(
                                  (selectedId, selectedIndex) =>
                                    selectedIndex !== index &&
                                    selectedId === projectLocation.locationId,
                                )}
                              >
                                {location.name}
                              </option>
                            ),
                          )}
                        </select>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={i % 2 ? "bg-ink-900/40" : ""}
                    >
                      <td className="sticky left-0 z-10 bg-ink-900 p-4 text-[13px] text-fog-400">
                        {row.label}
                      </td>
                      {cells.map((c) => (
                        <td
                          key={c.location.id}
                          className="border-l border-line p-4 text-[13px] text-fog-100"
                        >
                          {row.render(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
