import type { Scene } from "./scene";
import type { Location, LocationStatus } from "./location";

export type ProductionType =
  | "Feature Film"
  | "Short Film"
  | "Documentary"
  | "Commercial"
  | "Music Video"
  | "YouTube"
  | "Vlog"
  | "TV / Streaming"
  | "Student Film"
  | "Behind the Scenes"
  | "Other";

export interface ProjectLocation {
  locationId: string;
  location?: Location;
  status: LocationStatus;
  scenes: Scene[];
  warnings: number;
  shootDates?: string;
  notes?: string;
}

export interface Project {
  id: string;
  ownerId?: string;
  title: string;
  productionType: ProductionType;
  genre?: string;
  description: string;
  locations: ProjectLocation[];
  totalScenes: number;
  shortlisted: number;
  warnings: number;
}
