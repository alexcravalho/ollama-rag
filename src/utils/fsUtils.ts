import fs from 'fs';
import path from 'path';

export function clearDatabase() {
  const resolvedPath = path.resolve(process.cwd(), 'chroma');
  if (fs.existsSync(resolvedPath)) {
    try {
      fs.rmSync(resolvedPath, { recursive: true, force: true });
      console.log(`ChromaDB directory removed: ${resolvedPath}`);
    } catch (err) {
      console.error(`Failed to delete ${resolvedPath}:`, err);
    }
  } else {
    console.log(`ChromaDB directory not found: ${resolvedPath}`);
  }
}
