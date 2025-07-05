import { Command } from 'commander';
import { loadPdf } from '../utils/loader.js';
import { splitDocuments } from '../utils/splitter.js';
import { clearDatabase } from '../utils/fsUtils.js';
import { addToChroma } from '../vectorstore/chroma.js';
import { CHROMA_PATH } from '../config/constants.js';

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
      console.log('Clearing the Database');
      clearDatabase(CHROMA_PATH);
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
