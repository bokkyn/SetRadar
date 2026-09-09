const express = require("express");
const router = express.Router();
const geminiService = require("../services/geminiService.cjs");
const parallelService = require("../services/parallelService.cjs");
const { validateWorkflowInput, sanitizeObject } = require("../utils/security.cjs");

router.post("/", async (req, res) => {
  try {
    const input = sanitizeObject(req.body);

    const validation = validateWorkflowInput(input, "history-check");
    if (!validation.isValid) {
      return res.status(400).json({
        error: {
          code: "INVALID_INPUT",
          message: validation.errors.join(", "),
          warnings: validation.warnings,
          provider: "validation",
        },
      });
    }

    console.log("\n=== HISTORY CHECK REQUEST ===");
    console.log(JSON.stringify(input, null, 2));

    const researchPlan = await geminiService.createResearchPlan(
      input,
      "history-check",
    );

    const parallelResults = await parallelService.search(researchPlan, {
      objective: `Verify the historical accuracy of ${input.location} in ${input.storyYear}. Investigate buildings, streets, transportation, and urban landscape.`,
      maxCharsTotal: 40000,
    });

    const synthesisSchema = {
      type: "object",
      properties: {
        overallFit: {
          type: "string",
          enum: ["confirmed", "likely", "verify", "incompatible"],
        },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        summary: { type: "string" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              category: {
                type: "string",
                enum: ["confirmed", "likely", "potential-issue", "verify"],
              },
              claim: { type: "string" },
              explanation: { type: "string" },
            },
            required: ["category", "claim", "explanation"],
          },
        },
        whatToVerify: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: [
        "overallFit",
        "confidence",
        "summary",
        "findings",
        "whatToVerify",
      ],
    };

    const synthesis = await geminiService.synthesizeResults(
      input,
      parallelResults,
      "history-check",
      synthesisSchema,
    );

    const response = {
      ...synthesis,
      location: input.location,
      storyYear: input.storyYear,
      research: {
        provider: "Parallel Search API",
        queries: researchPlan.search_queries,
        resultCount: parallelResults.results.length,
        sources: parallelResults.results.map((r) => ({
          title: r.title,
          url: r.url,
          domain: r.domain,
        })),
      },
    };

    console.log("\n=== HISTORY CHECK RESULT ===");
    console.log(`Overall fit: ${response.overallFit}`);
    console.log(`Findings: ${response.findings.length}`);

    res.json(response);
  } catch (error) {
    console.error("History check error:", error);
    handleError(res, error);
  }
});

function handleError(res, error) {
  const statusMap = {
    GEMINI_NOT_CONFIGURED: 503,
    PARALLEL_NOT_CONFIGURED: 503,
    GEMINI_RATE_LIMIT: 429,
    PARALLEL_RATE_LIMIT: 429,
    GEMINI_UNAVAILABLE: 503,
    PARALLEL_UNAVAILABLE: 503,
    GEMINI_ERROR: 500,
    PARALLEL_ERROR: 500,
    MISSING_FIELDS: 400,
    INVALID_INPUT: 400,
  };

  const status = statusMap[error.code] || 500;
  res.status(status).json({
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An unexpected error occurred",
      provider: error.provider || "unknown",
    },
  });
}

module.exports = router;
