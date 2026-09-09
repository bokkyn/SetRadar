import { mockLocations } from "../data/mockLocations";
import {
  normalizeCandidate,
  postBackend,
  type BackendCandidate,
} from "./backendApi";
import { cacheLocations } from "./locationService";
import type {
  CityMatchResult,
  FilmEntry,
  FilmSearchResult,
  HistoryCheckResult,
  HistoryFindingState,
} from "../types/research";
import { delay } from "../utils/formatting";

export async function runCityMatch(input: {
  city: string;
  target: string;
}): Promise<CityMatchResult> {
  const { city, target } = input;
  try {
    console.log("🔧 AGENT: City match using Gemini + Parallel");
    const response = await postBackend<{
      candidates?: BackendCandidate[];
      targetCity?: string;
      reference?: string;
    }>("/api/agent/city-match", { targetCity: city, reference: target });
    const entries = (response.candidates || []).map((candidate, index) => ({
      location: normalizeCandidate(candidate, index),
      reason:
        candidate.resemblanceExplanation ||
        candidate.matchExplanation ||
        candidate.description ||
        "Visual resemblance returned by SetRadar research.",
    }));
    cacheLocations(entries.map((entry) => entry.location));
    return {
      city: response.targetCity || city,
      target: response.reference || target,
      entries,
      warnings: [
        "Resemblance is a creative judgement. Scout in person before committing.",
      ],
    };
  } catch {
    const pool = [...mockLocations]
      .sort((a, b) => b.shootability - a.shootability)
      .slice(0, 3);
    return delay(
      {
        city,
        target,
        entries: pool.map((location) => ({
          location,
          reason: `Could read as ${target} - ${location.type.toLowerCase()} architecture, scale and geometry echo the target look.`,
        })),
        warnings: [
          "Live SetRadar research was unavailable; showing fallback results.",
        ],
      },
      300,
    );
  }
}

const FILM_CATALOG: FilmEntry[] = [
  {
    id: "f1",
    title: "The Ministry of Fear",
    year: 2019,
    genre: "Thriller",
    description:
      "A cold-war paranoia thriller staged across the city's institutional interiors and rail yards.",
    locations: ["Central rail depot", "Fairgrounds pavilion"],
  },
  {
    id: "f2",
    title: "Last Train North",
    year: 2022,
    genre: "Crime / Thriller",
    description:
      "A single-night crime story that moves from riverside warehouses to a disused platform.",
    locations: ["Riverside warehouse", "Old platform"],
  },
  {
    id: "f3",
    title: "Concrete Season",
    year: 2017,
    genre: "Drama",
    description:
      "A quiet family drama shot almost entirely in modernist housing blocks and their courtyards.",
    locations: ["Modernist estate", "Courtyard interiors"],
  },
  {
    id: "f4",
    title: "Signal Loss",
    year: 2024,
    genre: "Sci-fi / Thriller",
    description:
      "A near-future thriller using industrial ruins as an abandoned research campus.",
    locations: ["Industrial ruin", "Forest access road"],
  },
  {
    id: "f5",
    title: "Green Hours",
    year: 2015,
    genre: "Romance",
    description:
      "A slow-burn romance across parks, tram lines and the upper town in golden light.",
    locations: ["Upper town", "City parks"],
  },
];

export async function runFilmSearch(input: {
  city: string;
  genre: string;
}): Promise<FilmSearchResult> {
  const { city, genre } = input;
  try {
    console.log("🔧 AGENT: Film search using Gemini + Parallel");
    const response = await postBackend<{
      city?: string;
      genre?: string;
      films?: Array<{
        title: string;
        year: number;
        genre: string;
        description: string;
        filmingLocation?: string;
      }>;
    }>("/api/agent/films", { city, genre: genre.trim() });
    return {
      city: response.city || city,
      genre: response.genre || genre.trim(),
      films: (response.films || []).map((film, index) => ({
        id: `film-${index}-${film.title}`,
        title: film.title,
        year: film.year,
        genre: film.genre,
        description: film.description,
        locations: film.filmingLocation ? [film.filmingLocation] : [],
      })),
    };
  } catch {
    const g = genre.trim().toLowerCase();
    const films = g
      ? FILM_CATALOG.filter((f) => f.genre.toLowerCase().includes(g))
      : FILM_CATALOG;
    return delay({ city, genre: genre.trim(), films }, 300);
  }
}

export async function runHistoryCheck(input: {
  location: string;
  storyYear: number;
  context: string;
}): Promise<HistoryCheckResult> {
  const { location, storyYear, context } = input;
  try {
    console.log("🔧 AGENT: History check using Gemini + Parallel");
    const response = await postBackend<{
      location?: string;
      storyYear?: number;
      overallFit?: string;
      summary: string;
      findings?: Array<{
        category: HistoryFindingState;
        claim: string;
        explanation: string;
      }>;
      whatToVerify?: string[];
    }>("/api/agent/history", { location, storyYear, context: context.trim() });
    const confidence =
      response.overallFit === "confirmed" ||
      response.overallFit === "likely" ||
      response.overallFit === "verify"
        ? response.overallFit
        : "verify";
    return {
      location: response.location || location,
      storyYear: response.storyYear || storyYear,
      context: context.trim(),
      confidence,
      summary: response.summary,
      findings: (response.findings || []).map((finding) => ({
        label: finding.claim,
        state: finding.category,
        explanation: finding.explanation,
      })),
      toVerify: response.whatToVerify || [],
    };
  } catch {
    const gap = new Date().getFullYear() - storyYear;
    return delay(
      {
        location,
        storyYear,
        context: context.trim(),
        confidence: "verify",
        summary: `${location} likely existed in ${storyYear}, but roughly ${gap} years of change means several visible elements may read as modern.`,
        findings: [
          {
            label: `The site itself existed in ${storyYear}.`,
            state: "confirmed",
          },
          {
            label:
              "Overall massing and street layout are broadly period-appropriate.",
            state: "likely",
          },
          {
            label: "Modern details may break the period.",
            state: "potential-issue",
          },
          {
            label:
              "Whether neighbouring buildings existed yet in the story year.",
            state: "verify",
          },
        ],
        toVerify: [
          `Photographic reference of ${location} from around ${storyYear}.`,
          "Which structural elements are original vs. later renovation.",
        ],
      },
      300,
    );
  }
}
