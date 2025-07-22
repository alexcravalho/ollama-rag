import path from 'path';
export const CHROMA_PATH = 'chroma';
export const COLLECTION_NAME = 'local-rag';
export const CHROMA_URL = 'http://chromadb:8000';
export const DATA_PATH = path.resolve('/app/data');
export const LITE_LLM_URL = process.env.LITE_LLM_URL || 'http://litellm-litellm-1:4000';
