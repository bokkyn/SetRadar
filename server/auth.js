import jwt from "jsonwebtoken";
import { config } from "./config.js";

function authError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export function signToken(user) {
  if (!config.jwtSecret) {
    throw authError(
      500,
      "AUTH_CONFIGURATION_ERROR",
      "Account authentication is not configured on this server.",
    );
  }
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export function requireAuth(req, _res, next) {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return next(authError(401, "AUTH_REQUIRED", "Authentication required."));
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(authError(401, "AUTH_INVALID", "Your session is invalid or expired."));
  }
}

export function requireOwnership(resource, userId) {
  if (resource?.ownerId !== userId && resource?.userId !== userId) {
    throw authError(
      403,
      "FORBIDDEN",
      "You do not have access to this resource.",
    );
  }
}

export function authErrorResponse(error, res) {
  const status = error.status || 500;
  const safeMessages = new Set([
    "Authentication required.",
    "Your session is invalid or expired.",
    "You do not have access to this resource.",
    "Resource not found.",
    "Account authentication is not configured on this server.",
  ]);
  res.status(status).json({
    error: {
      code: error.code || "INTERNAL_ERROR",
      message: safeMessages.has(error.message)
        ? error.message
        : status >= 500
          ? "The server could not complete this request."
          : error.message || "The request was invalid.",
    },
  });
}
