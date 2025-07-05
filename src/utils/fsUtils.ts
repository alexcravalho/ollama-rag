import fs from 'fs';

export function clearDatabase(chromaPath: string) {
  if (fs.existsSync(chromaPath)) {
    fs.rmSync(chromaPath, { recursive: true });
  }
}
