import { useMemo } from "react"
import { useProjects } from "../app/projects"
import { useRouter } from "../app/router"
import ProjectLocationUnit from "../components/projects/ProjectLocationUnit"
import Button from "../components/ui/Button"
import EmptyState from "../components/ui/EmptyState"
import { formatShootDate, shootStatus } from "../utils/dates"

export default function ProjectOverviewPage({ id }: { id: string }) {
  const { getProject } = useProjects()
  const { navigate } = useRouter()
  const project = getProject(id)

  const stats = useMemo(() => {
    if (!project) return null

    if (!project.locations || !Array.isArray(project.locations)) {
      return { upcoming: null }
    }

    const allScenes = project.locations.flatMap((l) => {
      if (!l || !l.scenes) return []
      return l.scenes
    })

    const upcoming =
      allScenes
        .filter(
          (s) => s && s.shootDate && shootStatus(s.shootDate) !== "filmed",
        )
        .sort((a, b) => {
          if (!a.shootDate) return 1
          if (!b.shootDate) return -1
          return a.shootDate < b.shootDate ? -1 : 1
        })[0] || null

    return { upcoming }
  }, [project])

  if (!project || !stats) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-24">
        <EmptyState
          title="Project not found"
          description="This project may have been removed."
          action={
            <Button onClick={() => navigate({ name: "projects" })}>
              Back to projects
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
      <button
        onClick={() => navigate({ name: "projects" })}
        className="mb-4 text-sm text-fog-500 hover:text-fog-100"
      >
        · Projects
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-amber-signal">
            {project.productionType || "Production"}
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">
            {project.title}
          </h1>
          {project.description && (
            <p className="mt-2 max-w-2xl text-fog-400">{project.description}</p>
          )}
        </div>
        <Button
          onClick={() =>
            navigate({
              name: "research",
              prompt: `Find me place for this movie: "${project.description || project.title}"`,
            })
          }
        >
          + Add location
        </Button>
      </div>

      {/* Next shoot */}
      <div className="mt-3">
        <div className="rounded-xl border border-line bg-ink-850 p-4">
          <div className="font-mono text-[11px] uppercase tracking-wider text-fog-500">
            Next shoot
          </div>
          {stats.upcoming ? (
            <p className="mt-1 text-fog-100">
              {formatShootDate(stats.upcoming.shootDate!)} ·{" "}
              {stats.upcoming.startTime || "TBD"}
              <span className="ml-2 text-fog-500">
                Scene {stats.upcoming.number || "-"}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-fog-500">No upcoming shoots scheduled.</p>
          )}
        </div>
      </div>

      {/* Location units */}
      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-white">
          Production locations
        </h2>
        {project.locations && project.locations.length > 0 ? (
          <div className="space-y-3">
            {project.locations.map((pl) => (
              <ProjectLocationUnit
                key={pl.locationId || Math.random().toString()}
                projectId={project.id}
                pl={pl}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No production locations yet"
            description="Add a discovered location, or run a Location Scout search to find candidates."
            action={
              <Button
                onClick={() =>
                  navigate({
                    name: "research",
                    prompt: `Find me place for this movie: "${project.description || project.title}"`,
                  })
                }
              >
                Find a location
              </Button>
            }
          />
        )}
      </div>

      {project.locations && project.locations.length >= 2 && (
        <div className="mt-6 flex justify-end">
          <Button
            variant="outline"
            onClick={() => navigate({ name: "comparison" })}
          >
            Compare locations in this project →
          </Button>
        </div>
      )}
    </div>
  )
}
