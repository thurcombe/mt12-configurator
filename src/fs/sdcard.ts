// File System Access API wrapper for the EdgeTX SD card.
// All paths are relative to the SD card root, using forward slashes.
// e.g. "MODELS/model00.yml", "RADIO/radio.yml".

export type SdRoot = FileSystemDirectoryHandle;

export async function pickSdCard(): Promise<SdRoot> {
  return showDirectoryPicker({ mode: 'readwrite', id: 'edgetx-sdcard' });
}

async function resolveDir(
  root: SdRoot,
  segments: string[],
  create = false,
): Promise<FileSystemDirectoryHandle> {
  let dir: FileSystemDirectoryHandle = root;
  for (const seg of segments) {
    dir = await dir.getDirectoryHandle(seg, { create });
  }
  return dir;
}

export async function readTextFile(root: SdRoot, relativePath: string): Promise<string> {
  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  const dir = parts.length ? await resolveDir(root, parts) : root;
  const fh = await dir.getFileHandle(filename);
  const file = await fh.getFile();
  return file.text();
}

export async function writeTextFile(root: SdRoot, relativePath: string, content: string): Promise<void> {
  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  const dir = parts.length ? await resolveDir(root, parts, true) : root;
  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(content);
  await writable.close();
}

// Returns sorted list of model filenames, e.g. ['model00.yml', 'model01.yml'].
export async function listModelFiles(root: SdRoot): Promise<string[]> {
  const modelsDir = await resolveDir(root, ['MODELS']);
  const names: string[] = [];
  for await (const [name, handle] of modelsDir.entries()) {
    if (handle.kind === 'file' && /^model\d+\.yml$/.test(name)) {
      names.push(name);
    }
  }
  return names.sort();
}

// Returns all files in a directory (non-recursive). Returns [] if dir doesn't exist.
export async function listDirFiles(root: SdRoot, dirPath: string): Promise<string[]> {
  try {
    const dir = await resolveDir(root, dirPath.split('/'));
    const names: string[] = [];
    for await (const [name, handle] of dir.entries()) {
      if (handle.kind === 'file') names.push(name);
    }
    return names;
  } catch {
    return [];
  }
}

export async function deleteModelImage(root: SdRoot, modelKey: string): Promise<void> {
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await resolveDir(root, ['IMAGES']);
  } catch {
    return;
  }
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file') continue;
    const dot = name.lastIndexOf('.');
    if (dot >= 0 && name.slice(0, dot).toLowerCase() === modelKey.toLowerCase()) {
      await dir.removeEntry(name);
      return;
    }
  }
}

export async function deleteFile(root: SdRoot, relativePath: string): Promise<void> {
  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  const dir = parts.length ? await resolveDir(root, parts) : root;
  await dir.removeEntry(filename);
}

export async function writeBinaryFile(root: SdRoot, relativePath: string, data: ArrayBuffer): Promise<void> {
  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  const dir = parts.length ? await resolveDir(root, parts, true) : root;
  const fh = await dir.getFileHandle(filename, { create: true });
  const writable = await fh.createWritable();
  await writable.write(data);
  await writable.close();
}

// Generic image finder — scans any directory for images matching given base names.
export async function findImages(
  root: SdRoot,
  dirPath: string,
  keys: string[],
): Promise<Record<string, string>> {
  const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp']);
  const result: Record<string, string> = {};
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await resolveDir(root, dirPath.split('/'));
  } catch {
    return result;
  }
  const keySet = new Set(keys.map((k) => k.toLowerCase()));
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file') continue;
    const dot = name.lastIndexOf('.');
    if (dot < 0) continue;
    const base = name.slice(0, dot).toLowerCase();
    const ext = name.slice(dot + 1).toLowerCase();
    if (!keySet.has(base) || !IMAGE_EXTS.has(ext)) continue;
    const file = await (handle as FileSystemFileHandle).getFile();
    const key = keys.find((k) => k.toLowerCase() === base)!;
    if (result[key]) URL.revokeObjectURL(result[key]);
    result[key] = URL.createObjectURL(file);
  }
  return result;
}

// Returns object URLs for any image files found in dirPath that match the given base names.
// e.g. findImages(root, 'IMAGES', ['model00', 'model01']) -> { model00: 'blob:...', model01: 'blob:...' }
export async function findModelImages(root: SdRoot, modelKeys: string[]): Promise<Record<string, string>> {
  const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp']);
  const result: Record<string, string> = {};
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await resolveDir(root, ['IMAGES']);
  } catch {
    return result;
  }
  const keySet = new Set(modelKeys.map((k) => k.toLowerCase()));
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind !== 'file') continue;
    const dot = name.lastIndexOf('.');
    if (dot < 0) continue;
    const base = name.slice(0, dot).toLowerCase();
    const ext = name.slice(dot + 1).toLowerCase();
    if (!keySet.has(base) || !IMAGE_EXTS.has(ext)) continue;
    const file = await (handle as FileSystemFileHandle).getFile();
    const key = modelKeys.find((k) => k.toLowerCase() === base)!;
    if (result[key]) URL.revokeObjectURL(result[key]);
    result[key] = URL.createObjectURL(file);
  }
  return result;
}
