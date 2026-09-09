import { createRequire } from "node:module"

import { FunctionTool, LlmAgent, ParallelAgent } from "@google/adk"

const require = createRequire(import.meta.url)

const geminiService = require("../services/geminiService.cjs")

const parallelService = require("../services/parallelService.cjs")

const imageSearchService = require("../services/imageSearchService.cjs")

const schema = (properties, required) => ({
  type: "object",

  properties,

  required,
})

const locationSynthesisSchema = {
  type: "object",

  properties: {
    candidates: {
      type: "array",

      items: {
        type: "object",

        properties: {
          name: { type: "string" },

          address: { type: "string" },

          city: { type: "string" },

          country: { type: "string" },
          latitude: { type: "number", minimum: -90, maximum: 90 },
          longitude: { type: "number", minimum: -180, maximum: 180 },

          description: { type: "string" },

          whyMatches: { type: "string" },

          matchScore: { type: "integer", minimum: 0, maximum: 100 },

          matchExplanation: { type: "string" },

          sources: {
            type: "array",

            items: {
              type: "object",

              properties: {
                title: { type: "string" },

                url: { type: "string" },

                domain: { type: "string" },
              },
            },
          },
        },

        required: [
          "name",
          "latitude",
          "longitude",
          "matchScore",
          "matchExplanation",
          "sources",
        ],
      },
    },
  },

  required: ["candidates"],
}

const researchTool = new FunctionTool({
  name: "research_locations",

  description: "Use Gemini and Parallel API to find real filming locations.",

  parameters: schema(
    {
      location: { type: "string" },

      description: { type: "string" },

      radius: { type: "number" },
    },

    ["location", "description"],
  ),

  execute: async ({ location, description, radius = 50 }) => {
    console.log("[ADK research] Gemini: creating location research plan")

    const plan = await geminiService.createResearchPlan(
      { location, description, radiusKm: radius },

      "location-scout",
    )

    console.log("[ADK research] Parallel: searching location evidence")

    const results = await parallelService.search(plan, {
      objective: `Find real-world filming locations matching: ${description} near ${location}. Include permit information and accessibility details.`,
    })

    console.log("[ADK research] Gemini: synthesizing structured candidates")

    let candidates

    try {
      const synthesis = await geminiService.synthesizeResults(
        { location, description, radiusKm: radius },

        results,

        "location-scout",

        locationSynthesisSchema,
      )

      candidates = synthesis.candidates || []
    } catch (error) {
      console.error(
        "[ADK research] Gemini synthesis failed; using raw research evidence",
        {
          code: error?.code,

          message: error?.message || String(error),
        },
      )

      candidates = []
    }

    return {
      locations: candidates,

      searchId: results.search_id,

      summary: `Found ${candidates.length} potential locations from live research`,
    }
  },
})

const imageTool = new FunctionTool({
  name: "find_location_images",

  description: "Find relevant images for a filming location.",

  parameters: schema(
    {
      locationName: { type: "string" },

      city: { type: "string" },

      country: { type: "string" },
    },

    ["locationName"],
  ),

  execute: async ({ locationName, city = "", country = "" }) => {
    console.log(`[ADK image] Image search: ${locationName}`)

    let images = []

    try {
      images = await withTimeout(
        imageSearchService.findBestImage(
          { name: locationName, city, country },

          { location: city },

          null,
        ),

        16000,

        `Image search timed out for ${locationName}`,
      )
    } catch (error) {
      console.warn(`[ADK image] ${error.message}; continuing without images`)
    }

    return {
      images: images.map((image) => ({
        url: image.url,

        source: image.source || "Google Images",
      })),

      count: images.length,
    }
  },
})

const analysisTool = new FunctionTool({
  name: "analyze_location",

  description: "Analyze a location for filming suitability and score it.",

  parameters: schema(
    {
      name: { type: "string" },

      address: { type: "string" },

      city: { type: "string" },

      country: { type: "string" },

      description: { type: "string" },

      matchScore: { type: "number" },
    },

    ["name"],
  ),

  execute: async (params) => {
    console.log(`[ADK analysis] Gemini: analyzing ${params.name}`)

    const details = await geminiService.analyzeLocationDetails(params, {
      description: params.description,

      location: params.city,
    })

    const score = calculateScore(details)

    return {
      ...details,

      canWeShootScore: score,

      canWeShootLabel: getLabel(score),

      warnings: generateWarnings(details),
    }
  },
})

const historyTool = new FunctionTool({
  name: "verify_location_history",

  description: "Verify the historical accuracy of a location for a given year.",

  parameters: schema(
    {
      location: { type: "string" },

      year: { type: "number" },

      description: { type: "string" },
    },

    ["location", "year"],
  ),

  execute: async ({ location, year, description = "" }) => {
    const plan = await geminiService.createResearchPlan(
      { location, storyYear: year, description },

      "history-check",
    )

    const results = await parallelService.search(plan, {
      objective: `Verify historical accuracy of ${location} in ${year}`,
    })

    return geminiService.analyzeHistoricalAccuracy(location, year, results)
  },
})

