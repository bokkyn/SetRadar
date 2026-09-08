import type { Source, Verification } from "./common";
import type { Location } from "./location";
import type { ProductionType } from "./project";

export type PermitTolerance = "any" | "no-permit";

export interface ScoutQuery {
  prompt: string;
  location: string;
  radiusKm: number;
  projectType: ProductionType;
  sceneTypes: string[];
  permit?: PermitTolerance;
}

export interface DetectedPreference {
  key: string;
  label: string;
}

export interface ResearchResult {
  id: string;
  title: string;
  summary: string;
  locations: Location[];
  sources: Source[];
  confidence: Verification;
  warnings: string[];
}

/** City Match - a place in one city styled to resemble another. */
export interface CityMatchEntry {
  location: Location;
  reason: string;
}
export interface CityMatchResult {
  city: string;
  target: string;
  entries: CityMatchEntry[];
  warnings: string[];
}

/** Film Search - films shot in/around a city, filtered by genre. */
export interface FilmEntry {
  id: string;
  title: string;
  year: number;
  genre: string;
  description: string;
  locations: string[];
}
export interface FilmSearchResult {
  city: string;
  genre: string;
  films: FilmEntry[];
}

/** History Check - does a real place fit the film's period? */
export type HistoryFindingState =
  | "confirmed"
  | "likely"
  | "potential-issue"
  | "verify";
export interface HistoryFinding {
  label: string;
  state: HistoryFindingState;
  explanation?: string;
}
export interface HistoryCheckResult {
  location: string;
  storyYear: number;
  context: string;
  confidence: Verification;
  summary: string;
  findings: HistoryFinding[];
  toVerify: string[];
}

export interface ResearchHistoryItem {
  id: string;
  prompt: string;
  date: string;
  resultCount: number;
}
