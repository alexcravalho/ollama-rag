import { Document } from '@langchain/core/documents';

function sanitizeMetadata(metadata: any): Record<string, string | number | boolean | null> {
  const clean: Record<string, string | number | boolean | null> = {};
  for (const key in metadata) {
    const value = metadata[key];
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      clean[key] = value;
    }
  }
  return clean;
}

export function calculateChunkIds(chunks: Document[]): Document[] {
  let lastPageId = '';
  let currentChunkIndex = 0;

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    let source = 'unknown';
    let page = 0;

    if (chunk.metadata) {
      if (typeof chunk.metadata.source === 'string') {
        source = chunk.metadata.source;
      }

      if (typeof chunk.metadata.page === 'number') {
        page = chunk.metadata.page;
      }
    }

    const pageId = `${source}:${page}`;

    if (pageId === lastPageId) {
      currentChunkIndex += 1;
    } else {
      currentChunkIndex = 0;
      lastPageId = pageId;
    }

    const chunkId = `${pageId}:${currentChunkIndex}`;

    const cleanMeta = sanitizeMetadata(chunk.metadata || {});
    chunk.metadata = {
      ...cleanMeta,
      id: chunkId,
    };
  }
  return chunks;
}