const cityMatchTool = new FunctionTool({
  name: "match_city_visuals",

  description:
    "Find and synthesize areas in a city that resemble a reference city or era.",

  parameters: schema(
    { targetCity: { type: "string" }, reference: { type: "string" } },

    ["targetCity", "reference"],
  ),

  execute: async ({ targetCity, reference }) => {
    console.log("[ADK city_match] Gemini: creating research plan")

    const plan = await geminiService.createResearchPlan(
      { targetCity, reference },

      "city-lookalike",
    )

    console.log(
      "[ADK city_match] Parallel: searching visual and urban evidence",
    )

    const results = await parallelService.search(plan, {
      objective: `Find areas in ${targetCity} that visually resemble ${reference}. Focus on architecture, urban planning, and visual characteristics.`,
    })

    console.log("[ADK city_match] Gemini: synthesizing structured candidates")

    const synthesis = await geminiService.synthesizeResults(
      { targetCity, reference },

      results,

      "city-lookalike",

      locationSynthesisSchema,
    )

    console.log("[ADK city_match] Image agent: enriching visual matches")

    const candidates = await Promise.all(
      (synthesis.candidates || []).slice(0, 3).map(async (candidate) => {
        let images = []

        try {
          images = await withTimeout(
            imageSearchService.findBestImage(
              {
                name: candidate.name,

                city: candidate.city || targetCity,

                country: candidate.country || "",

                address: candidate.address || "",
              },

              { location: targetCity, reference },

              results,
            ),

            35000,

            `Image search timed out for ${candidate.name}`,
          )
        } catch (error) {
          console.warn(
            `[ADK city_match] ${error.message}; continuing without images`,
          )
        }

        return {
          ...candidate,

          images: images.map((image) => ({
            url: image.url,

            source: image.source || "Google Images",
          })),

          sources: candidate.sources || [],
        }
      }),
    )

    return { candidates, targetCity, reference }
  },
})

const filmSearchTool = new FunctionTool({
  name: "research_films_in_city",

  description:
    "Find films actually shot in a city and synthesize verified film records.",

  parameters: schema({ city: { type: "string" }, genre: { type: "string" } }, [
    "city",
  ]),

  execute: async ({ city, genre = "" }) => {
    console.log("[ADK films] Gemini: creating research plan")

    const plan = await geminiService.createResearchPlan(
      { city, genre },

      "films-in-city",
    )

    console.log("[ADK films] Parallel: verifying filming locations")

    const results = await parallelService.search(plan, {
      objective: `Find films actually shot in ${city}${
        genre ? ` in the ${genre} genre` : ""
      }. Verify actual filming locations.`,
    })

    console.log("[ADK films] Gemini: synthesizing structured films")

    const synthesis = await geminiService.synthesizeResults(
      { city, genre },

      results,

      "films-in-city",

      {
        type: "object",

        properties: {
          films: {
            type: "array",

            items: {
              type: "object",

              properties: {
                title: { type: "string" },

                year: { type: "integer" },

                genre: { type: "string" },

                description: { type: "string" },

                filmingLocation: { type: "string" },

                filmedInCity: { type: "boolean" },

                sources: {
                  type: "array",

                  items: {
                    type: "object",

                    properties: {
                      title: { type: "string" },

                      url: { type: "string" },

                      domain: { type: "string" },
                    },
                  },
                },
              },

              required: [
                "title",

                "year",

                "genre",

                "description",

                "filmedInCity",

                "sources",
              ],
            },
          },
        },

        required: ["films"],
      },
    )

    return { films: synthesis.films || [], city, genre: genre || null }
  },
})

const historyCheckTool = new FunctionTool({
  name: "check_location_history",

  description:
    "Verify whether a location plausibly fits a historical story year.",

  parameters: schema(
    {
      location: { type: "string" },

      storyYear: { type: "number" },

      context: { type: "string" },
    },

    ["location", "storyYear"],
  ),

  execute: async ({ location, storyYear, context = "" }) => {
    console.log("[ADK history] Gemini: creating research plan")

    const plan = await geminiService.createResearchPlan(
      { location, storyYear, context },

      "history-check",
    )

    console.log("[ADK history] Parallel: checking historical sources")

    const results = await parallelService.search(plan, {
      objective: `Verify the historical accuracy of ${location} in ${storyYear}. Investigate buildings, streets, transportation, and urban landscape.`,

      maxCharsTotal: 40000,
    })

    console.log("[ADK history] Gemini: verifying historical accuracy")

    const findings = await geminiService.analyzeHistoricalAccuracy(
      location,

      storyYear,

      results,
    )

    return { ...findings, location, storyYear }
  },
})

export const researchAgent = new LlmAgent({
  name: "research_agent",

  description: "Researches filming locations using Gemini and Parallel API.",

  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  instruction: "Use research_locations for location scouting requests.",

  tools: [researchTool],
})

export const imageAgent = new LlmAgent({
  name: "image_agent",

  description: "Finds images of filming locations.",

  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  instruction: "Use find_location_images to find location images.",

  tools: [imageTool],
})

