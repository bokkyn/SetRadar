const express = require("express");
const router = express.Router();
const imageSearchService = require("../services/imageSearchService");
const {
  validateWorkflowInput,
  validateCityExists,
  getScoutPreflightFallback,
  validateResearchInput,
  sanitizeObject,
} = require("../utils/security");

const DUMMY_DATA = false;

const DUMMY_CANDIDATES = [
  {
    name: "Former Gredelj Railway Complex",
    address: "Paromlinska cesta 51",
    city: "Zagreb",
    country: "Croatia",
    description: "Abandoned industrial complex with large concrete structures",
    whyMatches: "Industrial environment with exposed steel and concrete",
    matchScore: 88,
    matchExplanation:
      "Strong visual match for abandoned industrial environment",
    images: [],
  },
  {
    name: "Kockica",
    address: "Prisavlje 14",
    city: "Zagreb",
    country: "Croatia",
    description:
      "Modernist concrete building from 1968, designed by Ivan VitiÄ‡",
    whyMatches: "Bold concrete aesthetic and geometric forms",
    matchScore: 85,
    matchExplanation: "Striking modernist and brutalist concrete architecture",
    images: [],
  },
  {
    name: "Arena Zagreb",
    address: "LaniĹˇte",
    city: "Zagreb",
    country: "Croatia",
    description: "Modern indoor arena with huge white concrete pillars",
    whyMatches: "Massive scale and modern monolithic concrete pillars",
    matchScore: 80,
    matchExplanation: "Features 86 large curved concrete columns",
    images: [],
  },
];

router.post("/", async (req, res) => {
  const requestId = req.requestId || "unknown";
  try {
    if (DUMMY_DATA) {
      console.log("\n=== TESTING MODE (DUMMY_DATA) ===");

      const candidatesWithDetails = await Promise.all(
        DUMMY_CANDIDATES.map(async (candidate, index) => {
          console.log(
            `\n[${index + 1}/${DUMMY_CANDIDATES.length}] Processing: ${candidate.name}`,
          );

          const context = {
            description: "industrial abandoned location for car commercial",
            location: "Zagreb, Croatia",
            city: candidate.city,
            country: candidate.country,
          };

          const images = await imageSearchService.findBestImage(
            candidate,
            context,
            null,
          );
          candidate.images = images;

          const details = await analyzeLocationDetails(candidate, context);
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
            `âś… ${candidate.name}: ${images.length} images, score: ${candidate.canWeShootScore}`,
          );

          return candidate;
        }),
      );

      return res.json({
        candidates: candidatesWithDetails,
        research: {
          provider: "DUMMY_DATA",
          queries: [],
          resultCount: 0,
          sources: [],
        },
      });
    }

    const geminiService = require("../services/geminiService");
    const parallelService = require("../services/parallelService");
    const input = sanitizeObject(req.body);

    let preflight;
    if (geminiService.isConfigured()) {
      console.log("[SetRadar preflight] Checking legacy scout request with Gemini", {
        location: input.location,
        description: input.description,
      });
      preflight = await geminiService.validateLocationScoutRequest({
        location: input.location,
        description: input.description,
      });
      console.log("[SetRadar preflight] Gemini decision", preflight);
    } else {
      console.warn(
        "[SetRadar preflight] Gemini is not configured; using deterministic validation",
      );
    }
    const fallback = getScoutPreflightFallback(input.description);
    if (fallback || preflight?.allowed === false) {
      const rejection = fallback || preflight;
      return res.status(400).json({
        error: {
          code: fallback ? "OFF_TOPIC_QUERY" : preflight.issueType.toUpperCase(),
          message: rejection.message,
          provider: fallback ? "setradar-preflight-safety-net" : "gemini-preflight",
        },
      });
    }

    const researchValidation = validateResearchInput({
      location: input.location,
      description: input.description,
      radius: input.radiusKm,
    });
    if (!researchValidation.isValid) {
      const first = researchValidation.errors[0];
      return res.status(400).json({
        error: {
          code: first.code,
          message: first.message,
          details: researchValidation.errors,
          provider: "validation",
        },
      });
    }
    const cityValidation = await validateCityExists(input.location)
    if (!cityValidation.isValid) {
      return res.status(400).json({ error: cityValidation.error })
    }

    const validation = validateWorkflowInput(input, "location-scout");
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

    console.log(`\n=== LOCATION SCOUT REQUEST [${requestId}] ===`);
    console.log({
      requestId,
      location: input.location,
      radiusKm: input.radiusKm,
      descriptionLength: input.description?.length || 0,
    });

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

    console.log(`[${requestId}] Creating Gemini research plan`);
    const researchPlan = await geminiService.createResearchPlan(
      input,
      "location-scout",
    );
    console.log("\nResearch Plan:", JSON.stringify(researchPlan, null, 2));

    console.log(`[${requestId}] Searching with Parallel`);
    const parallelResults = await parallelService.search(researchPlan, {
      objective: `Find real-world filming locations matching: ${input.description} near ${input.location}. Include permit information and accessibility details.`,
    });

    const synthesisSchema = {
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
              coordinates: { type: "string" },
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
            required: ["name", "matchScore", "matchExplanation", "sources"],
          },
        },
      },
      required: ["candidates"],
    };

    console.log(`[${requestId}] Synthesizing candidates with Gemini`);
    const synthesis = await geminiService.synthesizeResults(
      input,
      parallelResults,
      "location-scout",
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
            description: input.description,
            location: input.location,
            sceneType: input.sceneType,
            city: candidate.city,
            country: candidate.country,
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
      research: {
        provider: "Parallel Search API",
        searchId: parallelResults.search_id,
        queries: researchPlan.search_queries,
        resultCount: parallelResults.results.length,
        sources: parallelResults.results.map((r) => ({
          title: r.title,
          url: r.url,
          domain: r.domain,
        })),
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Location scout error:", {
      requestId,
      code: error.code,
      provider: error.provider,
      message: error.message,
      status: error.status,
      stack: error.stack,
    });
    handleError(res, error);
  }
});

