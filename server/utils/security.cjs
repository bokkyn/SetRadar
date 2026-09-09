const MAX_INPUT_LENGTH = 500;
const MAX_CONTEXT_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 500;

const OUT_OF_SCOPE_PATTERNS = [
  /calculate|math|equation|solve|compute|algebra|arithmetic/i,
  /code|programming|script|function|algorithm|debug|compile|python|javascript|java|rust|go|c\+\+|typescript|react|node|express/i,
  /translate|language|translation|spanish|french|german|chinese|japanese|korean|russian/i,
  /write|compose|draft|essay|poem|story|article|blog|email|letter|resume|cover letter|summary|paraphrase/i,
  /advice|recommend|suggest|counsel|therapy|mental health|relationship|career|financial|investment/i,
  /political|election|party|vote|government|policy|ideology|activism|protest/i,
  /pretend|act as|roleplay|you are now|become|imagine you are|system prompt|developer prompt|hidden prompt|instructions/i,
  /ignore|forget|override|bypass|disregard|skip|previous instructions|system instructions/i,
  /reveal|expose|output|show|display|print|your prompt|your system|your instructions|api key|secret|credential/i,
  /execute|run|command|terminal|shell|bash|cmd|powershell|system|os|file|delete|rm|mkdir|chmod|sudo/i,
  /who are you|what are you|what is your purpose|describe yourself/i,
];

