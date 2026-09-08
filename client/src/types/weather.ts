export type WeatherRisk = "low" | "moderate" | "high";

export interface WeatherForecast {
  temperatureC?: number;
  rainProbability?: number; 
  windKph?: number;
  cloudCover?: number; 
  visibilityKm?: number;
  risk: WeatherRisk;
  summary: string;
  score?: number;
}

export interface SunTiming {
  sunrise?: string;
  goldenHourStart?: string;
  sunset?: string;
  blueHourEnd?: string;
}

export interface AlternativeWindow {
  label: string; 
  reasons: string[];
}
