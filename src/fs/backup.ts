// Backup management: write timestamped copies to BACKUP/ before every save,
// auto-prune keeping only the last N backups per model name.

import { readTextFile, writeTextFile, listDirFiles, deleteFile } from './sdcard.ts';
import type { SdRoot } from './sdcard.ts';

export const DEFAULT_MAX_BACKUPS = 5;

export interface BackupEntry {
  filename: string;      // e.g. "TRX4m-2026-06-04T14-30-00.yml"
  modelName: string;     // e.g. "TRX4m"
  timestamp: string;     // ISO-ish string extracted from filename
  path: string;          // relative path "BACKUP/..."
}

// Strip characters that are unsafe in filenames or that enable path traversal.
export function sanitiseModelName(name: string): string {
  return name.replace(/[/\\<>:"|?*\0]/g, '_').replace(/\.{2,}/g, '_').trim() || 'unknown';
}

// Generate a backup filename timestamp: YYYY-MM-DDTHH-MM-SS
function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Write a backup of the given content. modelName is the display name (e.g. "TRX4m").
export async function writeBackup(
  root: SdRoot,
  modelName: string,
  content: string,
  maxBackups = DEFAULT_MAX_BACKUPS,
): Promise<void> {
  const safeName = sanitiseModelName(modelName);
  const filename = `${safeName}-${nowStamp()}.yml`;
  await writeTextFile(root, `BACKUP/${filename}`, content);
  await pruneBackups(root, safeName, maxBackups);
}

// List backups for a specific model name, sorted newest-first.
export async function listBackups(root: SdRoot, modelName: string): Promise<BackupEntry[]> {
  const files = await listDirFiles(root, 'BACKUP');
  const prefix = `${sanitiseModelName(modelName)}-`;
  return files
    .filter((f) => f.startsWith(prefix) && f.endsWith('.yml'))
    .sort()
    .reverse()
    .map((filename) => ({
      filename,
      modelName,
      timestamp: filename.slice(prefix.length, -4),
      path: `BACKUP/${filename}`,
    }));
}

// Read backup content.
export async function readBackup(root: SdRoot, entry: BackupEntry): Promise<string> {
  return readTextFile(root, entry.path);
}

// Delete oldest backups, keeping only `keep` most recent.
export async function pruneBackups(root: SdRoot, modelName: string, keep: number): Promise<void> {
  const entries = await listBackups(root, sanitiseModelName(modelName));
  const toDelete = entries.slice(keep);
  for (const entry of toDelete) {
    await deleteFile(root, entry.path);
  }
}
