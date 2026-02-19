'use client';

import { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';
import { generateId } from '@/lib/utils';
import type { Template } from '@/lib/schemas/task';

const PREDEFINED_TEMPLATES: Template[] = [
  { id: 'translate', name: 'Translate', prompt: 'Translate the following text to [TARGET LANGUAGE]:' },
  { id: 'summarize', name: 'Summarize', prompt: 'Provide a concise summary of the following text, highlighting key points:' },
  { id: 'flashcards', name: 'Flashcards', prompt: 'Convert the following text into flashcards. Format each as "Question;Answer" on separate lines:' },
  { id: 'format', name: 'Format', prompt: 'Reformat the following text into clear, organized bullet points:' },
];

interface Step1Props {
  taskPrompt: string;
  setTaskPrompt: (prompt: string) => void;
  savedTemplates: Template[];
  setSavedTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
  onNext: () => void;
  showToast: (message: string) => void;
}

export default function Step1TaskDefinition({
  taskPrompt,
  setTaskPrompt,
  savedTemplates,
  setSavedTemplates,
  onNext,
  showToast,
}: Step1Props) {
  const [templateName, setTemplateName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const loadTemplate = (template: Template) => {
    setTaskPrompt(template.prompt);
    showToast(`Loaded template: ${template.name}`);
  };

  const saveTemplate = () => {
    if (!templateName.trim()) {
      showToast('Please enter a template name');
      return;
    }
    if (!taskPrompt.trim()) {
      showToast('Please enter a prompt first');
      return;
    }
    const newTemplate: Template = {
      id: generateId(),
      name: templateName,
      prompt: taskPrompt,
    };
    setSavedTemplates((prev) => [...prev, newTemplate]);
    showToast(`Template "${templateName}" saved!`);
    setTemplateName('');
    setShowSaveDialog(false);
  };

  const deleteTemplate = (id: string) => {
    setSavedTemplates((prev) => prev.filter((t) => t.id !== id));
    showToast('Template deleted');
  };

  const handleNext = () => {
    if (!taskPrompt.trim()) {
      showToast('Please enter a task prompt');
      return;
    }
    onNext();
  };

  return (
    <div>
      <Card>
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Define Your Task</h2>
        <p className="mb-6 text-gray-400">
          Describe what you want to do with your text (e.g., translate, summarize, create flashcards)
        </p>

        <div className="mb-6">
          <div className="flex gap-2 flex-wrap mb-4">
            {PREDEFINED_TEMPLATES.map((template) => (
              <Button
                key={template.id}
                variant="secondary"
                size="small"
                onClick={() => loadTemplate(template)}
              >
                {template.name}
              </Button>
            ))}
          </div>
        </div>

        <Textarea
          value={taskPrompt}
          onChange={(e) => setTaskPrompt(e.target.value)}
          placeholder="Enter your custom instructions here..."
          rows={8}
          className="mb-4"
        />

        <div className="flex gap-4 mb-6">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowSaveDialog(!showSaveDialog)}
          >
            <span className="flex items-center gap-2">
              <Save size={16} />
              Save as Template
            </span>
          </Button>
        </div>

        {showSaveDialog && (
          <div className="mb-6 p-4 bg-surface-light rounded-lg">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Template name..."
              className="w-full p-3 bg-surface border-2 border-surface-lighter rounded-md text-gray-200 mb-3 focus:outline-none focus:border-accent"
            />
            <Button size="small" onClick={saveTemplate}>
              Save Template
            </Button>
          </div>
        )}

        {savedTemplates.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base mb-3 text-gray-300">Saved Templates</h3>
            <div className="flex flex-col gap-2">
              {savedTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex justify-between items-center p-3 bg-surface-light rounded-md"
                >
                  <span>{template.name}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => loadTemplate(template)}
                    >
                      Load
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <span className="flex items-center gap-1">
                        <Trash2 size={14} />
                        Delete
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleNext}>Next &rarr;</Button>
        </div>
      </Card>
    </div>
  );
}
