class ParallelService {
  constructor() {
    this.apiKey = process.env.PARALLEL_API_KEY;
    this.baseUrl = "https://api.parallel.ai/v1/search";
    this.maxRetries = 2;
    this.retryDelay = 2000;
  }

  isConfigured() {
    return !!this.apiKey;
  }

  async search(searchPlan, options = {}) {
    if (!this.apiKey) {
      throw {
        code: "PARALLEL_NOT_CONFIGURED",
        message: "Parallel API key is not configured",
        provider: "parallel",
      };
    }

    const searchPayload = {
      objective:
        options.objective ||
        "Find relevant information for the research request",
      search_queries: searchPlan.search_queries || searchPlan,
      max_chars_total: options.maxCharsTotal || 24000,
      ...options.additionalParams,
    };

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `\n🔎 Parallel Search attempt ${attempt}/${this.maxRetries}`,
        );
        console.log(`Queries: ${searchPayload.search_queries.length} queries`);

        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
          body: JSON.stringify(searchPayload),
          signal: AbortSignal.timeout(options.timeoutMs || 12000),
        });

        if (!response.ok) {
          const errorText = await response.text();

          if (response.status === 429) {
            if (attempt < this.maxRetries) {
              console.log(
                `Rate limited. Retrying in ${this.retryDelay * attempt}ms...`,
              );
              await this.sleep(this.retryDelay * attempt);
              continue;
            }
            throw {
              code: "PARALLEL_RATE_LIMIT",
              message: "Parallel rate limit exceeded",
              provider: "parallel",
            };
          }

          if (response.status === 503) {
            if (attempt < this.maxRetries) {
              console.log(
                `Service unavailable. Retrying in ${this.retryDelay * attempt}ms...`,
              );
              await this.sleep(this.retryDelay * attempt);
              continue;
            }
            throw {
              code: "PARALLEL_UNAVAILABLE",
              message: "Parallel service temporarily unavailable",
              provider: "parallel",
            };
          }

          if (response.status === 401 || response.status === 403) {
            throw {
              code: "PARALLEL_AUTH_ERROR",
              message: "Parallel authentication failed. Check your API key.",
              provider: "parallel",
            };
          }

          throw {
            code: "PARALLEL_ERROR",
            message: `Parallel API error (${response.status}): ${errorText.substring(0, 200)}`,
            provider: "parallel",
          };
        }

        const data = await response.json();
        const normalized = this.normalizeResponse(data);

        console.log(
          `✅ Parallel returned ${normalized.results.length} results`,
        );
        return normalized;
      } catch (error) {
        if (error.code?.startsWith("PARALLEL_")) {
          if (
            attempt < this.maxRetries &&
            (error.code === "PARALLEL_RATE_LIMIT" ||
              error.code === "PARALLEL_UNAVAILABLE")
          ) {
            continue;
          }
          throw error;
        }

        if (attempt === this.maxRetries) {
          throw {
            code: "PARALLEL_ERROR",
            message: error.message || "Parallel search failed",
            provider: "parallel",
          };
        }

        console.log(
          `Network error. Retrying in ${this.retryDelay * attempt}ms...`,
        );
        await this.sleep(this.retryDelay * attempt);
      }
    }
  }

  normalizeResponse(data) {
    const results = [];

    if (data && data.results && Array.isArray(data.results)) {
      results.push(...data.results);
    } else if (data && Array.isArray(data)) {
      results.push(...data);
    } else if (data && data.data && Array.isArray(data.data.results)) {
      results.push(...data.data.results);
    } else if (data && data.data && Array.isArray(data.data)) {
      results.push(...data.data);
    }

    const normalized = {
      search_id: data.search_id || data.id || null,
      results: results
        .map((result) => {
          const normalizedResult = {
            title: result.title || result.name || "Untitled",
            url: result.url || result.link || "",
            publish_date:
              result.publish_date ||
              result.published_date ||
              result.date ||
              null,
            excerpts: this.extractExcerpts(result),
            domain: this.extractDomain(result.url || result.link || ""),
          };

          const imageInfo = this.extractImageInfo(result);
          if (imageInfo) {
            normalizedResult.image = imageInfo;
          }

          return normalizedResult;
        })
        .filter(
          (result) => result.url || result.excerpts.length > 0 || result.image,
        ),
    };

    return normalized;
  }

  extractExcerpts(result) {
    const excerpts = [];

    if (result.excerpts && Array.isArray(result.excerpts)) {
      excerpts.push(...result.excerpts);
    } else if (typeof result.excerpts === "string" && result.excerpts) {
      excerpts.push(result.excerpts);
    } else if (result.content) {
      excerpts.push(result.content);
    } else if (result.snippet) {
      excerpts.push(result.snippet);
    } else if (result.summary) {
      excerpts.push(result.summary);
    } else if (result.description) {
      excerpts.push(result.description);
    } else if (result.text) {
      excerpts.push(result.text.slice(0, 500));
    }

    return excerpts;
  }

  extractImageInfo(result) {
    if (Array.isArray(result.images)) {
      const first = result.images.find((image) =>
        typeof image === "string" ? image : image?.url,
      );
      if (first) return typeof first === "string" ? { url: first } : first;
    }

    const imageFields = [
      "image",
      "image_url",
      "thumbnail",
      "thumbnail_url",
      "og_image",
      "og_image_url",
      "photo",
      "photo_url",
      "picture",
      "picture_url",
      "img",
      "img_url",
    ];

    for (const field of imageFields) {
      if (result[field]) {
        if (typeof result[field] === "string") {
          return { url: result[field] };
        } else if (typeof result[field] === "object" && result[field].url) {
          return result[field];
        }

        if (result.media && Array.isArray(result.media)) {
          const first = result.media.find((item) => item?.type === "image" && item.url);
          if (first) return { url: first.url };
        }
      }
    }

    if (result.excerpts && Array.isArray(result.excerpts)) {
      for (const excerpt of result.excerpts) {
        if (typeof excerpt === "string") {
          const imgMatch = excerpt.match(
            /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i,
          );
          if (imgMatch) return { url: imgMatch[0] };
        }
      }
    }

    if (result.content && typeof result.content === "string") {
      const imgMatch = result.content.match(
        /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i,
      );
      if (imgMatch) return { url: imgMatch[0] };
    }

    return null;
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace("www.", "");
    } catch {
      return null;
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const parallelService = new ParallelService();
module.exports = parallelService;
