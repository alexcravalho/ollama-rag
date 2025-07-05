import { ChromaClient } from 'chromadb';

export const client = new ChromaClient({
  ssl: false,
  host: 'localhost',
  port: 8000,
});
