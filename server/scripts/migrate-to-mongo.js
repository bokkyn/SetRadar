import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

import { Location } from "../models/Location.js";
import { Project } from "../models/Project.js";
import { User } from "../models/User.js";
import { ProductionNote } from "../models/ProductionNote.js";

async function migrate() {
  console.log("🔄 Starting migration from db.json to MongoDB...");

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: process.env.MONGODB_DB || "setradar",
  });
  console.log("✅ Connected to MongoDB");

  const dbPath = path.join(__dirname, "../../db.json");
  if (!fs.existsSync(dbPath)) {
    console.log("⚠️ db.json not found, skipping migration");
    process.exit(0);
  }

  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  console.log(`📖 Read db.json with ${Object.keys(db).length} collections`);

  const collections = {
    users: User,
    locations: Location,
    projects: Project,
    productionNotes: ProductionNote,
  };

  for (const [key, Model] of Object.entries(collections)) {
    if (!db[key] || db[key].length === 0) {
      console.log(`⏭️ Skipping ${key} (no data)`);
      continue;
    }

    console.log(`📥 Migrating ${db[key].length} ${key}...`);

    await Model.deleteMany({});

    const result = await Model.insertMany(db[key]);
    console.log(`✅ Migrated ${result.length} ${key}`);
  }

  console.log("🎉 Migration complete!");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});
