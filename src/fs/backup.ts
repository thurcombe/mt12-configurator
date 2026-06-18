// Backup management: write timestamped copies to BACKUP/ before every save,
// auto-prune keeping only the last N backups per model name.

import { readTextFile, writeTextFile, writeBinaryFile, listDirFiles, deleteFile } from './sdcard.ts';
import type { SdRoot } from './sdcard.ts';

const IMAGE_BACKUP_EXTS = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp']);


export interface BackupEntry {
  filename: string;      // e.g. "TRX4m-2026-06-04T14-30-00.yml"
  modelName: string;     // e.g. "TRX4m"
  timestamp: string;     // ISO-ish string extracted from filename
  path: string;          // relative path "BACKUP/..."
  imagePath?: string;    // relative path to backup image if one was saved
}

// Strip characters that are unsafe in filenames or that enable path traversal.
export function sanitiseModelName(name: string): string {
  return name
    .replace(/[/\\<>:"|?*\0]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^\.$/, '_')
    .trim() || 'unknown';
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
  maxBackups: number,
  image?: { data: ArrayBuffer; ext: string },
): Promise<void> {
  const safeName = sanitiseModelName(modelName);
  const ts = nowStamp();
  await writeTextFile(root, `BACKUP/${safeName}-${ts}.yml`, content);
  if (image) {
    await writeBinaryFile(root, `BACKUP/${safeName}-${ts}${image.ext}`, image.data);
  }
  await pruneBackups(root, safeName, maxBackups);
}

// Build a map of backup base-name (no extension) → image filename for all image files in BACKUP/.
async function backupImageMap(root: SdRoot): Promise<Map<string, string>> {
  const files = await listDirFiles(root, 'BACKUP');
  const map = new Map<string, string>();
  for (const f of files) {
    const dot = f.lastIndexOf('.');
    if (dot < 0) continue;
    const ext = f.slice(dot + 1).toLowerCase();
    if (IMAGE_BACKUP_EXTS.has(ext)) map.set(f.slice(0, dot), f);
  }
  return map;
}

// List backups for a specific model name, sorted newest-first.
export async function listBackups(root: SdRoot, modelName: string): Promise<BackupEntry[]> {
  const files = await listDirFiles(root, 'BACKUP');
  const imgMap = await backupImageMap(root);
  const prefix = `${sanitiseModelName(modelName)}-`;
  return files
    .filter((f) => f.startsWith(prefix) && f.endsWith('.yml'))
    .sort()
    .reverse()
    .map((filename) => {
      const base = filename.slice(0, -4);
      return {
        filename,
        modelName,
        timestamp: filename.slice(prefix.length, -4),
        path: `BACKUP/${filename}`,
        imagePath: imgMap.has(base) ? `BACKUP/${imgMap.get(base)!}` : undefined,
      };
    });
}

// List all backups across all models, sorted newest-first.
export async function listAllBackups(root: SdRoot): Promise<BackupEntry[]> {
  const files = await listDirFiles(root, 'BACKUP');
  const imgMap = await backupImageMap(root);
  return files
    .filter((f) => f.endsWith('.yml'))
    .sort()
    .reverse()
    .map((filename) => {
      const base = filename.slice(0, -4);
      const tsMatch = base.match(/-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})$/);
      const timestamp = tsMatch ? tsMatch[1] : '';
      const modelName = tsMatch ? base.slice(0, base.length - tsMatch[0].length) : base;
      return {
        filename,
        modelName,
        timestamp,
        path: `BACKUP/${filename}`,
        imagePath: imgMap.has(base) ? `BACKUP/${imgMap.get(base)!}` : undefined,
      };
    });
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
    if (entry.imagePath) await deleteFile(root, entry.imagePath).catch(() => {});
    await deleteFile(root, entry.path);
  }
}
