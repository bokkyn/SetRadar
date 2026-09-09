import { Router } from "express"

import { requireAuth, requireOwnership } from "./auth.js"

import { dataStore } from "./dataStore.js"

import { asyncRoute, requireEmail, requireFields } from "./middleware.js"

import {
  listLocations,
  loginUser,
  registerUser,
  searchLocations,
} from "./services.js"

export const apiRouter = Router()

apiRouter.post(
  "/auth/register",

  requireFields(["name", "email", "password", "role"]),

  asyncRoute(async (req, res) => {
    res.status(201).json(await registerUser(req.body))
  }),
)

apiRouter.post(
  "/auth/login",

  requireFields(["email", "password"]),
  requireEmail(),

  asyncRoute(async (req, res) => {
    res.json(await loginUser(req.body.email, req.body.password))
  }),
)

apiRouter.get(
  "/locations",

  asyncRoute(async (_req, res) => res.json(await listLocations())),
)

apiRouter.get(
  "/locations/:id",

  asyncRoute(async (req, res) =>
    res.json(await dataStore.get("locations", req.params.id)),
  ),
)

apiRouter.post(
  "/scout",

  requireFields(["prompt", "location"]),

  asyncRoute(async (req, res) => {
    const locations = await searchLocations(req.body)

    res.json({
      id: `res-${Date.now()}`,

      title: req.body.prompt,

      summary: `Candidate locations within ${req.body.radiusKm} km of ${req.body.location}.`,

      locations,

      sources: locations

        .flatMap((location) => location.sources || [])

        .slice(0, 6),

      confidence: "likely",

      warnings: [
        "Permit status is unverified for most candidates.",

        "Weather forecast is a mock estimate.",
      ],
    })
  }),
)

apiRouter.use(requireAuth)

apiRouter.delete(
  "/production-notes",
  asyncRoute(async (req, res) => {
    if (!req.query.locationId) {
      const error = new Error("Location is required to delete a production note.")
      error.status = 400
      throw error
    }
    await dataStore.removeWhere("productionNotes", {
      userId: req.auth.userId,
      locationId: req.query.locationId,
    })
    res.status(204).end()
  }),
)

apiRouter.delete(
  "/production-notes/:locationId",
  asyncRoute(async (req, res) => {
    await dataStore.removeWhere("productionNotes", {
      userId: req.auth.userId,
      locationId: req.params.locationId,
    })
    res.status(204).end()
  }),
)

apiRouter.get(
  "/preferences",
  asyncRoute(async (req, res) => {
    const user = await dataStore.get("users", req.auth.userId)
    res.json(user.preferences || {})
  }),
)

apiRouter.put(
  "/preferences",
  asyncRoute(async (req, res) => {
    const user = await dataStore.get("users", req.auth.userId)
    const updated = await dataStore.update("users", req.auth.userId, {
      preferences: req.body || {},
    })
    res.json(updated.preferences || {})
  }),
)

apiRouter.get(
  "/saved-locations",
  asyncRoute(async (req, res) =>
    res.json(
      await dataStore.list(
        "locations",
        `?ownerId=${encodeURIComponent(req.auth.userId)}`,
      ),
    ),
  ),
)

apiRouter.post(
  "/saved-locations",
  asyncRoute(async (req, res) => {
    if (!req.body?.name || typeof req.body.name !== "string") {
      const error = new Error("A location name is required to save this location.")
      error.status = 400
      error.code = "INVALID_LOCATION"
      throw error
    }
    res.status(201).json(
      await dataStore.create("locations", {
        ...req.body,
        ownerId: req.auth.userId,
      }),
    )
  }),
)

apiRouter.delete(
  "/saved-locations/:id",
  asyncRoute(async (req, res) => {
    const location = await dataStore.get("locations", req.params.id)
    requireOwnership(location, req.auth.userId)
    await dataStore.remove("locations", req.params.id)
    res.status(204).end()
  }),
)

apiRouter.post(
  "/locations",

  asyncRoute(async (req, res) => res.status(201).json(
      await dataStore.create("locations", {
        ...req.body,

        ownerId: req.auth.userId,
      }),
    )),
)

apiRouter.get(
  "/projects",

  asyncRoute(async (req, res) =>
    res.json(
      await dataStore.list(
        "projects",

        `?ownerId=${encodeURIComponent(req.auth.userId)}`,
      ),
    ),
  ),
)

apiRouter.get(
  "/projects/:id",

  asyncRoute(async (req, res) => {
    const project = await dataStore.get("projects", req.params.id)

    requireOwnership(project, req.auth.userId)

    res.json(project)
  }),
)

apiRouter.post(
  "/projects",

  requireFields(["title", "productionType"]),

  asyncRoute(async (req, res) => res.status(201).json(
      await dataStore.create("projects", {
        ...req.body,

        ownerId: req.auth.userId,
      }),
    )),
)

apiRouter.put(
  "/projects/:id",

  asyncRoute(async (req, res) => {
    const existing = await dataStore.get("projects", req.params.id)

    requireOwnership(existing, req.auth.userId)

    const { ownerId: _ignoredOwnerId, ...changes } = req.body || {}

    console.log(
      `[api] PUT /projects/${req.params.id} locations=${
        Array.isArray(changes.locations) ? changes.locations.length : 0
      } scenes=${
        Array.isArray(changes.locations)
          ? changes.locations.reduce(
              (count, location) =>
                count +
                (Array.isArray(location.scenes) ? location.scenes.length : 0),
              0,
            )
          : 0
      }`,
    )

    res.json(
      await dataStore.update("projects", req.params.id, {
        ...existing,

        ...changes,

        ownerId: req.auth.userId,
      }),
    )
  }),
)

apiRouter.delete(
  "/projects/:id",

  asyncRoute(async (req, res) => {
    const existing = await dataStore.get("projects", req.params.id)

    requireOwnership(existing, req.auth.userId)

    await dataStore.remove("projects", req.params.id)

    res.status(204).end()
  }),
)

apiRouter.get(
  "/production-notes",

  asyncRoute(async (req, res) => {
    const query = new URLSearchParams({ userId: req.auth.userId })

    if (req.query.locationId) query.set("locationId", req.query.locationId)

    res.json(await dataStore.list("productionNotes", `?${query}`))
  }),
)

apiRouter.post(
  "/production-notes",

  requireFields(["locationId", "text"]),

  asyncRoute(async (req, res) => res.status(201).json(
      await dataStore.create("productionNotes", {
        ...req.body,

        userId: req.auth.userId,

        id: `note-${Date.now()}`,

        createdAt: new Date().toISOString(),
      }),
    )),
)
