// In-memory filesystem that structurally matches the File System Access API.
// Used in demo mode to provide a sandboxed, per-tab virtual SD card.

type FileContent = string | Uint8Array;

interface Tree {
  files: Map<string, FileContent>;
  dirs: Map<string, Tree>;
}

function makeTree(): Tree {
  return { files: new Map(), dirs: new Map() };
}

function decodeDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  const b64 = dataUrl.slice(comma + 1);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function mimeFromName(name: string): string {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  };
  return map[ext] ?? 'application/octet-stream';
}

class MemoryWritable {
  private parts: (string | Uint8Array)[] = [];
  constructor(private onClose: (data: FileContent) => void) {}

  async write(data: string | ArrayBuffer): Promise<void> {
    if (typeof data === 'string') {
      this.parts.push(data);
    } else {
      this.parts.push(new Uint8Array(data));
    }
  }

  async close(): Promise<void> {
    if (this.parts.length === 0) {
      this.onClose('');
      return;
    }
    if (this.parts.every((p) => typeof p === 'string')) {
      this.onClose((this.parts as string[]).join(''));
    } else {
      const total = this.parts.reduce((n, p) => n + (typeof p === 'string' ? p.length : p.length), 0);
      const out = new Uint8Array(total);
      let offset = 0;
      for (const p of this.parts) {
        if (typeof p === 'string') {
          const enc = new TextEncoder().encode(p);
          out.set(enc, offset);
          offset += enc.length;
        } else {
          out.set(p as Uint8Array, offset);
          offset += (p as Uint8Array).length;
        }
      }
      this.onClose(out);
    }
  }
}

class MemoryFileHandle {
  readonly kind = 'file' as const;
  constructor(private tree: Tree, private name: string) {}

  async getFile(): Promise<File> {
    const data = this.tree.files.get(this.name);
    if (data === undefined) throw new DOMException('File not found', 'NotFoundError');
    if (typeof data === 'string') {
      return new File([data], this.name, { type: 'text/plain' });
    }
    return new File([data.buffer as ArrayBuffer], this.name, { type: mimeFromName(this.name) });
  }

  async createWritable(): Promise<MemoryWritable> {
    return new MemoryWritable((content) => {
      this.tree.files.set(this.name, content);
    });
  }
}

export class MemoryDirHandle {
  readonly kind = 'directory' as const;
  constructor(public readonly _tree: Tree) {}

  async getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<MemoryDirHandle> {
    if (!this._tree.dirs.has(name)) {
      if (!opts?.create) throw new DOMException('Directory not found', 'NotFoundError');
      this._tree.dirs.set(name, makeTree());
    }
    return new MemoryDirHandle(this._tree.dirs.get(name)!);
  }

  async getFileHandle(name: string, opts?: { create?: boolean }): Promise<MemoryFileHandle> {
    if (!this._tree.files.has(name)) {
      if (!opts?.create) throw new DOMException('File not found', 'NotFoundError');
      this._tree.files.set(name, '');
    }
    return new MemoryFileHandle(this._tree, name);
  }

  async removeEntry(name: string): Promise<void> {
    if (!this._tree.files.delete(name) && !this._tree.dirs.delete(name)) {
      throw new DOMException('Entry not found', 'NotFoundError');
    }
  }

  async *entries(): AsyncIterableIterator<[string, MemoryFileHandle | MemoryDirHandle]> {
    for (const name of this._tree.files.keys()) yield [name, new MemoryFileHandle(this._tree, name)];
    for (const name of this._tree.dirs.keys()) yield [name, new MemoryDirHandle(this._tree.dirs.get(name)!)];
  }
}

// Initialise a MemoryDirHandle from a flat path→content map (as produced by the Vite plugin).
// Data-URL entries (binary files) are decoded to Uint8Array.
export function createMemoryRoot(template: Record<string, string>): MemoryDirHandle {
  const root = new MemoryDirHandle(makeTree());
  for (const [filePath, raw] of Object.entries(template)) {
    const parts = filePath.split('/');
    let tree = root._tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!tree.dirs.has(parts[i])) tree.dirs.set(parts[i], makeTree());
      tree = tree.dirs.get(parts[i])!;
    }
    const content: FileContent = raw.startsWith('data:') ? decodeDataUrl(raw) : raw;
    tree.files.set(parts[parts.length - 1], content);
  }
  return root;
}

// Walk the memory tree and return a flat path→Uint8Array map for zip export.
async function collectFiles(dir: MemoryDirHandle, prefix: string): Promise<Record<string, Uint8Array>> {
  const out: Record<string, Uint8Array> = {};
  for await (const [name, handle] of dir.entries()) {
    const p = prefix ? `${prefix}/${name}` : name;
    if (handle.kind === 'directory') {
      const sub = await dir.getDirectoryHandle(name);
      Object.assign(out, await collectFiles(sub, p));
    } else {
      const fh = await dir.getFileHandle(name);
      const file = await fh.getFile();
      out[p] = new Uint8Array(await file.arrayBuffer());
    }
  }
  return out;
}

export async function exportToZip(root: MemoryDirHandle): Promise<Uint8Array> {
  const { zipSync } = await import('fflate');
  const files = await collectFiles(root, '');
  return zipSync(files);
}
