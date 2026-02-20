'use client';

import { useState, useEffect } from 'react';
import { FolderOpen, Trash2, Clock, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import type { Chunk, ProcessingResult } from '@/lib/schemas/task';

interface ProjectSummary {
  id: string;
  name: string;
  taskPrompt: string;
  processingMode: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectFull extends ProjectSummary {
  rawText: string;
  chunks: Chunk[];
  results: ProcessingResult[] | null;
}

interface ProjectHistoryProps {
  onLoad: (project: ProjectFull) => void;
  onSave: (name: string) => Promise<void>;
  showToast: (message: string, error?: unknown) => void;
  canSave: boolean;
}

export default function ProjectHistory({ onLoad, onSave, showToast, canSave }: ProjectHistoryProps) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [projectName, setProjectName] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch {
      // Silently fail — user might not be authenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const loadProject = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error('Failed to load project');
      const data = await res.json();
      onLoad(data.project);
      showToast(`Loaded: ${data.project.name}`);
    } catch (err) {
      showToast('Failed to load project', err);
    }
  };

  const deleteProject = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showToast(`Deleted: ${name}`);
    } catch (err) {
      showToast('Failed to delete project', err);
    }
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      showToast('Enter a project name');
      return;
    }
    setSaving(true);
    await onSave(projectName.trim());
    setProjectName('');
    setShowNameInput(false);
    setSaving(false);
    fetchProjects();
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
                onClick={() => loadProject(project.id)}
              >
                Load
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => deleteProject(project.id, project.name)}
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
