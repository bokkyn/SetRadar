import mongoose from "mongoose"

import { Location } from "./models/Location.js"

import { Project } from "./models/Project.js"

import { User } from "./models/User.js"

import { ProductionNote } from "./models/ProductionNote.js"


const modelMap = {
  locations: Location,

  projects: Project,

  users: User,

  productionNotes: ProductionNote,
}


const toPlain = (doc) => {
  if (!doc) return null

  const obj = doc.toObject ? doc.toObject() : doc

  if (obj._id) {
    obj.id = obj.id || obj._id.toString()

    delete obj._id

    delete obj.__v
  }

  return obj
}


const toPlainArray = (docs) => {
  if (!docs || !Array.isArray(docs)) return []

  return docs.map((doc) => toPlain(doc))
}


const notFound = (resource) => {
  const error = new Error(`${resource} not found`)

  error.status = 404

  error.code = "NOT_FOUND"

  return error
}

const idFilter = (id) =>
  mongoose.isValidObjectId(id) ? { _id: id } : { id: String(id) }

const queryFilter = (query) => {
  const params = new URLSearchParams(
    query.startsWith("?") ? query.substring(1) : query,
  )

  return Object.fromEntries(params.entries())
}

const hydrateProject = async (project) => {
  if (!project || !Array.isArray(project.locations)) return project

  const locationIds = project.locations

    .map((projectLocation) => projectLocation?.locationId)

    .filter(Boolean)

  if (!locationIds.length) return project

  const locations = await Location.find({ id: { $in: locationIds } }).lean()

  const locationById = new Map(
    locations.map((location) => [location.id, toPlain(location)]),
  )

  return {
    ...project,

    locations: project.locations.map((projectLocation) => ({
      ...projectLocation,

      location:
        projectLocation.location ||
        locationById.get(projectLocation.locationId) ||
        undefined,

      scenes: Array.isArray(projectLocation.scenes)
        ? projectLocation.scenes
        : [],
    })),
  }
}

export const dataStore = {

  list: async (resource, query = "") => {
    const Model = modelMap[resource]

    if (!Model) throw new Error(`Unknown resource: ${resource}`)


    const filter = queryFilter(query)

    console.log(
      `[dataStore] list("${resource}") filter:`,

      JSON.stringify(filter),
    )

    const docs = await Model.find(filter).sort({ createdAt: -1 }).lean()

    console.log(
      `[dataStore] list("${resource}") matched ${docs.length} document(s)`,
    )

    const result = toPlainArray(docs)

    return resource === "projects"
      ? Promise.all(result.map(hydrateProject))
      : result
  },


  get: async (resource, id) => {
    const Model = modelMap[resource]

    if (!Model) throw new Error(`Unknown resource: ${resource}`)

    console.log(`[dataStore] get("${resource}", "${id}")`)

    const doc = await Model.findOne(idFilter(id)).lean()

    if (!doc) throw notFound(resource)

    const result = toPlain(doc)

    return resource === "projects" ? hydrateProject(result) : result
  },


  create: async (resource, value) => {
    const Model = modelMap[resource]

    if (!Model) throw new Error(`Unknown resource: ${resource}`)


    const logValue = { ...(value || {}) }

    if ("password" in logValue) logValue.password = "[redacted]"

    console.log(`[dataStore] create("${resource}")`, JSON.stringify(logValue))

    const doc = new Model(value)

    await doc.save()

    console.log(`[dataStore] create("${resource}") saved id ${doc._id}`)

    return toPlain(doc)
  },


  update: async (resource, id, value) => {
    const Model = modelMap[resource]

    if (!Model) throw new Error(`Unknown resource: ${resource}`)


    const { _id: _ignoredMongoId, __v: _ignoredVersion, ...updateData } =
      value || {}

    console.log(
      `[dataStore] update("${resource}", "${id}") fields:`,

      Object.keys(updateData),
    )

    const doc = await Model.findOneAndUpdate(
      idFilter(id),

      { ...updateData, updatedAt: new Date() },

      { new: true, runValidators: true },
    ).lean()

    if (!doc) throw notFound(resource)

    console.log(`[dataStore] update("${resource}", "${id}") saved`)

    return toPlain(doc)
  },


  remove: async (resource, id) => {
    const Model = modelMap[resource]

    if (!Model) throw new Error(`Unknown resource: ${resource}`)

    const result = await Model.findOneAndDelete(idFilter(id))

    if (!result) throw notFound(resource)

    console.log(`[dataStore] remove("${resource}", "${id}") deleted`)

    return { success: true }
  },

  removeWhere: async (resource, filter) => {
    const Model = modelMap[resource]
    if (!Model) throw new Error(`Unknown resource: ${resource}`)
    const result = await Model.deleteMany(filter)
    console.log(`[dataStore] removeWhere("${resource}") deleted ${result.deletedCount}`)
    return { success: true, deletedCount: result.deletedCount }
  },
}