export const analysisAgent = new LlmAgent({
  name: "analysis_agent",

  description: "Analyzes locations for filming suitability.",

  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  instruction: "Use analyze_location to score a location.",

  tools: [analysisTool],
})

export const historyAgent = new LlmAgent({
  name: "history_agent",

  description: "Verifies the historical accuracy of locations.",

  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  instruction: "Use verify_location_history to verify historical accuracy.",

  tools: [historyTool],
})

export const cityMatchAgent = new LlmAgent({
  name: "city_match_agent",

  description: "Matches city visuals using research.",

  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  instruction: "Use match_city_visuals.",

  tools: [cityMatchTool],
})

export const filmSearchAgent = new LlmAgent({
  name: "film_search_agent",

  description: "Researches films shot in a city.",

  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  instruction: "Use research_films_in_city.",

  tools: [filmSearchTool],
})

export const historyCheckAgent = new LlmAgent({
  name: "history_check_agent",

  description: "Checks historical location accuracy.",

  model: process.env.GEMINI_MODEL || "gemini-1.5-flash",

  instruction: "Use check_location_history.",

  tools: [historyCheckTool],
})


const orchestrator = new ParallelAgent({
  name: "cinema_orchestrator",

  description: "Coordinates the SetRadar multi-agent workflow.",

  subAgents: [researchAgent, imageAgent, analysisAgent, historyAgent],
})

const callTool = async (agent, name, args) => {
  const tool = agent.tools.find(
    (candidate) => candidate._getDeclaration().name === name,
  )

  if (!tool) throw new Error(`Tool ${name} is not registered on ${agent.name}`)

  return tool.runAsync({ args })
}

function withTimeout(promise, milliseconds, message) {
  let timeoutId

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), milliseconds)
  })

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

orchestrator.process = async ({
  location,

  description,

  radius = 50,

  storyYear,
}) => {
  const research = await callTool(researchAgent, "research_locations", {
    location,

    description,

    radius,
  })

  if (!research.locations?.length)
    return {
      status: "no_results",

      message: "No locations found matching your criteria",
    }

  const candidates = await Promise.all(
    research.locations.slice(0, 3).map(async (candidate) => {
      const city = candidate.city || location

      const candidateDescription = candidate.description || description

      const [images, analysis, history] = await Promise.all([
        callTool(imageAgent, "find_location_images", {
          locationName: candidate.name,

          city,

          country: candidate.country || "",
        }),

        callTool(analysisAgent, "analyze_location", {
          name: candidate.name,
          address: candidate.address || "",
          city,
          country: candidate.country || "",
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          description: candidateDescription,

          matchScore: candidate.matchScore || 70,
        }),

        storyYear
          ? callTool(historyAgent, "verify_location_history", {
              location: candidate.name,

              year: storyYear,

              description: candidateDescription,
            })
          : Promise.resolve(null),
      ])

      return {
        name: candidate.name,

        address: candidate.address || "",

        city,

        country: candidate.country || "",

        description: candidateDescription,

        whyMatches: candidate.whyMatches || "",

        matchScore: candidate.matchScore || 70,

        images: images.images || [],

        analysis,

        logistics: analysis.logistics,

        restrictions: analysis.restrictions,

        scores: analysis.scores,

        keywords: analysis.keywords,

        sources: candidate.sources || [],

        history,

        score: analysis.canWeShootScore || 0,

        label: analysis.canWeShootLabel || "Moderate candidate",

        warnings: analysis.warnings || [],
      }
    }),
  )

  candidates.sort((left, right) => right.score - left.score)

  return {
    status: "success",

    candidates,

    researchSummary: research.summary,

    searchId: research.searchId,

    count: candidates.length,
  }
}

function calculateScore(details) {
  const { locationFit = 0, access = 0, permits = 0 } = details.scores || {}

  let score = Math.round(
    locationFit * 0.35 + access * 0.25 + permits * 0.25 + 80 * 0.15,
  )

  const restrictions = details.restrictions || {}

  if (restrictions.permit?.issueLevel === 2) score -= 10

  if (restrictions.drone?.issueLevel === 2) score -= 5

  if (restrictions.access?.issueLevel === 2) score -= 5

  if (restrictions.permit?.issueLevel === 1) score -= 3

  if (restrictions.drone?.issueLevel === 1) score -= 2

  if (restrictions.access?.issueLevel === 1) score -= 2

  return Math.max(0, Math.min(100, score))
}

function getLabel(score) {
  if (score >= 85) return "Excellent candidate"

  if (score >= 70) return "Strong candidate"

  return "Moderate candidate"
}

function generateWarnings(details) {
  return Object.entries(details.restrictions || {})

    .filter(([, value]) => value?.issueLevel >= 1)

    .map(([type, value]) => ({
      type,

      severity: value.issueLevel === 2 ? "critical" : "warning",

      message: value.explanation || `${type} needs verification`,
    }))
}

export const orchestratorAgent = orchestrator

export default orchestrator
