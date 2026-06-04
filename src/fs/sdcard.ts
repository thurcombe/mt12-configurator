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

export async function deleteFile(root: SdRoot, relativePath: string): Promise<void> {
  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  const dir = parts.length ? await resolveDir(root, parts) : root;
  await dir.removeEntry(filename);
}
