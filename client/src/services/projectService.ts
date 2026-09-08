import { getProjectById, mockProjects } from "../data/mockProjects";
import type { Project } from "../types/project";
import { delay } from "../utils/formatting";

export async function getProjects(): Promise<Project[]> {
  return delay(mockProjects, 300);
}

export async function getProject(id: string): Promise<Project | undefined> {
  return delay(getProjectById(id), 300);
}
