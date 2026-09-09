import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { start } = require("../server/index.cjs");

let appPromise;

export default async function handler(req, res) {
  appPromise ||= start({ listen: false });
  const app = await appPromise;
  return app(req, res);
}
