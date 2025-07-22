import * as crypto from 'crypto';
import { Collection } from 'chromadb';
import { OllamaEmbeddingFunction } from '@chroma-core/ollama';
import { Document } from '@langchain/core/documents';
import { COLLECTION_NAME } from '../config/constants.js';
import { client } from './client.js';
import { calculateChunkIds } from '../utils/chunkUtils.js';

export async function addToChroma(chunks: Document[]) {
  // Create embedding function using Ollama
  const embedder = new OllamaEmbeddingFunction({
    url: 'http://host.docker.internal:11434/',
    model: 'nomic-embed-text',
  });

  // Create or reuse collection
  let collection: Collection;
  try {
    collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embedder,
    });
    console.log(`✅ Collection ready: ${COLLECTION_NAME}`);
  } catch (err) {
    console.error('❌ Failed to create/get Chroma collection:', err);
    throw err;
  }

  // Prepare documents
  const chunksWithIds = calculateChunkIds(chunks);
  const ids = chunksWithIds.map((chunk) => chunk.metadata.id || crypto.randomUUID());
  const documents = chunksWithIds.map((chunk) => chunk.pageContent);
  const metadatas = chunksWithIds.map((chunk) => chunk.metadata);

  // Add to vector store
  console.log(`📥 Ingesting ${documents.length} chunks...`);
  await collection.add({
    ids,
    documents,
    metadatas,
  });
  console.log('✅ Chunks added to Chroma collection');
}
