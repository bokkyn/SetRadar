import type { ShootabilityBreakdown } from "../types/location";

export function computeShootability(b: ShootabilityBreakdown): number {
  const average =
    (b.locationFit + b.access + b.timing + b.weather + b.permits) / 5;
  return Math.min(100, Math.max(60, Math.round(average)));
}

export function shootabilityVerdict(score: number): string {
  if (score >= 85) return "Excellent candidate";
  if (score >= 72) return "Good candidate";
  if (score >= 55) return "Workable with planning";
  return "Challenging";
}
