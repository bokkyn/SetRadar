let appPromise;

module.exports = async function handler(req, res) {
  appPromise ||= import("../server/setradarServer.js").then(
    ({ default: app }) => app,
  );
  const app = await appPromise;
  return app(req, res);
};
