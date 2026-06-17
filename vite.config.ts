import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';
import fs from 'fs';

const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.bin']);
const SKIP_DIRS = new Set(['BACKUP']);
const SKIP_FILES = new Set(['README.txt']);

function mimeFor(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  };
  return map[ext] ?? 'application/octet-stream';
}

function readTemplateDir(dir: string, rel = ''): Record<string, string> {
  const out: Record<string, string> = {};
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      Object.assign(out, readTemplateDir(path.join(dir, entry.name), relPath));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      // Only bundle IMAGES/library/* and model00 — skip all other top-level model photos
      const isImage = BINARY_EXTS.has(path.extname(entry.name).toLowerCase());
      if (isImage && !relPath.startsWith('IMAGES/library/') && relPath !== 'IMAGES/model00.jpg') continue;
      const fullPath = path.join(dir, entry.name);
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTS.has(ext)) {
        const buf = fs.readFileSync(fullPath);
        out[relPath] = `data:${mimeFor(ext)};base64,${buf.toString('base64')}`;
      } else {
        out[relPath] = fs.readFileSync(fullPath, 'utf-8');
      }
    }
  }
  return out;
}

function sdTemplatePlugin(): Plugin {
  const virtualId = 'virtual:sd-template';
  const resolvedId = '\0' + virtualId;
  return {
    name: 'sd-template',
    resolveId(id) {
      if (id === virtualId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      const templateDir = path.resolve(os.homedir(), 'Documents/sd_Template');
      const files = readTemplateDir(templateDir);
      const count = Object.keys(files).length;
      console.log(`[sd-template] bundled ${count} files from ${templateDir}`);
      return `export const SD_TEMPLATE = ${JSON.stringify(files, null, 0)};`;
    },
  };
}

export default defineConfig({
  plugins: [sdTemplatePlugin(), react()],
  test: {
    environment: 'node',
  },
});
