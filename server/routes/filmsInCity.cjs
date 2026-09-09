const express = require("express");
const router = express.Router();
const geminiService = require("../services/geminiService.cjs");
const parallelService = require("../services/parallelService.cjs");
const imageSearchService = require("../services/imageSearchService.cjs");
const { validateWorkflowInput, sanitizeObject } = require("../utils/security.cjs");

router.post("/", async (req, res) => {
  try {
    const input = sanitizeObject(req.body);

    const validation = validateWorkflowInput(input, "films-in-city");
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

    console.log("\n=== FILMS IN CITY REQUEST ===");
    console.log(JSON.stringify(input, null, 2));

    const researchPlan = await geminiService.createResearchPlan(
      input,
      "films-in-city",
    );

    const parallelResults = await parallelService.search(researchPlan, {
      objective: `Find films actually shot in ${input.city}${input.genre ? ` in the ${input.genre} genre` : ""}. Verify actual filming locations.`,
    });

    const synthesisSchema = {
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
              director: { type: "string" },
              filmingLocation: { type: "string" },
              filmedInCity: { type: "boolean" },
              filmingLocationEvidence: { type: "string" },
              inspiration: { type: "string" },
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
    };

    const synthesis = await geminiService.synthesizeResults(
      input,
      parallelResults,
      "films-in-city",
      synthesisSchema,
    );

    const filmsWithImages = await Promise.all(
      (synthesis.films || []).map(async (film, index) => {
        try {
          console.log(
            `\n[${index + 1}/${synthesis.films.length}] Finding poster for: ${film.title}`,
          );

          const images = await imageSearchService.findBestImage(
            {
              name: `${film.title} ${film.year || ""} movie poster`,
              city: input.city,
              country: "",
            },
            { description: film.description || "" },
            null,
          );

          film.images = images || [];

          if (images.length > 0) {
            console.log(`âś… Found ${images.length} images for ${film.title}`);
          } else {
            console.log(`âš ď¸Ź No images for ${film.title}`);
          }

          return film;
        } catch (error) {
          console.error(`Error finding images for ${film.title}:`, error);
          film.images = [];
          return film;
        }
      }),
    );

    const response = {
      films: filmsWithImages,
      city: input.city,
      genre: input.genre || null,
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

    console.log("\n=== FILMS IN CITY RESULT ===");
    console.log(`Found ${response.films.length} films`);
    response.films.forEach((f, i) => {
      console.log(`${i + 1}. ${f.title} (${f.year}) - ${f.genre}`);
    });

    res.json(response);
  } catch (error) {
    console.error("Films in city error:", error);
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
