import type { Location } from "../types/location";
import { computeShootability } from "../utils/shootability";

const img = (id: string, w = 1200, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`;

const raw: Omit<Location, "shootability">[] = [
  {
    id: "gredelj",
    name: "Former Gredelj Railway Complex",
    type: "Industrial",
    city: "Zagreb",
    region: "Croatia",
    geo: { latitude: 45.803, longitude: 15.99 },
    images: [
      img("1519558260268-cde7e03a0152"),
      img("1565793298595-6a879b1d9492"),
      img("1504384308090-c894fdcc538d"),
    ],
    whyItMatches:
      "Strong visual match for an abandoned industrial environment. Large open structures, exposed steel and concrete interiors, and drive-in access make this a promising candidate for a vehicle-based night shoot.",
    tags: ["Abandoned", "Concrete", "Vehicle access", "Night-friendly"],
    status: "researching",
    logistics: {
      distanceKm: 18.4,
      travelMinutes: 27,
      vehicleAccess: "likely",
      parking: "confirmed",
      parkingNote: "Gravel yard adjacent to the main hall",
      loadInMeters: 80,
    },
    restrictions: [
      {
        key: "permit",
        label: "Permit",
        value: "Verify",
        status: "verify",
        detail:
          "Site is owned by Croatian Railways; filming permission likely required.",
      },
      {
        key: "private",
        label: "Private property",
        value: "Likely",
        status: "likely",
      },
      {
        key: "drone",
        label: "Drone",
        value: "Restricted",
        status: "restricted",
        detail: "Proximity to active rail corridor.",
      },
      {
        key: "hours",
        label: "Access hours",
        value: "By arrangement",
        status: "verify",
      },
    ],
    weather: {
      temperatureC: 12,
      rainProbability: 18,
      windKph: 11,
      cloudCover: 40,
      visibilityKm: 14,
      risk: "low",
      summary: "Cool and mostly clear after dusk",
    },
    sun: {
      sunrise: "06:12",
      goldenHourStart: "18:12",
      sunset: "19:03",
      blueHourEnd: "19:25",
    },
    alternativeWindow: {
      label: "Wednesday, 16:30?19:30",
      reasons: ["Lower rain probability", "Better golden-hour overlap"],
    },
    sources: [
      { id: "s1", label: "Google Maps", kind: "map" },
      {
        id: "s2",
        label: "Zagreb industrial heritage register",
        kind: "municipal",
      },
      { id: "s3", label: "Local location scouting forum", kind: "community" },
    ],
    conflicts: [
      {
        type: "permit",
        severity: "warning",
        message: "Permit status needs verification before production.",
      },
      {
        type: "drone",
        severity: "info",
        message: "Drone use restricted near the rail corridor.",
      },
    ],
    breakdown: {
      locationFit: 94,
      access: 90,
      timing: 95,
      weather: 82,
      permits: 62,
    },
  },
  {
    id: "medvednica",
    name: "Medvednica Forest Road",
    type: "Forest road",
    city: "Zagreb",
    region: "Croatia",
    geo: { latitude: 45.9, longitude: 15.96 },
    images: [
      img("1441974231531-c6227db76b6e"),
      img("1448375240586-882707db888b"),
      img("1426604966848-d7adac402bff"),
    ],
    whyItMatches:
      "A quiet forest service road with dense canopy and low light pollution, well suited to atmospheric night driving shots. Firm surface supports a production van.",
    tags: ["Forest", "Low light pollution", "Vehicle access"],
    status: "researching",
    logistics: {
      distanceKm: 12.1,
      travelMinutes: 22,
      vehicleAccess: "confirmed",
      parking: "likely",
      parkingNote: "Trailhead lay-by, limited spaces",
      loadInMeters: 30,
    },
    restrictions: [
      {
        key: "permit",
        label: "Permit",
        value: "Verify",
        status: "verify",
        detail: "Nature park - filming permit likely required.",
      },
      {
        key: "private",
        label: "Private property",
        value: "Confirmed public",
        status: "confirmed",
      },
      {
        key: "drone",
        label: "Drone",
        value: "Restricted",
        status: "restricted",
        detail: "Protected nature park airspace.",
      },
      {
        key: "hours",
        label: "Access hours",
        value: "24h",
        status: "confirmed",
      },
    ],
    weather: {
      temperatureC: 9,
      rainProbability: 34,
      windKph: 8,
      cloudCover: 62,
      visibilityKm: 9,
      risk: "moderate",
      summary: "Damp with intermittent low cloud",
    },
    sun: {
      sunrise: "06:14",
      goldenHourStart: "18:08",
      sunset: "18:59",
      blueHourEnd: "19:21",
    },
    sources: [
      { id: "s1", label: "Google Maps", kind: "map" },
      { id: "s2", label: "Medvednica Nature Park", kind: "official" },
    ],
    conflicts: [
      {
        type: "weather",
        severity: "warning",
        message: "Rain expected during the final 45 minutes.",
      },
    ],
    breakdown: {
      locationFit: 81,
      access: 88,
      timing: 90,
      weather: 66,
      permits: 70,
    },
  },
  {
    id: "zagreb-fair",
    name: "Zagreb Fair Pavilion",
    type: "Modernist hall",
    city: "Zagreb",
    region: "Croatia",
    geo: { latitude: 45.77, longitude: 15.968 },
    images: [
      img("1497366216548-37526070297c"),
      img("1497366811353-6870744d04b2"),
      img("1503602642458-232111445657"),
    ],
    whyItMatches:
      "Cavernous modernist pavilion with sweeping concrete geometry and glazed frontage - reads as a large-scale institutional or sci-fi interior with generous rigging height.",
    tags: ["Modernist", "Interior", "High ceilings", "Vehicle access"],
    status: "shortlisted",
    logistics: {
      distanceKm: 6.8,
      travelMinutes: 14,
      vehicleAccess: "confirmed",
      parking: "confirmed",
      parkingNote: "Large adjacent surface lot",
      loadInMeters: 45,
    },
    restrictions: [
      {
        key: "permit",
        label: "Permit",
        value: "Likely",
        status: "likely",
        detail: "Managed venue with a bookings office.",
      },
      {
        key: "private",
        label: "Private property",
        value: "Confirmed",
        status: "confirmed",
      },
      { key: "drone", label: "Drone", value: "Verify", status: "verify" },
      {
        key: "hours",
        label: "Opening hours",
        value: "08:00?20:00",
        status: "confirmed",
      },
    ],
    weather: {
      temperatureC: 13,
      rainProbability: 10,
      windKph: 6,
      cloudCover: 20,
      visibilityKm: 16,
      risk: "low",
      summary: "Clear and mild - interior shoot unaffected",
    },
    sun: {
      sunrise: "06:12",
      goldenHourStart: "18:12",
      sunset: "19:03",
      blueHourEnd: "19:25",
    },
    sources: [
      { id: "s1", label: "Google Maps", kind: "map" },
      { id: "s2", label: "Zagreb Fair official site", kind: "official" },
      { id: "s3", label: "Zagreb tourism board", kind: "tourism" },
    ],
    conflicts: [
      {
        type: "closing",
        severity: "warning",
        message: "Venue closes at 20:00 - a 20:30 wrap would overrun.",
      },
    ],
    breakdown: {
      locationFit: 88,
      access: 95,
      timing: 84,
      weather: 92,
      permits: 78,
    },
  },
  {
    id: "sava-warehouse",
    name: "Sava River Warehouse District",
    type: "Warehouse",
    city: "Zagreb",
    region: "Croatia",
    geo: { latitude: 45.75, longitude: 16.02 },
    images: [
      img("1587293852726-70cdb56c2866"),
      img("1553413077-190dd305871c"),
      img("1517420704952-d9f39e95b43e"),
    ],
    whyItMatches:
      "Rows of weathered brick and steel warehouses along the river offer flexible exteriors and load-in - a versatile backlot for gritty urban night work.",
    tags: ["Warehouse", "Brick", "Riverside", "Backlot"],
    status: "researching",
    logistics: {
      distanceKm: 9.2,
      travelMinutes: 18,
      vehicleAccess: "confirmed",
      parking: "likely",
      parkingNote: "Street parking along the quay",
      loadInMeters: 120,
    },
    restrictions: [
      { key: "permit", label: "Permit", value: "Verify", status: "verify" },
      {
        key: "private",
        label: "Private property",
        value: "Mixed",
        status: "likely",
      },
      { key: "drone", label: "Drone", value: "Likely OK", status: "likely" },
      {
        key: "hours",
        label: "Access hours",
        value: "Verify",
        status: "verify",
      },
    ],
    weather: {
      temperatureC: 12,
      rainProbability: 22,
      windKph: 15,
      cloudCover: 45,
      visibilityKm: 12,
      risk: "low",
      summary: "Breezy along the river, otherwise dry",
    },
    sun: {
      sunrise: "06:13",
      goldenHourStart: "18:10",
      sunset: "19:01",
      blueHourEnd: "19:23",
    },
    sources: [
      { id: "s1", label: "Google Maps", kind: "map" },
      { id: "s2", label: "City planning portal", kind: "municipal" },
    ],
    conflicts: [
      {
        type: "access",
        severity: "info",
        message: "Ownership is mixed across units - confirm per building.",
      },
    ],
    breakdown: {
      locationFit: 85,
      access: 86,
      timing: 88,
      weather: 84,
      permits: 68,
    },
  },
  {
    id: "old-warehouse",
    name: "Old Industrial Warehouse, Ĺ˝itnjak",
    type: "Industrial",
    city: "Zagreb",
    region: "Croatia",
    geo: { latitude: 45.79, longitude: 16.05 },
    images: [
      img("1523294587484-bae6cc870010"),
      img("1581093458791-9f3c3900df4b"),
      img("1516937941344-00b4e0337589"),
    ],
    whyItMatches:
      "Single-span warehouse with skylights, peeling paint and heavy roller doors - an economical, controllable interior for a self-contained night sequence.",
    tags: ["Abandoned", "Skylights", "Controllable", "Vehicle access"],
    status: "researching",
    logistics: {
      distanceKm: 14.7,
      travelMinutes: 24,
      vehicleAccess: "likely",
      parking: "confirmed",
      parkingNote: "Fenced yard, secure overnight",
      loadInMeters: 20,
    },
    restrictions: [
      { key: "permit", label: "Permit", value: "Likely", status: "likely" },
      {
        key: "private",
        label: "Private property",
        value: "Confirmed",
        status: "confirmed",
      },
      { key: "drone", label: "Drone", value: "Verify", status: "verify" },
      {
        key: "hours",
        label: "Access hours",
        value: "By arrangement",
        status: "verify",
      },
    ],
    weather: {
      temperatureC: 11,
      rainProbability: 15,
      windKph: 9,
      cloudCover: 30,
      visibilityKm: 15,
      risk: "low",
      summary: "Calm and dry",
    },
    sun: {
      sunrise: "06:12",
      goldenHourStart: "18:11",
      sunset: "19:02",
      blueHourEnd: "19:24",
    },
    sources: [
      { id: "s1", label: "Google Maps", kind: "map" },
      { id: "s2", label: "Commercial letting agent", kind: "editorial" },
    ],
    conflicts: [],
    breakdown: {
      locationFit: 83,
      access: 84,
      timing: 90,
      weather: 90,
      permits: 74,
    },
  },
];

const baseLocations: Location[] = raw.map((l) => ({
  ...l,
  shootability: computeShootability(l.breakdown),
}));

export const mockLocations: Location[] = [
  ...baseLocations,
  {
    ...baseLocations[0],
    id: "brooklyn-navy-yard",
    name: "Brooklyn Navy Yard - Building 77",
    type: "Industrial complex",
    city: "New York",
    region: "United States",
    images: [
      "https://plazaconstruction-live-4722ba4b72b94e2d-9190b8d.aldryn-media.io/filer_public_thumbnails/filer_public/a2/d5/a2d507b2-d161-4fb6-9269-5edd839f86a7/metnick_160329_0045.jpg__750x500_q90_crop_subsampling-2.jpg",
    ],
    whyItMatches:
      "A vast former shipbuilding complex with raw steel, concrete volumes and controllable industrial interiors - a strong visual starting point for a contained night sequence near New York.",
    logistics: {
      ...baseLocations[0].logistics,
      distanceKm: 14.2,
      travelMinutes: 32,
    },
    sources: [
      { id: "ny-1", label: "Brooklyn Navy Yard", kind: "official" },
      { id: "ny-2", label: "Google Maps", kind: "map" },
    ],
  },
];

export function getLocationById(id: string): Location | undefined {
  return mockLocations.find((l) => l.id === id);
}