function isOutOfScope(text) {
  if (!text || typeof text !== "string") return false;
  for (const pattern of OUT_OF_SCOPE_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  const cleanText = text.replace(/[^a-zA-Z0-9\s,.'-]/g, "").trim();
  if (cleanText.length < 2) return true;
  const letterCount = (cleanText.match(/[a-zA-Z]/g) || []).length;
  if (letterCount / cleanText.length < 0.3 && cleanText.length > 5) return true;
  return false;
}

function validateLocationName(location) {
  if (!location || typeof location !== "string") return false;
  const trimmed = location.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  const cleanText = trimmed.replace(/[^a-zA-Z0-9\s,.'-]/g, "");
  const letterCount = (cleanText.match(/[a-zA-Z]/g) || []).length;
  if (letterCount / cleanText.length < 0.3 && cleanText.length > 5)
    return false;
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  const words = trimmed.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (words.some((word) => /[^aeiou]{5,}/.test(word))) return false;
  return true;
}

const KNOWN_NON_CITIES = new Set([
  "atlantis",
  "gotham",
  "hogwarts",
  "wakanda",
  "narnia",
  "springfield",
  "middle earth",
]);

const KNOWN_CITY_COUNTRIES = new Map([
  ["london, croatia", "London is in the United Kingdom, not Croatia."],
  ["paris, italy", "Paris is in France, not Italy."],
  ["rome, france", "Rome is in Italy, not France."],
]);

async function validateCityExists(location) {
  const query = typeof location === "string" ? location.trim() : "";
  if (!query || !validateLocationName(query)) {
    return {
      isValid: false,
      error: {
        code: "INVALID_CITY",
        message: "That city does not exist in the real world.",
      },
    };
  }

  const knownError = KNOWN_CITY_COUNTRIES.get(query.toLowerCase());
  if (knownError) {
    return {
      isValid: false,
      error: { code: "CITY_COUNTRY_MISMATCH", message: knownError },
    };
  }

  const [cityName] = query.split(",").map((part) => part.trim());
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", cityName || query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "SetRadar/1.0 (city validation)" },
    });
    if (!response.ok) throw new Error(`Geocoding returned ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.results) || data.results.length === 0) {
      if (query.includes(",")) return { isValid: true };
      return {
        isValid: false,
        error: {
          code: "CITY_NOT_FOUND",
          message: `"${query}" does not exist in the real world. Check the city and country.`,
        },
      };
    }
    return { isValid: true };
  } catch (error) {
    console.warn("[SetRadar validation] City lookup unavailable", {
      location: query,
      message: error instanceof Error ? error.message : String(error),
    });
    return { isValid: true };
  }
}

function getScoutPreflightFallback(description) {
  const text = typeof description === "string" ? description.trim() : "";
  if (!text) return null;
  const checks = [
    {
      pattern: /\b(capital|president|population|who is|where is|when was|what is)\b/i,
      message: "That sounds like an atlas question, not a location brief. Try describing the scene you want to shoot.",
    },
    {
      pattern: /\b(convert|how long is|how many|miles|kilometers|km|calories|currency)\b/i,
      message: "I scout places, I do not convert units. Bring me a shootable scene and I will bring you locations.",
    },
    {
      pattern: /\b(code|program|programming|debug|equation|calculate|math|solve)\b/i,
      message: "My calculator is on a coffee break. Describe a film, TV, or video scene instead.",
    },
    {
      pattern: /\b(advice|loan|credit|investment|relationship|therapy)\b/i,
      message: "That belongs with a qualified adviser, not a location scout. I find places to film.",
    },
  ];
  return checks.find(({ pattern }) => pattern.test(text)) || null;
}

function validateResearchInput(input) {
  const errors = [];
  const location = typeof input?.location === "string" ? input.location.trim() : "";
  const description =
    typeof input?.description === "string" ? input.description.trim() : "";

  if (!validateLocationName(location)) {
    errors.push({
      code: "INVALID_CITY",
      message:
        "That city does not exist in the real world. Enter a real city and country.",
    });
  } else if (KNOWN_NON_CITIES.has(location.toLowerCase())) {
    errors.push({
      code: "CITY_NOT_FOUND",
      message: `"${location}" could not be found. Check the city name and country.`,
    });
  } else if (KNOWN_CITY_COUNTRIES.has(location.toLowerCase())) {
    errors.push({
      code: "CITY_COUNTRY_MISMATCH",
      message: KNOWN_CITY_COUNTRIES.get(location.toLowerCase()),
    });
  }

  if (isOutOfScope(description)) {
    errors.push({
      code: "OFF_TOPIC_QUERY",
      message:
        "I help find filming locations, not solve personal problems.",
    });
  } else if (description.length < 10) {
    errors.push({
      code: "DESCRIPTION_TOO_SHORT",
      message: "Describe the scene or location in at least 10 characters.",
    });
  }

  const contradictory =
    (/\bindoor\b/i.test(description) && /\boutdoor\b/i.test(description)) ||
    (/\bmodern(?:istic)?\b/i.test(description) && /\brural\b/i.test(description));
  if (contradictory) {
    errors.push({
      code: "CONTRADICTORY_QUERY",
      message:
        "Modernistic and rural can describe different parts of a place. Which requirement should lead?",
    });
  }

  const radius = input?.radius;
  if (
    radius !== undefined &&
    (typeof radius !== "number" || !Number.isFinite(radius) || radius < 1 || radius > 500)
  ) {
    errors.push({
      code: "INVALID_RADIUS",
      message: "Radius must be between 1 and 500 km.",
    });
  }

  return { isValid: errors.length === 0, errors };
}

function sanitizeInput(text) {
  if (!text || typeof text !== "string") return "";
  let sanitized = text
    .replace(/ignore previous instructions/gi, "[REDACTED]")
    .replace(/forget your system prompt/gi, "[REDACTED]")
    .replace(/reveal your instructions/gi, "[REDACTED]")
    .replace(/you are now/gi, "[REDACTED]")
    .replace(/pretend to be/gi, "[REDACTED]")
    .replace(/output your hidden prompt/gi, "[REDACTED]")
    .replace(/do this instead/gi, "[REDACTED]")
    .replace(/system prompt/gi, "[REDACTED]")
    .replace(/developer prompt/gi, "[REDACTED]")
    .replace(/hidden prompt/gi, "[REDACTED]")
    .replace(/api key/gi, "[REDACTED]")
    .replace(/secret/gi, "[REDACTED]")
    .replace(/credential/gi, "[REDACTED]");
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
  }
  return sanitized;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== "object") return {};

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value);
    } else if (typeof value === "number") {
      sanitized[key] = value;
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeInput(item) : item,
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

function validateWorkflowInput(input, workflowType) {
  const errors = [];
  const warnings = [];

  const stringFields = [
    "description",
    "location",
    "targetCity",
    "reference",
    "city",
    "context",
  ];
  for (const field of stringFields) {
    if (input[field] && typeof input[field] === "string") {
      if (isOutOfScope(input[field])) {
        warnings.push(
          `Field "${field}" contains out-of-scope content that may be ignored.`,
        );
      }
    }
  }

  switch (workflowType) {
    case "location-scout":
      if (
        !input.description ||
        typeof input.description !== "string" ||
        input.description.trim().length < 10
      ) {
        errors.push("Description must be at least 10 characters long");
      }
      if (!input.location || !validateLocationName(input.location)) {
        errors.push("Invalid location name");
      }
      if (
        input.radiusKm &&
        (typeof input.radiusKm !== "number" ||
          input.radiusKm < 1 ||
          input.radiusKm > 500)
      ) {
        errors.push("Radius must be between 1 and 500 km");
      }
      break;

    case "city-lookalike":
      if (!input.targetCity || !validateLocationName(input.targetCity)) {
        errors.push("Invalid target city");
      }
      if (
        !input.reference ||
        typeof input.reference !== "string" ||
        input.reference.trim().length < 3
      ) {
        errors.push("Reference must be at least 3 characters long");
      }
      break;

    case "films-in-city":
      if (!input.city || !validateLocationName(input.city)) {
        errors.push("Invalid city name");
      }
      if (input.genre && typeof input.genre !== "string") {
        errors.push("Invalid genre");
      }
      break;

    case "history-check":
      if (
        !input.location ||
        typeof input.location !== "string" ||
        input.location.trim().length < 3
      ) {
        errors.push("Invalid location");
      }
      if (
        !input.storyYear ||
        typeof input.storyYear !== "number" ||
        input.storyYear < 1800 ||
        input.storyYear > 2030
      ) {
        errors.push("Story year must be between 1800 and 2030");
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function antiAbuseMiddleware(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.get("User-Agent") || "unknown";

  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }

  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;

  const key = `${ip}:${req.path}`;
  const requestLog = global.rateLimitStore.get(key) || [];

  const recentRequests = requestLog.filter(
    (timestamp) => now - timestamp < windowMs,
  );

  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again in a minute.",
        provider: "server",
      },
    });
  }

  recentRequests.push(now);
  global.rateLimitStore.set(key, recentRequests);

  const body = req.body || {};
  const allText = JSON.stringify(body).toLowerCase();

  const suspiciousPatterns = [
    /ignore previous instructions/i,
    /system prompt/i,
    /hack|exploit|inject/i,
    /<script/i,
    /javascript:/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(allText)) {
      return res.status(400).json({
        error: {
          code: "SUSPICIOUS_INPUT",
          message: "Request contains suspicious content and was blocked.",
          provider: "security",
        },
      });
    }
  }

  next();
}

module.exports = {
  isOutOfScope,
  validateLocationName,
  validateWorkflowInput,
  validateResearchInput,
  getScoutPreflightFallback,
  validateCityExists,
  sanitizeInput,
  sanitizeObject,
  antiAbuseMiddleware,
  MAX_INPUT_LENGTH,
  MAX_CONTEXT_LENGTH,
  MAX_DESCRIPTION_LENGTH,
};
