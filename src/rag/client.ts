import { ChromaClient } from 'chromadb';

export const client = new ChromaClient({
  ssl: false,
  host: 'chromadb',
  port: 8000,
});
