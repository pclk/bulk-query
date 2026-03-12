'use client';

import { FolderOpen, Trash2, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { AuthMode, ProjectSummary } from '@/lib/schemas/task';

interface ProjectHistoryProps {
  authMode: AuthMode;
  projects: ProjectSummary[];
  loading: boolean;
  activeProjectId: string | null;
  onLoadProject: (id: string) => Promise<void>;
  onNewProject: () => Promise<void> | void;
  onDeleteProject: (id: string, name: string) => Promise<void>;
  className?: string;
}

export default function ProjectHistory({
  authMode,
  projects,
  loading,
  activeProjectId,
  onLoadProject,
  onNewProject,
  onDeleteProject,
  className = '',
}: ProjectHistoryProps) {
  return (
    <Card className={`mb-0 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <FolderOpen size={18} className="text-accent" />
          Projects
        </h3>
        <Button
          type="button"
          size="small"
          onClick={onNewProject}
          aria-label="Start a new project"
          title="Start a new project"
          className="min-w-0 px-3 text-lg leading-none"
        >
          +
        </Button>
      </div>

      <p className="mb-4 text-xs text-gray-500">
        {authMode === 'guest'
          ? 'Guest projects are saved locally in this browser.'
          : 'Signed-in projects are saved to your account.'}
      </p>

      {loading && (
        <div className="text-sm text-gray-500 text-center py-4">Loading...</div>
      )}

      {!loading && projects.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-4">
          No saved projects yet.
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            className={`p-3 rounded-md flex justify-between items-center group border ${
              project.id === activeProjectId
                ? 'bg-accent/10 border-accent/40'
                : 'bg-surface-light border-transparent'
            }`}
          >
            <div className="flex-1 min-w-0 mr-3">
              <div className="text-sm font-medium truncate">{project.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Clock size={10} />
                {new Date(project.updatedAt).toLocaleDateString()}
              </div>
              <div className="mt-2 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                completed {project.completedCount}/4
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="small"
                onClick={() => onLoadProject(project.id)}
              >
                Load
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => onDeleteProject(project.id, project.name)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
