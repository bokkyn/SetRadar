import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(directory, ".env") });

const port = Number(process.env.API_PORT || 3000);
const jsonServerUrl = process.env.JSON_SERVER_URL || "http://localhost:3001";
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "8h";
const mongoUri = process.env.MONGODB_URI;
const mongoDb = process.env.MONGODB_DB || "setradar";

export const config = {
  port,
  jsonServerUrl,
  jwtSecret,
  jwtExpiresIn,
  mongoUri,
  mongoDb,
};



