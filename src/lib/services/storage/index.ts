import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface StoredAudioFile {
  storageKey: string;
  filePath: string;
  publicPath: string;
}

export interface AudioStorage {
  save(entryId: string, file: File): Promise<StoredAudioFile>;
}

class LocalAudioStorage implements AudioStorage {
  async save(entryId: string, file: File): Promise<StoredAudioFile> {
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "audio");
    await mkdir(uploadsDir, { recursive: true });

    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".webm";
    const filename = `${entryId}-${Date.now()}${extension}`;
    const absolutePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(absolutePath, buffer);

    return {
      storageKey: filename,
      filePath: absolutePath,
      publicPath: `/uploads/audio/${filename}`,
    };
  }
}

export const audioStorage: AudioStorage = new LocalAudioStorage();

