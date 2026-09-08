import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
const { agentRoutes } = await import("./agents/express-adapter.js");

const app = express();
const PORT = process.env.PORT || 4000;

const indexRoutes = require("./routes/index.js");
const locationScoutRoutes = require("./routes/locationScout.js");
const cityLookalikeRoutes = require("./routes/cityLookalike.js");
const filmsInCityRoutes = require("./routes/filmsInCity.js");
const historyCheckRoutes = require("./routes/historyCheck.js");
const { antiAbuseMiddleware } = require("./utils/security.js");

app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(antiAbuseMiddleware);

app.use((req, res, next) => {
  const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  req.requestId = requestId;
  res.setHeader("X-SetRadar-Request-Id", requestId);
  console.log(
    `${new Date().toISOString()} [${requestId}] - ${req.method} ${req.path}`,
  );
  res.on("finish", () => {
    console.log(
      `${new Date().toISOString()} [${requestId}] - ${req.method} ${req.path} -> ${res.statusCode}`,
    );
  });
  next();
});

app.use("/api", indexRoutes);
app.use("/api/search-location", locationScoutRoutes);
app.use("/api/city-lookalike", cityLookalikeRoutes);
app.use("/api/films-in-city", filmsInCityRoutes);
app.use("/api/history-check", historyCheckRoutes);

agentRoutes(app);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ENDPOINT_NOT_FOUND",
      message: `Endpoint ${req.method} ${req.path} not found`,
      provider: "server",
    },
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    code: err.code,
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      provider: "server",
    },
  });
});

app.listen(PORT, () => {
  console.log("=================================");
  console.log("đźŽ¬ SetRadar Backend Server (ADK Multi-Agent)");
  console.log("=================================");
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(
    `Gemini API: ${process.env.GEMINI_API_KEY ? "âś… Configured" : "âťŚ Missing"}`,
  );
  console.log(
    `Parallel API: ${process.env.PARALLEL_API_KEY ? "âś… Configured" : "âťŚ Missing"}`,
  );
  console.log(
    `Gemini Model: ${process.env.GEMINI_MODEL || "gemini-1.5-flash"}`,
  );
  console.log("=================================");
  console.log("\nAvailable endpoints:");
  console.log("  GET  /api/health");
  console.log("  GET  /api/models");
  console.log("  POST /api/search-location (legacy)");
  console.log("  POST /api/city-lookalike (legacy)");
  console.log("  POST /api/films-in-city (legacy)");
  console.log("  POST /api/history-check (legacy)");
  console.log("  --- ADK Agent Endpoints ---");
  console.log("  POST /api/agent/scout");
  console.log("  POST /api/agent/scout-stream");
  console.log("  GET  /api/agent/health");
  console.log("=================================\n");
});
