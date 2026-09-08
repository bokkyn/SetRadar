import type { UnitSystem } from "../app/auth";

export function formatDistance(
  km: number,
  units: UnitSystem = "metric",
): string {
  return units === "imperial"
    ? `${(km * 0.621371).toFixed(1)} mi`
    : `${km.toFixed(1)} km`;
}

export function formatTravel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
