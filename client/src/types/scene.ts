import type { ShootStatus } from "../utils/dates";

export interface Scene {
  id: string;
  number: number;
  title: string;
  description?: string;
  shootDate?: string;
  startTime?: string; 
  endTime?: string; 
  statusOverride?: ShootStatus;
}
