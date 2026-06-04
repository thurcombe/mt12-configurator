// Download utilities: single YAML file or full ZIP bundle.

import { strToU8, zip } from 'fflate';

export function downloadYaml(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ZipEntry {
  path: string;    // e.g. "MODELS/model00.yml"
  content: string;
}

export function downloadZip(entries: ZipEntry[], zipName = 'edgetx-models.zip'): void {
  const files: Record<string, Uint8Array> = {};
  for (const { path, content } of entries) {
    files[path] = strToU8(content);
  }

  zip(files, { level: 0 }, (err, data) => {
    if (err) {
      console.error('zip failed', err);
      return;
    }
    const blob = new Blob([data], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    a.click();
    URL.revokeObjectURL(url);
  });
}
