const cors = require("cors");
const express = require("express");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { createRequire } = require("node:module");

const cjsRequire = createRequire(__filename);

let appPromise;

async function start({ listen = true } = {}) {
  if (appPromise) return appPromise;

  appPromise = (async () => {
  const [{ config }, { errorHandler }, { apiRouter }] = await Promise.all([
    import("./config.js"),
    import("./middleware.js"),
    import("./routes.js"),
  ]);
  const locationScoutRoutes = cjsRequire("./routes/locationScout.cjs");
  const app = express();

  if (!config.mongoUri) throw new Error("MONGODB_URI is not set in server/.env.");

  await mongoose.connect(config.mongoUri, { dbName: config.mongoDb });
  console.log("Connected to MongoDB");

  app.use(helmet());
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/search-location", locationScoutRoutes);
  app.use("/api", apiRouter);
  app.use(errorHandler);

  if (listen) {
    app.listen(config.port, () => {
      console.log(`Express API listening on http://localhost:${config.port}`);
    });
  }

  return app;
  })();

  return appPromise;
}

module.exports = { start };

if (require.main === module) {
  start().catch((error) => {
    console.error("Failed to start Express API:", error);
    process.exit(1);
  });
}
