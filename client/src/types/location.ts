import type { GeoPoint, Source, Verification } from "./common";
import type { AlternativeWindow, SunTiming, WeatherForecast } from "./weather";

export type LocationStatus =
  | "researching"
  | "shortlisted"
  | "contacted"
  | "approved"
  | "rejected";

export interface ProductionRestriction {
  key: string;
  label: string;
  value: string;
  status: Verification;
  detail?: string;
  sources?: Source[];
}

export interface Logistics {
  distanceKm: number;
  travelMinutes: number;
  vehicleAccess: Verification;
  parking: Verification;
  parkingNote: string;
  loadInMeters: number;
}

export interface ShootabilityBreakdown {
  locationFit: number;
  access: number;
  timing: number;
  weather: number;
  permits: number;
}

export interface Conflict {
  type:
    | "weather"
    | "permit"
    | "closing"
    | "travel"
    | "drone"
    | "historical"
    | "access";
  message: string;
  severity: "warning" | "info";
}

export interface Location {
  id: string;
  name: string;
  type: string; 
  city: string;
  region: string;
  geo?: GeoPoint;
  images: string[];
  imageAttributions?: string[];
  whyItMatches: string;
  tags: string[];
  status: LocationStatus;
  logistics: Logistics;
  restrictions: ProductionRestriction[];
  weather: WeatherForecast;
  sun: SunTiming;
  alternativeWindow?: AlternativeWindow;
  sources: Source[];
  conflicts: Conflict[];
  shootability: number;
  breakdown: ShootabilityBreakdown;
}

export interface MapLocation {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  status: LocationStatus;
  score: number;
}
