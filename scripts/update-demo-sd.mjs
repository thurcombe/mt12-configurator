#!/usr/bin/env node
// Reads ~/Documents/sd_Template and writes src/data/sd-template.json.
// Run with: npm run update-demo

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.resolve(__dirname, '../src/data/sd-template.json');

const BINARY_EXTS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp', '.bin']);
const SKIP_DIRS = new Set(['BACKUP']);
const SKIP_FILES = new Set(['README.txt']);

function mimeFor(ext) {
  const map = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.bmp': 'image/bmp',
  };
  return map[ext] ?? 'application/octet-stream';
}

function readDir(dir, rel = '') {
  const out = {};
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      Object.assign(out, readDir(path.join(dir, entry.name), relPath));
    } else if (entry.isFile()) {
      if (SKIP_FILES.has(entry.name)) continue;
      const isImage = BINARY_EXTS.has(path.extname(entry.name).toLowerCase());
      if (isImage && !relPath.startsWith('IMAGES/library/') && relPath !== 'IMAGES/model00.jpg') continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTS.has(ext)) {
        const buf = fs.readFileSync(path.join(dir, entry.name));
        out[relPath] = `data:${mimeFor(ext)};base64,${buf.toString('base64')}`;
      } else {
        out[relPath] = fs.readFileSync(path.join(dir, entry.name), 'utf-8');
      }
    }
  }
  return out;
}

const templateDir = path.resolve(os.homedir(), 'Documents/sd_Template');
if (!fs.existsSync(templateDir)) {
  console.error(`Directory not found: ${templateDir}`);
  process.exit(1);
}

const files = readDir(templateDir);
fs.writeFileSync(OUT_FILE, JSON.stringify(files));
console.log(`Written ${Object.keys(files).length} files to ${OUT_FILE}`);
