export function asyncRoute(handler) {
  return (req, res, next) =>
    Promise.resolve(handler(req, res, next)).catch(next);
}

export function errorHandler(error, req, res, _next) {
  const status = error.status || 500;
  console.error(
    `[api] ${req.method} ${req.originalUrl} failed (${status})`,
    error,
  );
  const message =
    status >= 500
      ? "The server could not complete this request."
      : status === 404
        ? "Resource not found."
        : error.message || "The request was invalid.";
  res.status(status).json({
    error: { code: error.code || "INTERNAL_ERROR", message },
  });
}

export function requireFields(fields) {
  return (req, _res, next) => {
    const missing = fields.filter(
      (field) =>
        typeof req.body?.[field] !== "string" || !req.body[field].trim(),
    );
    if (missing.length) {
      const error = new Error(
        `Missing required fields: ${missing.join(", ")}.`,
      );
      error.status = 400;
      return next(error);
    }
    next();
  };
}

export function requireEmail(field = "email") {
  return (req, _res, next) => {
    const value = req.body?.[field];
    if (
      typeof value !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ) {
      const error = new Error("Enter a valid email address.");
      error.status = 400;
      error.code = "INVALID_EMAIL";
      return next(error);
    }
    next();
  };
}
