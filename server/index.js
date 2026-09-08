const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { createRequire } = require("node:module");

const cjsRequire = createRequire(__filename);

async function start() {
  const [{ config }, { errorHandler }, { apiRouter }] = await Promise.all([
    import("./config.js"),
    import("./middleware.js"),
    import("./routes.js"),
  ]);
  const locationScoutRoutes = cjsRequire("./routes/locationScout.js");
  const app = express();

  if (!config.mongoUri) {
    console.error("MONGODB_URI is not set in server/.env.");
    process.exit(1);
  }

  mongoose
    .connect(config.mongoUri, { dbName: config.mongoDb })
    .then(() => console.log("Connected to MongoDB"))
    .catch((error) => {
      console.error("MongoDB connection error:", error);
      process.exit(1);
    });

  const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:8443")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin))
          return callback(null, true);
        callback(new Error("CORS origin is not allowed."));
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/search-location", locationScoutRoutes);
  app.use("/api", apiRouter);
  app.use(errorHandler);

  app.listen(config.port, () => {
    console.log(`Express API listening on http://localhost:${config.port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start Express API:", error);
  process.exit(1);
});
