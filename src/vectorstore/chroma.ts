import * as crypto from 'crypto';
// import { ChromaClient } from 'chromadb';
import { OllamaEmbeddingFunction } from '@chroma-core/ollama';
import { COLLECTION_NAME } from '../config/constants.js';
import { Document } from '@langchain/core/documents';
import { calculateChunkIds } from '../utils/chunkUtils.js';
import { client } from './client.js';
import { Collection } from 'chromadb';

export async function addToChroma(chunks: Document[]) {
  //   const client = new ChromaClient({ path: CHROMA_URL });

  const embedder = new OllamaEmbeddingFunction({
    url: 'http://127.0.0.1:11434/',
    model: 'nomic-embed-text', // make sure this is pulled with `ollama pull`
  });

  let collection: Collection;

  try {
    // TODO: replace with getOrCreateCollection ?
    collection = await client.getCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embedder,
    });
    console.log('📁 Existing collection found. Reusing...');
  } catch (err) {
    console.log('📁 Creating new Chroma collection...');
    collection = await client.createCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embedder,
    });
  }
  const chunksWithIds = calculateChunkIds(chunks);
  const ids = chunksWithIds.map((chunk) => chunk.metadata.id || crypto.randomUUID());
  const documents = chunksWithIds.map((chunk) => chunk.pageContent);
  const metadatas = chunksWithIds.map((chunk) => chunk.metadata);

  console.log(`👉 Adding ${documents.length} documents`);

  await collection.add({
    ids,
    documents,
    metadatas,
  });
}
