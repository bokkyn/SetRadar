const express = require("express");
const router = express.Router();
const geminiService = require("../services/geminiService.cjs");
const parallelService = require("../services/parallelService.cjs");
const imageSearchService = require("../services/imageSearchService.cjs");
const { validateWorkflowInput, sanitizeObject } = require("../utils/security.cjs");

router.post("/", async (req, res) => {
  try {
    const input = sanitizeObject(req.body);

    const validation = validateWorkflowInput(input, "city-lookalike");
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

    console.log("\n=== CITY LOOKALIKE REQUEST ===");
    console.log(JSON.stringify(input, null, 2));

    if (!geminiService.isConfigured()) {
      return res.status(503).json({
        error: {
          code: "GEMINI_NOT_CONFIGURED",
          message: "Gemini API key is not configured",
          provider: "gemini",
        },
      });
    }

    if (!parallelService.isConfigured()) {
      return res.status(503).json({
        error: {
          code: "PARALLEL_NOT_CONFIGURED",
          message: "Parallel API key is not configured",
          provider: "parallel",
        },
      });
    }

    const researchPlan = await geminiService.createResearchPlan(
      input,
      "city-lookalike",
    );

    const parallelResults = await parallelService.search(researchPlan, {
      objective: `Find areas in ${input.targetCity} that visually resemble ${input.reference}. Focus on architecture, urban planning, and visual characteristics.`,
    });

     const synthesisSchema = {
       type: "object",
       properties: {
         candidates: {
           type: "array",
           maxItems: 2, 
           items: {
             type: "object",
             properties: {
               name: { type: "string" },
               area: { type: "string" },
               city: { type: "string" },
               country: { type: "string" },
               description: { type: "string" },
               resemblanceExplanation: { type: "string" },
               visualCharacteristics: {
                 type: "array",
                 items: { type: "string" },
               },
               referenceCharacteristicsMatched: {
                 type: "array",
                 items: { type: "string" },
               },
               mismatchesAndLimitations: {
                 type: "array",
                 items: { type: "string" },
               },
               matchScore: { type: "integer", minimum: 0, maximum: 100 },
               confidence: { type: "integer", minimum: 0, maximum: 100 },
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
             required: ["name", "matchScore", "confidence", "sources"],
           },
         },
       },
       required: ["candidates"],
     };

    const synthesis = await geminiService.synthesizeResults(
      input,
      parallelResults,
      "city-lookalike",
      synthesisSchema,
    );

    console.log("\n=== ADDING PHOTOS AND DETAILS ===");
    const candidatesWithDetails = await Promise.all(
      synthesis.candidates.map(async (candidate, index) => {
        try {
          console.log(
            `\n[${index + 1}/${synthesis.candidates.length}] Processing: ${candidate.name}`,
          );

          const context = {
            targetCity: input.targetCity,
            reference: input.reference,
            visualCharacteristics: candidate.visualCharacteristics || [],
            referenceCharacteristicsMatched:
              candidate.referenceCharacteristicsMatched || [],
          };

          const images = await imageSearchService.findBestImage(
            candidate,
            context,
            parallelResults,
          );
          candidate.images = images || [];

          const details = await geminiService.analyzeLocationDetails(
            candidate,
            context,
          );
          candidate.details = details;
          candidate.logistics = details.logistics;
          candidate.restrictions = details.restrictions;
          candidate.keywords = details.keywords;
          candidate.scores = details.scores;

          candidate.canWeShootScore = calculateCanWeShoot(details);
          candidate.canWeShootLabel = getCanWeShootLabel(
            candidate.canWeShootScore,
          );

          candidate.warnings = generateWarnings(details);

          console.log(
            `✅ ${candidate.name}: ${images.length} images, score: ${candidate.canWeShootScore}`,
          );

          return candidate;
        } catch (error) {
          console.error(`Error processing ${candidate.name}:`, error);
          candidate.images = [];
          candidate.details = null;
          return candidate;
        }
      }),
    );

    const response = {
      candidates: candidatesWithDetails,
      targetCity: input.targetCity,
      reference: input.reference,
      research: {
        provider: "Parallel Search API",
        queries: researchPlan.search_queries,
        resultCount: parallelResults.results.length,
      },
    };

    console.log("\n=== FINAL RESULTS ===");
    response.candidates.forEach((c, i) => {
      console.log(
        `${i + 1}. ${c.name}: ${c.images?.length ? `✅ ${c.images.length} images` : "❌ No images"}`,
      );
    });

    res.json(response);
  } catch (error) {
    console.error("City lookalike error:", error);
    handleError(res, error);
  }
});

function calculateCanWeShoot(details) {
  const { locationFit = 0, access = 0, permits = 0 } = details.scores || {};
  const weather = 80;

  let score = Math.round(
    locationFit * 0.35 + access * 0.25 + permits * 0.25 + weather * 0.15,
  );

  const restrictions = details.restrictions || {};
  if (restrictions.permit?.issueLevel === 2) score -= 10;
  if (restrictions.drone?.issueLevel === 2) score -= 5;
  if (restrictions.access?.issueLevel === 2) score -= 5;
  if (restrictions.permit?.issueLevel === 1) score -= 3;
  if (restrictions.drone?.issueLevel === 1) score -= 2;
  if (restrictions.access?.issueLevel === 1) score -= 2;

  return Math.max(0, Math.min(100, score));
}

function getCanWeShootLabel(score) {
  if (score >= 85) return "Excellent candidate";
  if (score >= 70) return "Strong candidate";
  return "Moderate candidate";
}

function generateWarnings(details) {
  const warnings = [];
  const restrictions = details.restrictions || {};

  if (restrictions.permit?.issueLevel === 1) {
    warnings.push({
      type: "permit",
      severity: "warning",
      message:
        restrictions.permit.explanation || "Permit status needs verification.",
    });
  }
  if (restrictions.permit?.issueLevel === 2) {
    warnings.push({
      type: "permit",
      severity: "critical",
      message: restrictions.permit.explanation || "Permit required.",
    });
  }
  if (restrictions.drone?.issueLevel === 1) {
    warnings.push({
      type: "drone",
      severity: "warning",
      message: restrictions.drone.explanation || "Drone use may be restricted.",
    });
  }
  if (restrictions.drone?.issueLevel === 2) {
    warnings.push({
      type: "drone",
      severity: "critical",
      message: restrictions.drone.explanation || "Drone use prohibited.",
    });
  }
  if (restrictions.access?.issueLevel === 1) {
    warnings.push({
      type: "access",
      severity: "warning",
      message: restrictions.access.explanation || "Access needs verification.",
    });
  }
  if (restrictions.access?.issueLevel === 2) {
    warnings.push({
      type: "access",
      severity: "critical",
      message: restrictions.access.explanation || "Access limited.",
    });
  }

  return warnings;
}

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
