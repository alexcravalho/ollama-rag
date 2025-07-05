import { Command } from 'commander';
import { loadPdf } from '../utils/loader.js';
import { splitDocuments } from '../utils/splitter.js';
// import { clearDatabase } from '../utils/fsUtils.js';
import { client } from '../vectorstore/client.js';
import { addToChroma } from '../vectorstore/chroma.js';
import { COLLECTION_NAME } from '../config/constants.js';

const program = new Command();
program.option('--reset', 'Reset the database');
program.parse(process.argv);
const options = program.opts();

async function main() {
  const documents = await loadPdf();
  console.log(`Loaded ${documents.length} documents`);
  const chunks = await splitDocuments(documents);
  await addToChroma(chunks);
}

async function runIngestPipeline() {
  try {
    if (options.reset) {
      console.log('Resetting DB completely');
      await client.reset();
      console.log(`ChromaDB completely reset`);
    }
    if (options.delete) {
      console.log('Deleting DB collection');
      await client.deleteCollection({
        name: COLLECTION_NAME,
      });
      console.log(`Collection ${COLLECTION_NAME} deleted`);
    }
    await main();
    console.log('Ingestion Complete');
  } catch (err) {
    console.error('Ingestion failed:', err);
    process.exit(1);
  }
}
// await runIngestPipeline with IFFE to ensure compat
(async () => {
  await runIngestPipeline();
})();
