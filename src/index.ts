import express from 'express';
import dotenv from 'dotenv';
import { handleQuery } from './rag/query.js';
import { handleIngest } from './rag/ingest.js';
import { handleCompletions } from './rag/handleCompletions.js';
import { createLiteLLMProxy } from './utils/createLiteLLMProxy.js';

dotenv.config();

const app = express();

app.get('/metrics', createLiteLLMProxy('/metrics'));

app.use(express.json());

app.post('/chat/completions', handleCompletions);
app.post('/query', handleQuery);
app.post('/ingest', handleIngest);

app.use('/', createLiteLLMProxy('/'));

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`RAG API running on port ${PORT}`);
});