/**
 * Analiziraj detalje lokacije (za DUMMY_MODE koristi fallback podatke)
 */
async function analyzeLocationDetails(candidate, context) {
  try {
    const geminiService = require("../services/geminiService");
    return await geminiService.analyzeLocationDetails(candidate, context);
  } catch (error) {
    console.error(`Details analysis error: ${error.message}`);
    return {
      description: candidate.description || "",
      whyItFits: candidate.whyMatches || "",
      keywords: ["concrete", "modernist", "urban"],
      logistics: {
        distanceKm: 0,
        travelTimeMin: 0,
        vehicleAccess: "verify",
      },
      restrictions: {
        permit: {
          status: "verify",
          issueLevel: 1,
          explanation: "Permit status needs verification before production.",
        },
        drone: {
          status: "verify",
          issueLevel: 1,
          explanation: "Drone restrictions need verification.",
        },
        access: {
          status: "verify",
          issueLevel: 1,
          explanation: "Access hours need verification.",
        },
      },
      scores: {
        locationFit: candidate.matchScore || 0,
        access: 70,
        permits: 50,
      },
      sources: [],
    };
  }
}

/**
 * IzraÄŤunaj ukupni rezultat "Can we shoot this?"
 */
function calculateCanWeShoot(details) {
  const { locationFit = 0, access = 0, permits = 0 } = details.scores || {};
  const weather = 80;

  let score = Math.round((locationFit + access + permits + weather) / 4);

  const restrictions = details.restrictions || {};
  if (restrictions.permit?.issueLevel === 2) score -= 10;
  if (restrictions.drone?.issueLevel === 2) score -= 5;
  if (restrictions.access?.issueLevel === 2) score -= 5;
  if (restrictions.permit?.issueLevel === 1) score -= 3;
  if (restrictions.drone?.issueLevel === 1) score -= 2;
  if (restrictions.access?.issueLevel === 1) score -= 2;

  return Math.max(60, Math.min(100, score));
}

/**
 * Dobij labelu na temelju rezultata
 */
function getCanWeShootLabel(score) {
  if (score >= 85) return "Excellent candidate";
  if (score >= 70) return "Strong candidate";
  return "Moderate candidate";
}

/**
 * Generiraj warnings na temelju restrikcija
 */
function generateWarnings(details) {
  const warnings = [];
  const restrictions = details.restrictions || {};

  if (restrictions.permit?.issueLevel === 1) {
    warnings.push({
      type: "permit",
      severity: "warning",
      message:
        restrictions.permit.explanation ||
        "Permit status needs verification before production.",
    });
  }
  if (restrictions.permit?.issueLevel === 2) {
    warnings.push({
      type: "permit",
      severity: "critical",
      message:
        restrictions.permit.explanation ||
        "Permit required and may be difficult to obtain.",
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
      message:
        restrictions.drone.explanation || "Drone use prohibited in this area.",
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
      message:
        restrictions.access.explanation || "Access limited or restricted.",
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
    PARALLEL_AUTH_ERROR: 401,
    MISSING_FIELDS: 400,
    INVALID_INPUT: 400,
  };

  const status = statusMap[error.code] || 500;

  console.error("Location scout response", {
    requestId: res.getHeader("X-SetRadar-Request-Id"),
    status,
    code: error.code || "INTERNAL_ERROR",
    provider: error.provider || "unknown",
    message: error.message || "An unexpected error occurred",
  });

  res.status(status).json({
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: error.message || "An unexpected error occurred",
      provider: error.provider || "unknown",
    },
  });
}

module.exports = router;
