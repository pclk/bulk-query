import { promises as fs } from 'fs';
import path from 'path';

export interface InputTextTemplate {
  id: string;
  name: string;
  content: string;
}

export const INPUT_TEMPLATES_DIR = path.join(process.cwd(), 'input_templates');

function toTemplateName(filename: string) {
  const basename = filename.replace(/\.[^.]+$/, '');
  return basename
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export async function loadInputTemplates(): Promise<InputTextTemplate[]> {
  let entries: string[];

  try {
    entries = await fs.readdir(INPUT_TEMPLATES_DIR);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const templateFiles = entries
    .filter((entry) => /\.(txt|md)$/i.test(entry))
    .sort((a, b) => a.localeCompare(b));

  const templates = await Promise.all(
    templateFiles.map(async (filename) => {
      const content = await fs.readFile(path.join(INPUT_TEMPLATES_DIR, filename), 'utf8');

      return {
        id: filename,
        name: toTemplateName(filename),
        content: content.trim(),
      };
    })
  );

  return templates.filter((template) => template.content.length > 0);
}
