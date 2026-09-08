import type { ResearchHistoryItem } from "../types/research";

export const mockResearchHistory: ResearchHistoryItem[] = [
  { id: "r1", prompt: "Abandoned industrial locations near Zagreb", date: "3 days ago", resultCount: 5 },
  { id: "r2", prompt: "Can Zagreb play Berlin?", date: "5 days ago", resultCount: 4 },
  { id: "r3", prompt: "Film locations near Zadar", date: "1 week ago", resultCount: 7 },
  { id: "r4", prompt: "Locations suitable for night shooting", date: "2 weeks ago", resultCount: 6 },
];
