import type { ProjectRecord, ProjectSummary } from '@/lib/schemas/task';
import { computeCompletedStepCount } from '@/lib/utils';

const GUEST_SESSION_KEY = 'bulk-query-guest-session';
const GUEST_PROJECTS_KEY = 'bulk-query-guest-projects';

export const GUEST_USER_LABEL = 'Guest';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function isGuestSessionActive(): boolean {
  if (!isBrowser()) {
    return false;
  }

  return localStorage.getItem(GUEST_SESSION_KEY) === 'true';
}

export function startGuestSession() {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(GUEST_SESSION_KEY, 'true');
}

export function endGuestSession() {
  if (!isBrowser()) {
    return;
  }

  localStorage.removeItem(GUEST_SESSION_KEY);
}

export function getGuestProjects(): ProjectRecord[] {
  if (!isBrowser()) {
    return [];
  }

  const stored = localStorage.getItem(GUEST_PROJECTS_KEY);
  if (!stored) {
    return [];
  }

  try {
    const projects = JSON.parse(stored);
    return Array.isArray(projects) ? (projects as ProjectRecord[]) : [];
  } catch {
    localStorage.removeItem(GUEST_PROJECTS_KEY);
    return [];
  }
}

export function saveGuestProjects(projects: ProjectRecord[]) {
  if (!isBrowser()) {
    return;
  }

  localStorage.setItem(GUEST_PROJECTS_KEY, JSON.stringify(projects));
}

export function upsertGuestProject(project: ProjectRecord): ProjectRecord[] {
  const existing = getGuestProjects().filter((entry) => entry.id !== project.id);
  const nextProjects = [project, ...existing].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  saveGuestProjects(nextProjects);
  return nextProjects;
}

export function deleteGuestProject(id: string): ProjectRecord[] {
  const nextProjects = getGuestProjects().filter((project) => project.id !== id);
  saveGuestProjects(nextProjects);
  return nextProjects;
}

export function toProjectSummaries(projects: ProjectRecord[]): ProjectSummary[] {
  return projects.map(({ rawText, chunks, results, ...summary }) => ({
    ...summary,
    completedCount: computeCompletedStepCount({
      rawText,
      chunks,
      taskPrompt: summary.taskPrompt,
      results,
    }),
  }));
}
