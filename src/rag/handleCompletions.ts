// rag/handleCompletions.ts
import { Request, Response } from 'express';
import { client } from './client.js';
import { COLLECTION_NAME, LITE_LLM_URL } from '../config/constants.js';
import { OllamaEmbeddingFunction } from '@chroma-core/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  [key: string]: any; // allow extra OpenWebUI fields (e.g. id, timestamp, etc.)
};

const PROMPT_TEMPLATE = `
You are a helpful assistant. Use the context below to answer the user's question clearly and concisely.

- Do not include citations, references, summaries, or formatting like headers or markdown.
- Do not mention where the information came from.
- Simply explain the answer based on the context, as if you're speaking directly to the user.

Context:
{context}

---

Conversation:
{chat_history}

User Question: {question}
`;

// Utility: Clean up raw Chroma content
function cleanContext(text: string): string {
  return text
    .replace(/[^\S\r\n]+/g, ' ') // collapse multiple spaces/tabs, preserve \n
    .replace(/\n{3,}/g, '\n\n') // reduce 3+ newlines to 2
    .replace(/[^\w\s.,!?'"():;/-]/g, '') // remove symbols, emojis, control chars
    .replace(/ {2,}/g, ' ') // collapse double spaces
    .trim();
}

function formatAndPruneMessages(rawMessages: any[], maxTurns?: number) {
  const formatted = rawMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  if (!maxTurns || maxTurns <= 0) {
    return formatted; // No pruning
  }

  return formatted.slice(-maxTurns * 2); // Keep last N turns (user+assistant pairs)
}

// Handler
export async function handleCompletions(req: Request, res: Response) {
  const authHeader = req.headers.authorization;

  const body = req.body;
  const messages: ChatMessage[] = body.messages ?? body.chat?.messages;
  const modelName = body.model ?? body.chat?.model ?? 'gpt-4.1-latest';
  const stream = body.stream ?? false;

  console.log('🧪 Using modelName:', modelName);

  if (!messages) {
    return res.status(400).json({ error: 'Missing messages in request body' });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMessage = userMessages.at(-1)?.content;
    if (!lastUserMessage) {
      return res.status(400).json({ error: 'No user message found' });
    }

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

    const rawChunks = searchResults.documents?.[0] ?? [];
    const context = rawChunks
      .filter((chunk): chunk is string => typeof chunk === 'string')
      .map(cleanContext)
      .join('\n\n---\n\n');

    const chatHistoryText = formatAndPruneMessages(messages)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const promptTemplate = ChatPromptTemplate.fromTemplate(PROMPT_TEMPLATE);
    const prompt = await promptTemplate.format({
      context,
      chat_history: chatHistoryText,
      question: lastUserMessage,
    });

    if (stream) {
      if (stream) {
        const payload = {
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
        };

        console.log('💬 Streaming to LiteLLM:', payload);

        const liteLLMStream = await fetch(`${LITE_LLM_URL}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader ?? '',
          },
          body: JSON.stringify(payload),
        });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        if (!liteLLMStream.body) {
          throw new Error('No stream body received from LiteLLM');
        }

        for await (const chunk of liteLLMStream.body) {
          res.write(chunk); // forward raw bytes
        }
        res.end();
      }
    } else {
      const model = new ChatOpenAI({
        modelName,
        streaming: false,
        apiKey: 'sk-fake-for-proxy',
        configuration: {
          baseURL: LITE_LLM_URL,
          defaultHeaders: {
            Authorization: authHeader ?? '',
          },
        },
      });

      const response = await model.invoke(prompt);
      res.status(200).json({ answer: response });
    }
  } catch (err: any) {
    console.error('[handleCompletions Error]', err);
    res.status(500).json({ error: err.message || 'Failed to complete chat' });
  }
}
