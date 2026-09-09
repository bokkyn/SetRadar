import orchestratorAgent, {
  cityMatchAgent,
  filmSearchAgent,
  historyCheckAgent,
} from "./index.js"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const geminiService = require("../services/geminiService.cjs")
const {
  getScoutPreflightFallback,
  validateCityExists,
  validateResearchInput,
} = require("../utils/security.cjs")

const runAgentTool = async (agent, args) => {
  const tool = agent.tools[0]

  return tool.runAsync({ args })
}

const errorDetails = (error) => ({
  code: error?.code || "AGENT_ERROR",

  message: error?.message || String(error),

  provider: error?.provider,
})


export const agentRoutes = (app) => {
  app.post("/api/agent/city-match", async (req, res) => {
    try {
      res.json(await runAgentTool(cityMatchAgent, req.body))
    } catch (error) {
      console.error("City match agent error:", errorDetails(error), error)

      res.status(500).json({
        error: errorDetails(error),
      })
    }
  })

  app.post("/api/agent/films", async (req, res) => {
    try {
      res.json(await runAgentTool(filmSearchAgent, req.body))
    } catch (error) {
      console.error("Film search agent error:", errorDetails(error), error)

      res.status(500).json({
        error: errorDetails(error),
      })
    }
  })

  app.post("/api/agent/history", async (req, res) => {
    try {
      res.json(await runAgentTool(historyCheckAgent, req.body))
    } catch (error) {
      console.error("History agent error:", errorDetails(error), error)

      res.status(500).json({
        error: errorDetails(error),
      })
    }
  })


  app.post("/api/agent/scout", async (req, res) => {
    try {
      const { location, description, radius, storyYear } = req.body

      if (!location || !description) {
        return res.status(400).json({
          error: "Location and description are required",
        })
      }

      let preflight
      if (geminiService.isConfigured()) {
        console.log("[SetRadar preflight] Checking scout request with Gemini", {
          location,
          description,
        })
        preflight = await geminiService.validateLocationScoutRequest({
          location,
          description,
        })
        console.log("[SetRadar preflight] Gemini decision", preflight)
      } else {
        console.warn(
          "[SetRadar preflight] Gemini is not configured; using deterministic validation",
        )
      }
      const fallback = getScoutPreflightFallback(description)
      if (fallback || preflight?.allowed === false) {
        const rejection = fallback || preflight
        return res.status(400).json({
          error: {
            code: fallback ? "OFF_TOPIC_QUERY" : preflight.issueType.toUpperCase(),
            message: rejection.message,
            provider: fallback ? "setradar-preflight-safety-net" : "gemini-preflight",
          },
        })
      }

      const validation = validateResearchInput({ location, description, radius })
      if (!validation.isValid) {
        const first = validation.errors[0]
        return res.status(400).json({
          error: {
            code: first.code,
            message: first.message,
            details: validation.errors,
            provider: "validation",
          },
        })
      }
      const cityValidation = await validateCityExists(location)
      if (!cityValidation.isValid) {
        return res.status(400).json({ error: cityValidation.error })
      }

      console.log("\nđźŽ¬ Agent Request:")

      console.log(`  Location: ${location}`)

      console.log(`  Description: ${description}`)

      console.log(`  Radius: ${radius || 50}km`)

      if (storyYear) console.log(`  Year: ${storyYear}`)


      const result = await orchestratorAgent.process({
        location,

        description,

        radius: radius || 50,

        storyYear: storyYear || null,
      })

      res.json(result)
    } catch (error) {
      console.error("Agent error:", errorDetails(error), error)

      res.status(500).json({
        error: { ...errorDetails(error), details: error?.stack },
      })
    }
  })


  app.post("/api/agent/scout-stream", async (req, res) => {
    const { location, description, radius, storyYear } = req.body

    

    res.setHeader("Content-Type", "text/event-stream")

    res.setHeader("Cache-Control", "no-cache")

    res.setHeader("Connection", "keep-alive")

    try {

      res.write(
        `data: ${JSON.stringify({ status: "starting", message: "Agent processing started" })}\n\n`,
      )


      const result = await orchestratorAgent.process({
        location,

        description,

        radius: radius || 50,

        storyYear: storyYear || null,
      })


      res.write(`data: ${JSON.stringify({ status: "complete", result })}\n\n`)

      res.write("data: [DONE]\n\n")

      res.end()
    } catch (error) {
      console.error("Stream error:", error)

      res.write(
        `data: ${JSON.stringify({ status: "error", error: error.message })}\n\n`,
      )

      res.end()
    }
  })


  app.get("/api/agent/health", (req, res) => {
    res.json({
      status: "operational",

      agent: orchestratorAgent.name || "cinema_orchestrator",

      agents: [
        ...(orchestratorAgent.subAgents || []).map((agent) => agent.name),

        cityMatchAgent.name,

        filmSearchAgent.name,

        historyCheckAgent.name,
      ],

      version: "1.0.0",

      services: {
        gemini: !!process.env.GEMINI_API_KEY,

        parallel: !!process.env.PARALLEL_API_KEY,
      },
    })
  })
}
