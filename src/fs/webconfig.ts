// Persistent app preferences stored in .webconfig/ on the SD card.
// This keeps preferences tied to the transmitter, not the browser.

import type { SdRoot } from './sdcard.ts';
import { readTextFile, writeTextFile } from './sdcard.ts';

const DIR = '.webconfig';

export async function readWebConfig<T>(sdRoot: SdRoot, filename: string): Promise<T | null> {
  try {
    const text = await readTextFile(sdRoot, `${DIR}/${filename}`);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeWebConfig(sdRoot: SdRoot, filename: string, data: unknown): Promise<void> {
  await writeTextFile(sdRoot, `${DIR}/${filename}`, JSON.stringify(data, null, 2));
}
