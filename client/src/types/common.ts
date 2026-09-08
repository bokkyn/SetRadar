export type Verification = "confirmed" | "likely" | "verify" | "restricted";

export interface Source {
  id: string;
  label: string;
  kind: "map" | "official" | "tourism" | "municipal" | "editorial" | "community";
  url?: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}
