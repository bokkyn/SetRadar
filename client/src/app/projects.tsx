import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import type { ReactNode } from "react"
import type { Project, ProjectLocation } from "../types/project"
import type { Location } from "../types/location"
import type { Scene } from "../types/scene"
import { mockProjects } from "../data/mockProjects"
import { useAuth } from "./auth"
import {
  createProjectRecord,
  deleteProjectRecord,
  loadUserProjects,
  normalizeProject,
  saveProject,
} from "../services/databaseService"
import { cacheLocations } from "../services/locationService"

function persistProject(project: Project) {
  void saveProject(project).catch((error) => {
    console.error("[projects] Failed to persist project changes", error)
  })
}

interface ProjectsValue {
  projects: Project[]
  getProject: (id: string) => Project | undefined
  createProject: (
    title: string,
    productionType: Project["productionType"],
    genre?: string,
    description?: string,
  ) => Promise<Project>
  updateProject: (
    projectId: string,
    patch: Partial<Pick<Project, "title" | "productionType" | "genre" | "description">>,
  ) => void
  deleteProject: (projectId: string) => void
  addLocation: (projectId: string, location: Location) => void
  removeLocation: (projectId: string, locationId: string) => void
  updateProjectLocation: (
    projectId: string,
    locationId: string,
    patch: Partial<ProjectLocation>,
  ) => void
  addScene: (
    projectId: string,
    locationId: string,
    scene: Omit<Scene, "id">,
  ) => void
  updateScene: (
    projectId: string,
    locationId: string,
    sceneId: string,
    patch: Partial<Scene>,
  ) => void
  deleteScene: (projectId: string, locationId: string, sceneId: string) => void
}

const ProjectsContext = createContext<ProjectsValue | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>(() =>
    mockProjects.map((p) => ({ ...p })),
  )

  useEffect(() => {
    if (!user) {
      setProjects(mockProjects.map((p) => ({ ...p })))
      return
    }
    let active = true
    loadUserProjects(user)
      .then((loaded) => {
        if (active) {
          cacheLocations(
            loaded.flatMap((project) =>
              project.locations.flatMap((projectLocation) =>
                projectLocation.location ? [projectLocation.location] : [],
              ),
            ),
          )
          setProjects(loaded.map(normalizeProject))
        }
      })
      .catch(() => {
        if (active) {
          const isIvan = user.name.trim().toLowerCase() === "ivan"
          setProjects(isIvan ? mockProjects.map((p) => ({ ...p })) : [])
        }
      })
    return () => {
      active = false
    }
  }, [user])

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  )

  const createProject: ProjectsValue["createProject"] = useCallback(
    async (title, productionType, genre, description) => {
      const project: Project = {
        id: `proj-${Date.now()}`,
        title,
        productionType,
        genre: genre?.trim() || undefined,
        description: description?.trim() || "",
        locations: [],
        totalScenes: 0,
        shortlisted: 0,
        warnings: 0,
        ownerId: user?.id ?? user?.email,
      }
      const stored = await createProjectRecord(project)
      setProjects((prev) => [stored, ...prev])
      return stored
    },
    [user],
  )

  const updateProject: ProjectsValue["updateProject"] = useCallback(
    (projectId, patch) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project
          const next = { ...project, ...patch }
          persistProject(next)
          return next
        }),
      )
    },
    [],
  )

  const deleteProject: ProjectsValue["deleteProject"] = useCallback(
    (projectId) => {
      setProjects((prev) => prev.filter((project) => project.id !== projectId))
      void deleteProjectRecord(projectId).catch(() => undefined)
    },
    [],
  )

  const addLocation: ProjectsValue["addLocation"] = useCallback(
    (projectId, location) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (
            p.id !== projectId ||
            p.locations.some((l) => l.locationId === location.id)
          )
            return p
          const next = {
            ...p,
            locations: [
              ...p.locations,
              {
                locationId: location.id,
                location,
                status: "researching" as const,
                warnings: 0,
                scenes: [],
              },
            ],
          }
          persistProject(next)
          return next
        }),
      )
    },
    [],
  )

  const removeLocation: ProjectsValue["removeLocation"] = useCallback(
    (projectId, locationId) => {
      setProjects((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project
          const next = {
            ...project,
            locations: project.locations.filter(
              (location) => location.locationId !== locationId,
            ),
          }
          persistProject(next)
          return next
        }),
      )
    },
    [],
  )

  const updateProjectLocation: ProjectsValue["updateProjectLocation"] =
    useCallback((projectId, locationId, patch) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== projectId
            ? p
            : (() => {
                const next = {
                  ...p,
                  locations: p.locations.map((l) =>
                    l.locationId === locationId ? { ...l, ...patch } : l,
                  ),
                }
                persistProject(next)
                return next
              })(),
        ),
      )
    }, [])

  const addScene: ProjectsValue["addScene"] = useCallback(
    (projectId, locationId, scene) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== projectId
            ? p
            : (() => {
                const next = {
                  ...p,
                  totalScenes: p.totalScenes + 1,
                  locations: p.locations.map((l) =>
                    l.locationId === locationId
                      ? {
                          ...l,
                          scenes: [
                            ...l.scenes,
                            { ...scene, id: `sc-${Date.now()}` },
                          ],
                        }
                      : l,
                  ),
                }
                persistProject(next)
                return next
              })(),
        ),
      )
    },
    [],
  )

  const deleteScene: ProjectsValue["deleteScene"] = useCallback(
    (projectId, locationId, sceneId) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== projectId
            ? p
            : (() => {
                const next = {
                  ...p,
                  totalScenes: Math.max(0, p.totalScenes - 1),
                  locations: p.locations.map((l) =>
                    l.locationId === locationId
                      ? {
                          ...l,
                          scenes: l.scenes.filter((s) => s.id !== sceneId),
                        }
                      : l,
                  ),
                }
                persistProject(next)
                return next
              })(),
        ),
      )
    },
    [],
  )

  const updateScene: ProjectsValue["updateScene"] = useCallback(
    (projectId, locationId, sceneId, patch) => {
      setProjects((prev) =>
        prev.map((p) =>
          p.id !== projectId
            ? p
            : (() => {
                const next = {
                  ...p,
                  locations: p.locations.map((l) =>
                    l.locationId === locationId
                      ? {
                          ...l,
                          scenes: (l.scenes ?? []).map((s) =>
                            s.id === sceneId ? { ...s, ...patch } : s,
                          ),
                        }
                      : l,
                  ),
                }
                persistProject(next)
                return next
              })(),
        ),
      )
    },
    [],
  )

  const value = useMemo(
    () => ({
      projects,
      getProject,
      createProject,
      updateProject,
      deleteProject,
      addLocation,
      removeLocation,
      updateProjectLocation,
      addScene,
      updateScene,
      deleteScene,
    }),
    [
      projects,
      getProject,
      createProject,
      updateProject,
      deleteProject,
      addLocation,
      removeLocation,
      updateProjectLocation,
      addScene,
      updateScene,
      deleteScene,
    ],
  )

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  )
}

export function useProjects() {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider")
  return ctx
}
