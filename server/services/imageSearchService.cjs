const gis = require("g-i-s");
const sharp = require("sharp");
const parallelService = require("./parallelService.cjs");

const DUMMY_MODE = false;

const STOCK_PHOTO_HOSTS = [
  "shutterstock.com",
  "istockphoto.com",
  "gettyimages.com",
  "alamy.com",
  "dreamstime.com",
  "123rf.com",
  "depositphotos.com",
  "fotolia.com",
  "stock.adobe.com",
  "canstockphoto.com",
  "bigstockphoto.com",
  "veer.com",
  "stockunlimited.com",
  "stockphoto.com",
  "stocksy.com",
  "agefotostock.com",
  "eyeem.com",
  "pond5.com",
  "vectorstock.com",
  "colourbox.com",
  "photodune.net",
  "envato.com",
  "elements.envato.com",
  "storyblocks.com",
  "pixta.jp",
  "photocase.com",
];

const WATERMARK_URL_KEYWORDS = ["watermark", "preview_watermark", "wm_"];

class ImageSearchService {
  constructor() {
    this.imageCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
    this.usedImageHashes = new Map();
    this.usedImageHashesGlobal = new Map();
  }

  async findBestImage(candidate, context, parallelResults) {
    try {
      const cacheKey = `${candidate.name}_${candidate.city || ""}_${candidate.address || ""}`;
      if (this.imageCache.has(cacheKey)) {
        const cached = this.imageCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          console.log(`âś… Using cached images for ${candidate.name}`);
          return cached.images;
        }
      }

      console.log(`\nđź”Ť Finding photos for: ${candidate.name}`);

      if (DUMMY_MODE) {
        console.log(`  đź§Ş TEST MODE - Using only g-i-s, no Gemini`);

        const allImages = await this.searchGoogleImages(
          candidate,
          candidate.name,
        );
        console.log(`  đź“¸ Found ${allImages.length} images from Google`);

        const uniqueImages = await this.deduplicateImages(allImages);
        console.log(
          `  đź”Ť ${uniqueImages.length} unique images after deduplication`,
        );

        const finalImages = uniqueImages.slice(0, 3);

        if (finalImages.length > 0) {
          console.log(
            `âś… Final: ${finalImages.length} photos for ${candidate.name}`,
          );
          this.cacheImage(cacheKey, finalImages);
          return finalImages;
        }

        console.log(`âťŚ No images found for ${candidate.name}`);
        return [];
      }

      let allImages = this.imagesFromParallel(parallelResults, candidate);
      if (allImages.length === 0 && parallelService.isConfigured()) {
        try {
          const query = [candidate.name, candidate.city, candidate.country]
            .filter(Boolean)
            .join(" ");
          const parallelImages = await this.withTimeout(
            parallelService.search(
              {
                search_queries: [
                  `${query} building exterior photo`,
                  `${query} architecture facade`,
                  `${query} street view landmark`,
                  `${query} ${candidate.address || ""} photo`,
                ],
              },
              {
                objective: `Find trustworthy photographs of ${query}. Return direct image URLs when available.`,
                additionalParams: { include_images: true, search_type: "images" },
              },
            ),
            12000,
          );
          allImages = this.imagesFromParallel(parallelImages, candidate);
        } catch (error) {
          console.warn(`  Parallel image search unavailable: ${error.message}`);
        }
      }

      if (allImages.length < 3) {
        const wikipediaImages = await this.searchWikipediaImages(candidate);
        allImages = [...allImages, ...wikipediaImages];
      }

      if (allImages.length < 3) {
        const translatedName = await this.translateToLocalLanguage(candidate);
        console.log(`  đźŚŤ Local name: ${translatedName}`);
        const gisImages = await this.searchGoogleImages(
          candidate,
          translatedName,
        );
        allImages = [...allImages, ...gisImages];
      }
      console.log(`  đź“¸ Found ${allImages.length} total images from providers`);

      const uniqueImages = await this.deduplicateImages(allImages);
      console.log(
        `  đź”Ť ${uniqueImages.length} unique images after deduplication`,
      );

      const relevantImages = await this.filterRelevantImages(
        candidate,
        context,
        uniqueImages,
      );
      console.log(
        `  âś… ${relevantImages.length} relevant images after Gemini check`,
      );

      const finalImages = relevantImages.slice(0, 3);

      if (finalImages.length > 0) {
        console.log(
          `âś… Final: ${finalImages.length} photos for ${candidate.name}`,
        );
        this.cacheImage(cacheKey, finalImages);
        return finalImages;
      }

      if (uniqueImages.length > 0 && !this.isGeminiConfigured()) {
        console.log(
          `âš ď¸Ź Using ${Math.min(3, uniqueImages.length)} images without Gemini check`,
        );
        const fallbackImages = uniqueImages.slice(0, 3);
        this.cacheImage(cacheKey, fallbackImages);
        return fallbackImages;
      }

      const fallback = this.logoFallback(candidate.name);
      this.cacheImage(cacheKey, [fallback]);
      console.log(`âš ď¸Ź No photos found for ${candidate.name}; using logo fallback`);
      return [fallback];
    } catch (error) {
      console.error(`Error finding images for ${candidate.name}:`, error);
      const fallback = this.logoFallback(candidate.name);
      this.cacheImage(cacheKey, [fallback]);
      return [fallback];
    }
  }

  imagesFromParallel(parallelResults, candidate) {
    const results = Array.isArray(parallelResults?.results)
      ? parallelResults.results
      : [];
    const images = [];
    for (const result of results) {
      const image = result.image;
      const candidates = [
        typeof image === "string" ? image : image?.url,
        result.image_url,
        result.thumbnail_url,
      ].filter(Boolean);
      for (const url of candidates) {
        if (this.isValidImageUrl(url)) {
          images.push({
            url,
            source: result.domain || "Parallel",
            sourceUrl: result.url || url,
          });
        }
      }
    }
    return images;
  }

  async searchWikipediaImages(candidate) {
    const query = [candidate.name, candidate.city].filter(Boolean).join(" ");
    if (!query) return [];
    try {
      const endpoint = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=0&gsrlimit=5&prop=pageimages|info&piprop=original&inprop=url&format=json&origin=*`;
      const response = await fetch(endpoint, {
        headers: { "User-Agent": "SetRadar/1.0 (image research)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return [];
      const pages = Object.values((await response.json()).query?.pages || {});
      return pages
        .map((page) => page.original?.source)
        .filter((url) => this.isValidImageUrl(url))
        .map((url) => ({ url, source: "Wikipedia", sourceUrl: url }));
    } catch (error) {
      console.warn(`  Wikipedia image fallback failed: ${error.message}`);
      return [];
    }
  }

  logoFallback(name) {
    const initials = (name || "SetRadar")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "SR";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="#171717"/><circle cx="400" cy="205" r="92" fill="#d8a84e"/><text x="400" y="235" text-anchor="middle" font-family="Arial,sans-serif" font-size="82" font-weight="700" fill="#171717">${initials}</text><text x="400" y="365" text-anchor="middle" font-family="Arial,sans-serif" font-size="26" fill="#e7e2d8">SET RADAR</text></svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      source: "SetRadar logo fallback",
      sourceUrl: "",
      fallback: true,
    };
  }

  withTimeout(promise, milliseconds) {
    let timeoutId;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("image provider timeout")), milliseconds);
      }),
    ]).finally(() => clearTimeout(timeoutId));
  }

  async translateToLocalLanguage(candidate) {
    const geminiService = require("./geminiService.cjs");
    const schema = {
      type: "object",
      properties: {
        local_name: { type: "string" },
        language: { type: "string" },
      },
      required: ["local_name", "language"],
    };

    const prompt = `
      Translate this location name to the local language of where it's located.
      
      Location: ${candidate.name}
      City: ${candidate.city || "Unknown"}
      Country: ${candidate.country || "Unknown"}
      Address: ${candidate.address || "Unknown"}
      
      Return ONLY JSON.
    `;

    try {
      const result = await Promise.race([
        geminiService.generateStructuredContent(prompt, schema, 0.1),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Gemini translation timeout")),
            8000,
          ),
        ),
      ]);
      return result.local_name || candidate.name;
    } catch (error) {
      return candidate.name;
    }

  }

  isGeminiConfigured() {
    try {
      return require("./geminiService.cjs").isConfigured();
    } catch {
      return false;
    }
  }

  async searchGoogleImages(candidate, searchName) {
    const images = [];

    const searchQueries = [
      {
        term: `${searchName} ${candidate.city || ""} building exterior`,
        size: "isz:l",
      },
      {
        term: `${candidate.name} ${candidate.city || ""} architecture`,
        size: "isz:l",
      },
      { term: `${searchName} ${candidate.city || ""} photo`, size: "isz:l" },
    ];

    for (const queryObj of searchQueries) {
      if (images.length >= 8) break;

      try {
        console.log(`  đź”Ž Google search: "${queryObj.term}" (large images)`);

        const results = await this.performGisSearch(
          queryObj.term,
          queryObj.size,
        );

        if (results && results.length > 0) {
          console.log(`  đź“¸ Got ${results.length} raw Google results`);

          for (const result of results) {
            if (images.length >= 8) break;

            if (result.url && this.isValidImageUrl(result.url)) {
              const width = result.width || 0;
              const height = result.height || 0;

              if (width >= 600 && height >= 400) {
                images.push({
                  url: result.url,
                  source: "Google Images",
                  sourceUrl: result.url,
                  width: width,
                  height: height,
                });
              } else if (width === 0 && height === 0) {
                images.push({
                  url: result.url,
                  source: "Google Images",
                  sourceUrl: result.url,
                  width: null,
                  height: null,
                });
              }
            }
          }
        } else {
          console.log(
            `  âš ď¸Ź Google returned no parseable results for this query`,
          );
        }
      } catch (error) {
        console.error(
          `  Google search error for "${queryObj.term}": ${error.message}`,
        );
      }
    }

    return images;
  }

  performGisSearch(searchTerm, sizeParam = "") {
    return new Promise((resolve, reject) => {
      const opts = {
        searchTerm: searchTerm,
        queryStringAddition: `&tbs=${sizeParam},itp:photo`,
        filterOutDomains: STOCK_PHOTO_HOSTS,
      };

      const timeout = setTimeout(() => {
        reject(new Error("Google Image Search timeout"));
      }, 15000);

      gis(opts, (error, results) => {
        clearTimeout(timeout);

        if (error) {
          reject(error);
        } else if (results && results.length > 0) {
          console.log(`  đź§Ş g-i-s parser returned ${results.length} results`);
          resolve(results);
        } else {
          console.log("  âš ď¸Ź g-i-s returned 0 results; trying HTML fallback");
          this.searchGoogleHtml(searchTerm).then(resolve).catch(reject);
        }
      });
    });
  }

  async searchGoogleHtml(searchTerm) {
    const url = `http://images.google.com/search?tbm=isch&q=${encodeURIComponent(searchTerm)}&tbs=isz:l,itp:photo`;
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Google Images HTTP ${response.status}`);
    }

    const html = await response.text();
    const results = [];
    const seen = new Set();

    const ouRegex = /"ou":"((?:[^"\\]|\\.)*)"/g;
    let match;
    while ((match = ouRegex.exec(html)) !== null) {
      const imageUrl = this.decodeGoogleUrl(match[1]);

      if (seen.has(imageUrl)) continue;
      if (!this.isValidImageUrl(imageUrl)) continue;
      if (imageUrl.includes("google.com/search")) continue;
      seen.add(imageUrl);

      const windowStart = Math.max(0, match.index - 200);
      const windowEnd = Math.min(html.length, match.index + 300);
      const nearby = html.slice(windowStart, windowEnd);
      const owMatch = nearby.match(/"ow":(\d+)/);
      const ohMatch = nearby.match(/"oh":(\d+)/);

      results.push({
        url: imageUrl,
        width: owMatch ? parseInt(owMatch[1], 10) : null,
        height: ohMatch ? parseInt(ohMatch[1], 10) : null,
      });
    }

    console.log(
      `  đź§Ş HTML fallback parsed ${results.length} source image URLs (with real dimensions) via "ou" JSON`,
    );

    if (results.length > 0) return results;

    const sourcePageUrls = [];
    const sourceUrlRegex = /\/url\?q=([^&"\\]+)/g;
    let sourceMatch;
    while ((sourceMatch = sourceUrlRegex.exec(html)) !== null) {
      try {
        const sourceUrl = decodeURIComponent(
          this.decodeGoogleUrl(sourceMatch[1]),
        );
        if (
          sourceUrl.startsWith("http") &&
          !sourcePageUrls.includes(sourceUrl) &&
          !sourceUrl.includes("google.com")
        ) {
          sourcePageUrls.push(sourceUrl);
        }
      } catch {
      }
    }

    const sourceImages = await Promise.all(
      sourcePageUrls
        .slice(0, 12)
        .map((sourceUrl) => this.resolveSourceImage(sourceUrl)),
    );
    for (const sourceImage of sourceImages) {
      if (sourceImage && !seen.has(sourceImage)) {
        seen.add(sourceImage);
        results.push({ url: sourceImage });
      }
    }

    console.log(
      `  đź–Ľď¸Ź Resolved ${sourceImages.filter(Boolean).length} original images from ${sourcePageUrls.length} Google source pages`,
    );
    if (results.length > 0) return results;

    console.log(
      `  âš ď¸Ź No "ou" JSON matches found - Google may have changed page format, falling back to generic URL scraping`,
    );

    const urls = html.match(/https?:[^"'<>\s\\]+/g) || [];
    for (const rawUrl of urls) {
      const imageUrl = this.decodeGoogleUrl(rawUrl);
      if (
        !seen.has(imageUrl) &&
        this.isValidImageUrl(imageUrl) &&
        !imageUrl.includes("google.com/search")
      ) {
        seen.add(imageUrl);
        results.push({ url: imageUrl });
      }
    }

    console.log(`  đź§Ş Generic fallback parsed ${results.length} image URLs`);
    return results;
  }

  async resolveSourceImage(sourceUrl) {
    try {
      const response = await fetch(sourceUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return null;

      const contentType = response.headers.get("content-type") || "";
      if (contentType.startsWith("image/")) return response.url;

      const html = await response.text();
      const imageMatch = html.match(
        /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
      );
      if (!imageMatch) return null;

      const imageUrl = new URL(
        imageMatch[1].replace(/&amp;/g, "&"),
        response.url,
      ).href;
      const hostname = new URL(imageUrl).hostname.toLowerCase();
      const isStockImage = STOCK_PHOTO_HOSTS.some(
        (blocked) => hostname === blocked || hostname.endsWith(`.${blocked}`),
      );
      const hasBlockedPattern = [
        /watermark/i,
        /preview_watermark/i,
        /(^|[_-])wm([_.-]|$)/i,
        /placeholder/i,
        /no-image/i,
      ].some((pattern) => pattern.test(imageUrl));

      return !isStockImage &&
        !hasBlockedPattern &&
        /^https?:\/\//.test(imageUrl)
        ? imageUrl
        : null;
    } catch {
      return null;
    }
  }

  decodeGoogleUrl(url) {
    return url
      .replace(/\\u003d/g, "=")
      .replace(/\\u0026/g, "&")
      .replace(/\\u002f/g, "/")
      .replace(/&amp;/g, "&")
      .replace(/[),;]+$/, "");
  }

  /**
   * Dedupliciraj slike koristeÄ‡i perceptual hash
   */
  async deduplicateImages(images) {
    const uniqueImages = [];
    const localHashes = [];
    const now = Date.now();

    for (const [hash, timestamp] of this.usedImageHashesGlobal) {
      if (now - timestamp >= this.cacheTimeout) {
        this.usedImageHashesGlobal.delete(hash);
      }
    }

    for (const image of images) {
      try {
        const hash = await this.calculateImageHash(image.url);

        if (!hash) {
          const isUrlDuplicate = uniqueImages.some(
            (img) => img.url === image.url,
          );
          if (!isUrlDuplicate) {
            uniqueImages.push(image);
          }
          continue;
        }

        let isDuplicate = false;
        for (const existingHash of localHashes) {
          if (this.hammingDistance(hash, existingHash) <= 5) {
            isDuplicate = true;
            console.log(
              `  âŹ­ď¸Ź Duplicate (similar) detected: ${image.url.substring(0, 60)}...`,
            );
            break;
          }
        }

        if (!isDuplicate) {
          for (const existingHash of this.usedImageHashesGlobal.keys()) {
            if (this.hammingDistance(hash, existingHash) <= 5) {
              isDuplicate = true;
              console.log(
                `  âŹ­ď¸Ź Duplicate (same as previous location) detected: ${image.url.substring(0, 60)}...`,
              );
              break;
            }
          }
        }

        if (!isDuplicate) {
          localHashes.push(hash);
          this.usedImageHashesGlobal.set(hash, now);
          uniqueImages.push(image);
        }
      } catch (error) {
        uniqueImages.push(image);
      }
    }

    return uniqueImages;
  }

  /**
   * IzraÄŤunaj perceptual hash slike
   */
  async calculateImageHash(imageUrl) {
    try {
      const response = await fetch(imageUrl, {
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) return null;

      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      const resized = await sharp(uint8Array)
        .resize(16, 16)
        .grayscale()
        .raw()
        .toBuffer();

      const pixels = Array.from(resized);
      const avg = pixels.reduce((a, b) => a + b, 0) / pixels.length;

      let hash = "";
      for (const pixel of pixels) {
        hash += pixel > avg ? "1" : "0";
      }

      return hash;
    } catch (error) {
      return null;
    }
  }

  /**
   * IzraÄŤunaj Hammingovu udaljenost izmeÄ‘u dva hash-a
   */
  hammingDistance(hash1, hash2) {
    if (!hash1 || !hash2 || hash1.length !== hash2.length) {
      return 999;
    }

    let distance = 0;
    for (let i = 0; i < hash1.length; i++) {
      if (hash1[i] !== hash2[i]) {
        distance++;
      }
    }
    return distance;
  }

  async filterRelevantImages(candidate, context, images) {
    if (images.length === 0) return [];
    const geminiService = require("./geminiService.cjs");
    const candidates = images.filter((image) => !this.looksLikeEventOrBusinessImage(image));
    if (!geminiService.isConfigured()) return candidates;

    const relevantImages = [];
    const imagesToCheck = candidates.slice(0, 10);

    for (const image of imagesToCheck) {
      try {
        const verification = await this.checkImageRelevance(
          candidate,
          context,
          image,
        );
        if (verification.relevant) {
          relevantImages.push({ image, score: verification.score });
        }
      } catch (error) {
        console.warn(`  Gemini image verification failed for ${image.url}: ${error.message}`);
      }
    }

    return relevantImages
      .sort((a, b) => b.score - a.score)
      .map(({ image }) => image);
  }

  async checkImageRelevance(candidate, context, image) {
    if (DUMMY_MODE) return { relevant: true, score: 0 };

    const geminiService = require("./geminiService.cjs");
    if (!geminiService.isConfigured() || image.fallback)
      return { relevant: true, score: 0 };
    try {
      const response = await fetch(image.url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "SetRadar/1.0 (image verification)" },
      });
      if (!response.ok) return false;
      const mimeType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      if (!mimeType.startsWith("image/")) return false;
      const result = await this.withTimeout(
        geminiService.generateStructuredContentWithImage(
          `Verify whether this image visibly shows the actual physical building, street, facade, landscape, or landmark named "${candidate.name}" in "${candidate.city || context?.location || ""}". Return relevant=true only when the image is plausibly of that exact location, not merely the same city. Reject concerts, festivals, crowds, performances, event stages, nightlife events, video screenshots or play-button frames, restaurant menus, food or tables, company banners/signage as the main subject, logos, maps, portraits, stock/watermarked images, and unrelated places. Do not reject imperfect composition or low resolution. Return JSON only.`,
          {
            type: "object",
            properties: {
              relevant: { type: "boolean" },
              matchScore: { type: "number", minimum: 0, maximum: 100 },
            },
            required: ["relevant", "matchScore"],
          },
          Buffer.from(await response.arrayBuffer()),
          mimeType,
          0.1,
        ),
        12000,
      );
      return {
        relevant: result.relevant === true,
        score:
          typeof result.matchScore === "number" ? result.matchScore : 0,
      };
    } catch {
      return { relevant: true, score: 50 };
    }
  }

  isValidImageUrl(url) {
    if (!url || typeof url !== "string") return false;
    if (!url.startsWith("http://") && !url.startsWith("https://")) return false;

    const hasImageExtension = /\.(jpg|jpeg|png|gif|webp|bmp)($|[?&])/i.test(
      url,
    );

    let hostname = "";
    try {
      hostname = new URL(url).hostname;
    } catch {
      return false;
    }

    const isStockHost = STOCK_PHOTO_HOSTS.some(
      (blocked) =>
        hostname.toLowerCase() === blocked ||
        hostname.toLowerCase().endsWith(`.${blocked}`),
    );
    if (isStockHost) return false;

    const knownImageHost =
      /(^|\.)((googleusercontent|gstatic|ggpht)\.com|wikimedia\.org|imgur\.com|images\.unsplash\.com)(\/|$)/i.test(
        hostname,
      );

    if (!hasImageExtension && !knownImageHost) return false;

    const lowerUrl = url.toLowerCase();
    const badPatterns = [
      /placeholder/i,
      /picsum/i,
      /dummy/i,
      /example\.com/i,
      /default/i,
      /no-image/i,
      /icon/i,
      /logo/i,
      /avatar/i,
      /sprite/i,
      /blank/i,
      /transparent/i,
      /\.svg$/i,
      /data:image/i,
    ];

    if (badPatterns.some((pattern) => pattern.test(url))) return false;

    if (WATERMARK_URL_KEYWORDS.some((keyword) => lowerUrl.includes(keyword))) {
      return false;
    }

    return true;
  }

  looksLikeEventOrBusinessImage(image) {
    const text = `${image.url || ""} ${image.sourceUrl || ""}`.toLowerCase();
    return /\b(concert|festival|event|stage|live-music|nightlife|menu|restaurant|cafe|food|table|banner|poster|youtube|vimeo|tiktok|thumbnail|screenshot|play-button)\b/.test(
      text,
    );
  }

  cacheImage(key, images) {
    this.imageCache.set(key, {
      images,
      timestamp: Date.now(),
    });

    if (this.imageCache.size > 100) {
      const now = Date.now();
      for (const [k, v] of this.imageCache.entries()) {
        if (now - v.timestamp > this.cacheTimeout) {
          this.imageCache.delete(k);
        }
      }
    }
  }
}

module.exports = new ImageSearchService();
