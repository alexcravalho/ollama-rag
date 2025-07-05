import { Command } from 'commander';
// import { ChromaClient } from 'chromadb';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { Ollama } from '@langchain/ollama';
import { OllamaEmbeddingFunction } from '@chroma-core/ollama';
import { COLLECTION_NAME, CHROMA_URL } from '../config/constants.js';
import { client } from '../vectorstore/client.js';

const PROMPT_TEMPLATE = `
Answer the question based only on the following context:

{context}

---

Answer the question based on the above context: {question}
`;

async function main() {
  const program = new Command();
  program.argument('<query>', 'Query string to ask the local RAG system');
  program.parse(process.argv);
  const [queryText] = program.args;
  if (!queryText) {
    console.error('Please provide a query string.');
    process.exit(1);
  }
  console.log(`Query: "${queryText}"`);

  // const client = new ChromaClient({ path: CHROMA_URL });

  const embedder = new OllamaEmbeddingFunction({
    url: 'http://127.0.0.1:11434/',
    model: 'nomic-embed-text',
  });

  const collection = await client.getCollection({
    name: COLLECTION_NAME,
    embeddingFunction: embedder,
  });

  const results = await collection.query({
    queryTexts: [queryText],
    nResults: 5,
  });

  if (!results.documents?.length || results.documents[0].length === 0) {
    console.log('No relevant documents found.');
    return;
  }

  const contextText = results.documents[0].join('\n\n---\n\n');

  const promptTemplate = ChatPromptTemplate.fromTemplate(PROMPT_TEMPLATE);
  const prompt = await promptTemplate.format({
    context: contextText,
    question: queryText,
  });

  const model = new Ollama({ model: 'mistral' });
  const response = await model.invoke(prompt);

  console.log('\nResponse:\n', response);

  let sources = 'No metadata found';

  if (results.metadatas?.[0]) {
    const ids = results.metadatas[0].map((meta: any) => meta?.id ?? 'unknown');
    sources = ids.join('\n');
  }
  console.log('\nSources:\n', sources);
}

main().catch((err) => {
  console.error('Query failed:', err);
  process.exit(1);
});
