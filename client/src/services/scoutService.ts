import {
  normalizeCandidate,
  postBackend,
  type BackendCandidate,
} from "./backendApi"
import { cacheLocations } from "./locationService"
import type { ResearchResult, ScoutQuery } from "../types/research"

const LAST_RESULT_KEY = "setradar-last-research-result"

export function loadLastResearchResult(): ResearchResult | null {
  try {
    const raw = localStorage.getItem(LAST_RESULT_KEY)
    return raw ? JSON.parse(raw) as ResearchResult : null
  } catch (error) {
    console.warn("[SetRadar] Could not restore the last research result", error)
    return null
  }
}

export const scoutStages = [
  "Collecting sources",
  "Searching for relevant places",
  "Checking geographic constraints",
  "Evaluating production fit",
]

export async function findLocations(
  query: ScoutQuery,
): Promise<ResearchResult> {
  try {
    console.log("🔧 AGENT: Using Google ADK multi-agent system")
    const response = await postBackend<{ candidates?: BackendCandidate[] }>(
      "/api/agent/scout",
      {
        description: query.prompt,
        location: query.location,
        radius: query.radiusKm,
        projectType: query.projectType,
        sceneTypes: query.sceneTypes,
        permit: query.permit,
      },
    )
    const locations = (response.candidates || []).map((candidate, index) =>
      normalizeCandidate(candidate, index),
    )
    cacheLocations(locations)
    const result: ResearchResult = {
      id: `res-${Date.now()}`,
      title: query.prompt,
      summary: `Candidate locations near ${query.location}.`,
      locations,
      sources: [],
      confidence: "likely",
      warnings: [],
    }
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result))
    return result
  } catch (error) {
    console.error("[SetRadar] Live location research failed", error)
    throw error
  }
}
