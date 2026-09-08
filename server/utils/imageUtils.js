function extractImageFromSource(source) {
  if (!source) return null;

  const content = source.content || source.excerpts?.join(" ") || "";
  const url = source.url || "";
  const title = source.title || "Unknown source";

  if (url && url.match(/\.(?:jpg|jpeg|png|gif|webp|svg)$/i)) {
    return {
      url: url,
      source: title,
      sourceUrl: url,
    };
  }

  const imgRegex = /(https?:\/\/[^\s<>"]+\.(?:jpg|jpeg|png|gif|webp|svg))/gi;
  const matches = content.match(imgRegex) || [];

  if (matches.length > 0) {
    const images = matches.filter(
      (img) =>
        !img.includes("icon") &&
        !img.includes("logo") &&
        !img.includes("avatar") &&
        !img.includes("thumbnail") &&
        !img.includes("thumb") &&
        !img.includes("pixel") &&
        !img.includes("transparent") &&
        !img.includes("data:image"),
    );

    if (images.length > 0) {
      return {
        url: images[0],
        source: title,
        sourceUrl: url,
      };
    }

    return {
      url: matches[0],
      source: title,
      sourceUrl: url,
    };
  }

  return null;
}

function findBestSourceForCandidate(candidate, sources) {
  if (!candidate || !sources || sources.length === 0) return null;

  const candidateName = (candidate.name || "").toLowerCase();
  const candidateAddress = (candidate.address || "").toLowerCase();
  const candidateCity = (candidate.city || "").toLowerCase();

  let bestSource = null;
  let bestScore = 0;

  for (const source of sources) {
    let score = 0;
    const sourceText =
      (source.title || "") +
      " " +
      (source.content || source.excerpts?.join(" ") || "");
    const sourceLower = sourceText.toLowerCase();

    if (candidateName && candidateName.length > 2) {
      const nameWords = candidateName.split(" ").filter((w) => w.length > 2);
      for (const word of nameWords) {
        if (sourceLower.includes(word)) {
          score += 5;
        }
      }
    }

    if (candidateCity && candidateCity.length > 2) {
      if (sourceLower.includes(candidateCity)) {
        score += 3;
      }
    }

    if (candidateAddress && candidateAddress.length > 2) {
      const addressWords = candidateAddress
        .split(" ")
        .filter((w) => w.length > 2);
      for (const word of addressWords) {
        if (sourceLower.includes(word)) {
          score += 2;
        }
      }
    }

    if (source.url && source.url.match(/\.(?:jpg|jpeg|png|gif|webp|svg)/i)) {
      score += 10;
    }

    if (source.excerpts && source.excerpts.length > 0) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestSource = source;
    }
  }

  return bestSource;
}

module.exports = {
  extractImageFromSource,
  findBestSourceForCandidate,
};
