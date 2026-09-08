import type { Project } from "../types/project";

export const mockProjects: Project[] = [
  {
    id: "midnight-signal",
    title: "Midnight Signal",
    productionType: "Feature Film",
    genre: "Sci-fi thriller",
    description:
      "A dead radio signal draws an engineer into an abandoned industrial fringe outside the city.",
    totalScenes: 0,
    shortlisted: 4,
    warnings: 2,
    locations: [
      {
        locationId: "zagreb-fair",
        status: "shortlisted",
        warnings: 1,
        scenes: [],
      },
      {
        locationId: "gredelj",
        status: "researching",
        warnings: 1,
        scenes: [],
      },
    ],
  },
  {
    id: "glass-houses",
    title: "Glass Houses",
    productionType: "Commercial",
    genre: "Automotive",
    description:
      "A luxury EV spot built around reflective modernist architecture at dusk.",
    totalScenes: 0,
    shortlisted: 2,
    warnings: 0,
    locations: [
      {
        locationId: "medvednica",
        status: "contacted",
        warnings: 0,
        scenes: [],
      },
    ],
  },
  {
    id: "after-last-train",
    title: "After the Last Train",
    productionType: "Short Film",
    genre: "Drama",
    description:
      "Two strangers miss the last train and wander a warehouse district until dawn.",
    totalScenes: 0,
    shortlisted: 1,
    warnings: 0,
    locations: [],
  },
];

export function getProjectById(id: string): Project | undefined {
  return mockProjects.find((p) => p.id === id);
}
