import type { User } from "../app/auth"

import type { Location } from "../types/location"

import type { Project } from "../types/project"
import { normalizeLocation } from "./backendApi"

const API = "/api"

export class ApiError extends Error {
  status: number

  code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)

    this.status = status

    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = window.localStorage.getItem("setradar-access-token")

  const response = await fetch(`${API}${path}`, {
    ...init,

    headers: {
      "Content-Type": "application/json",

      ...(token ? { Authorization: `Bearer ${token}` } : {}),

      ...init?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)

    if (response.status === 401) {
      window.dispatchEvent(new Event("setradar:unauthorized"))
    }

    throw new ApiError(
      response.status,

      body?.error?.message || "The request could not be completed.",

      body?.error?.code,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function loadLocations(): Promise<Location[]> {
  const locations = await request<Location[]>("/locations")
  return locations.map(normalizeLocation)
}

export async function loadSavedLocations(): Promise<Location[]> {
  const locations = await request<Location[]>("/saved-locations")
  return locations.map(normalizeLocation)
}

export async function saveLocation(location: Location): Promise<Location> {
  const saved = await request<Location>("/saved-locations", {
    method: "POST",
    body: JSON.stringify(location),
  })
  return normalizeLocation(saved)
}

export function deleteSavedLocation(locationId: string) {
  return request<void>(`/saved-locations/${encodeURIComponent(locationId)}`, {
    method: "DELETE",
  })
}

export async function loadLocation(id: string): Promise<Location | undefined> {
  return request<Location>(`/locations/${encodeURIComponent(id)}`)
    .then(normalizeLocation)
    .catch(() => undefined)
}

export async function loadUserProjects(user: User): Promise<Project[]> {
  const ownerId = encodeURIComponent(user.id ?? user.email)

  const projects = await request<Project[]>(`/projects?ownerId=${ownerId}`)

  return projects.map(normalizeProject)
}

export async function loadProject(projectId: string) {
  const project = await request<Project>(
    `/projects/${encodeURIComponent(projectId)}`,
  )

  return normalizeProject(project)
}

export async function saveProject(project: Project) {
  const saved = await request<Project>(
    `/projects/${encodeURIComponent(project.id)}`,

    {
      method: "PUT",

      body: JSON.stringify(project),
    },
  )

  return normalizeProject(saved)
}

export async function createProjectRecord(project: Project) {
  const created = await request<Project>("/projects", {
    method: "POST",

    body: JSON.stringify(project),
  })

  return normalizeProject(created)
}

export function deleteProjectRecord(projectId: string) {
  return request<void>(`/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  })
}

export function normalizeProject(project: Project): Project {
  return {
    ...project,

    locations: Array.isArray(project.locations)
      ? project.locations.map((location) => ({
          ...location,
          location: location.location
            ? normalizeLocation(location.location)
            : location.location,
          scenes: Array.isArray(location.scenes) ? location.scenes : [],
        }))
      : [],
  }
}

export interface ProductionNote {
  id: string

  userId: string

  locationId: string

  text: string

  createdAt: string
}

export async function loadProductionNote(user: User, locationId: string) {
  const notes = await request<ProductionNote[]>(
    `/production-notes?userId=${encodeURIComponent(user.id ?? user.email)}&locationId=${encodeURIComponent(locationId)}`,
  )

  return notes[0]?.text ?? null
}

export function saveProductionNote(
  user: User,

  locationId: string,

  text: string,
) {
  return request<ProductionNote>("/production-notes", {
    method: "POST",

    body: JSON.stringify({
      id: `note-${Date.now()}`,

      userId: user.id ?? user.email,

      locationId,

      text,

      createdAt: new Date().toISOString(),
    }),
  })
}

export function deleteProductionNote(user: User, locationId: string) {
  return request<void>(`/production-notes/${encodeURIComponent(locationId)}`, {
    method: "DELETE",
  })
}

export function loadUserPreferences() {
  return request<Partial<import("../app/auth").UserPreferences>>("/preferences")
}

export function saveUserPreferences(
  preferences: import("../app/auth").UserPreferences,
) {
  return request<import("../app/auth").UserPreferences>("/preferences", {
    method: "PUT",
    body: JSON.stringify(preferences),
  })
}
