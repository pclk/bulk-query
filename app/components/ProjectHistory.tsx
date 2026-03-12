'use client';

import { useState } from 'react';
import { FolderOpen, Trash2, Clock, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { AuthMode, ProjectSummary } from '@/lib/schemas/task';

interface ProjectHistoryProps {
  authMode: AuthMode;
  projects: ProjectSummary[];
  loading: boolean;
  onLoadProject: (id: string) => Promise<void>;
  onSaveProject: (name: string) => Promise<boolean>;
  onDeleteProject: (id: string, name: string) => Promise<void>;
  showToast: (message: string) => void;
  canSave: boolean;
}

export default function ProjectHistory({
  authMode,
  projects,
  loading,
  onLoadProject,
  onSaveProject,
  onDeleteProject,
  showToast,
  canSave,
}: ProjectHistoryProps) {
  const [saving, setSaving] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [projectName, setProjectName] = useState('');

  const handleSave = async () => {
    if (!projectName.trim()) {
      showToast('Enter a project name');
      return;
    }

    setSaving(true);
    const saved = await onSaveProject(projectName.trim());
    setSaving(false);

    if (!saved) {
      return;
    }

    setProjectName('');
    setShowNameInput(false);
  };

  return (
    <Card>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <FolderOpen size={18} className="text-accent" />
          Projects
        </h3>
        {canSave && (
          <Button
            size="small"
            onClick={() => setShowNameInput(!showNameInput)}
          >
            <span className="flex items-center gap-1">
              <Save size={14} />
              Save
            </span>
          </Button>
        )}
      </div>

      <p className="mb-4 text-xs text-gray-500">
        {authMode === 'guest'
          ? 'Guest projects are saved locally in this browser.'
          : 'Signed-in projects are saved to your account.'}
      </p>

      {showNameInput && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Project name..."
            className="flex-1 p-2 bg-surface-dark border-2 border-surface-light rounded-lg text-gray-200 text-sm focus:outline-none focus:border-accent"
            autoFocus
          />
          <Button size="small" onClick={handleSave} disabled={saving}>
            {saving ? '...' : 'Save'}
          </Button>
        </div>
      )}

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
            className="p-3 bg-surface-light rounded-md flex justify-between items-center group"
          >
            <div className="flex-1 min-w-0 mr-3">
              <div className="text-sm font-medium truncate">{project.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <Clock size={10} />
                {new Date(project.updatedAt).toLocaleDateString()}
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
