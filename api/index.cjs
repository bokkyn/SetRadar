const { start } = require("../server/index.js");

let appPromise;

module.exports = async function handler(req, res) {
  appPromise ||= start({ listen: false });
  const app = await appPromise;
  return app(req, res);
};
