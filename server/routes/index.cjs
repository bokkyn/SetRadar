const express = require("express");
const router = express.Router();
const geminiService = require("../services/geminiService.cjs");
const parallelService = require("../services/parallelService.cjs");

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "operational",
    services: {
      gemini: geminiService.isConfigured(),
      parallel: parallelService.isConfigured(),
    },
    model: geminiService.getModel(),
    timestamp: new Date().toISOString(),
  });
});

router.get("/models", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        error: {
          code: "GEMINI_NOT_CONFIGURED",
          message: "Gemini API key not configured",
          provider: "gemini",
        },
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const models = (data.models || [])
      .filter((model) =>
        model.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((model) => ({
        name: model.name,
        displayName: model.displayName,
        supportedGenerationMethods: model.supportedGenerationMethods,
      }));

    res.json({
      count: models.length,
      models,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({
      error: {
        code: "MODELS_FETCH_ERROR",
        message: error.message,
        provider: "gemini",
      },
    });
  }
});

module.exports = router;
