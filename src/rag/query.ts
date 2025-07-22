import { Request, Response } from 'express';
import { client } from './client.js';
import { COLLECTION_NAME } from '../config/constants.js';
import { OllamaEmbeddingFunction } from '@chroma-core/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { LITE_LLM_URL } from '../config/constants.js';

// Clean up extra tokens from Chroma results
function cleanContext(text: string): string {
  return text
    .replace(/[^\S\r\n]+/g, ' ') // collapse multiple spaces/tabs, preserve \n
    .replace(/\n{3,}/g, '\n\n') // reduce 3+ newlines to 2
    .replace(/[^\w\s.,!?'"():;/-]/g, '') // remove symbols, emojis, control chars
    .replace(/ {2,}/g, ' ') // collapse double spaces
    .trim();
}

// Format/prune chat history from OpenWebUI
function formatAndPruneMessages(rawMessages: any[], maxTurns?: number) {
  const formatted = rawMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  if (!maxTurns || maxTurns <= 0) {
    return formatted;
  }

  return formatted.slice(-maxTurns * 2);
}

const PROMPT_TEMPLATE = `
You are a helpful assistant. Use the context below to answer the user's question.

Context:
{context}

---

Conversation:
{chat_history}

User Question: {question}
`;

export async function handleQuery(req: Request, res: Response) {
  const { chat, apiKey, maxTurns } = req.body;
  // maxTurns = 12; // overwrite for maxTurns

  // CHECK API KEY
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    return res.status(400).json({ error: 'Missing or invalid apiKey' });
  }

  if (!chat || !chat.messages || !apiKey) {
    return res.status(400).json({ error: 'Missing chat or apiKey in request body' });
  }

  try {
    const userMessages = chat.messages.filter((msg: any) => msg.role === 'user');
    const lastUserMessage = userMessages.at(-1)?.content;

    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found' });
    }

    const chatHistory = formatAndPruneMessages(chat.messages, maxTurns);

    // 1. Semantic search in ChromaDB
    const embedder = new OllamaEmbeddingFunction({
      url: 'http://host.docker.internal:11434/',
      model: 'nomic-embed-text',
    });

    const collection = await client.getCollection({
      name: COLLECTION_NAME,
      embeddingFunction: embedder,
    });

    const searchResults = await collection.query({
      queryTexts: [lastUserMessage],
      nResults: 5,
    });

    // 2. Clean retrieved context
    const rawChunks = searchResults.documents?.[0] ?? [];
    const context = rawChunks
      .filter((chunk): chunk is string => typeof chunk === 'string') // remove nulls
      .map(cleanContext)
      .join('\n\n---\n\n');

    // 3. Format prompt
    const chatHistoryText = chatHistory.map((m) => `${m.role}: ${m.content}`).join('\n');

    const promptTemplate = ChatPromptTemplate.fromTemplate(PROMPT_TEMPLATE);
    const prompt = await promptTemplate.format({
      context,
      chat_history: chatHistoryText,
      question: lastUserMessage,
    });

    // 4. Call GPT via LiteLLM
    const model = new ChatOpenAI({
      modelName: 'gpt-4.1-latest',
      apiKey: apiKey,
      configuration: {
        baseURL: LITE_LLM_URL,
      },
    });

    const response = await model.invoke(prompt);

    // 5. Return response
    const sources = searchResults.metadatas?.[0]?.map((m) => m?.id ?? 'unknown') ?? [];

    res.json({
      answer: response,
      sources,
    });
  } catch (err: any) {
    console.error('[RAG Query Error]', err);
    res.status(500).json({ error: err.message || 'RAG query failed' });
  }
}
