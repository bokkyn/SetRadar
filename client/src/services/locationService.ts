import { getLocationById, mockLocations } from "../data/mockLocations"
import type { Location, MapLocation } from "../types/location"
import { delay } from "../utils/formatting"

const liveLocations = new Map<string, Location>()

export function cacheLocations(locations: Location[]) {
  locations.forEach((location) => liveLocations.set(location.id, location))
}

export async function getLocation(id: string): Promise<Location | undefined> {
  return delay(liveLocations.get(id) ?? getLocationById(id), 300)
}

export function toMapLocations(locations: Location[]): MapLocation[] {
  return locations.flatMap((l) =>
    l.geo
      ? [
          {
            id: l.id,
            latitude: l.geo.latitude,
            longitude: l.geo.longitude,
            title: l.name,
            status: l.status,
            score: l.shootability,
          },
        ]
      : [],
  )
}

export function getComparableLocations(): Location[] {
  return mockLocations
}
