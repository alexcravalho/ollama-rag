import { Request, Response } from 'express';
import { loadPdf } from '../utils/loader.js';
import { splitDocuments } from '../utils/splitter.js';
import { addToChroma } from './addToChroma.js';

export async function handleIngest(req: Request, res: Response) {
  try {
    console.log('Starting ingestion process...');

    const docs = await loadPdf();
    console.log(`Loaded ${docs.length} documents`);

    const chunks = await splitDocuments(docs);
    console.log(`Split into ${chunks.length} chunks`);

    await addToChroma(chunks);
    console.log('Chunks added to ChromaDB');

    res.json({ success: true, message: 'Ingestion complete' });
  } catch (err: any) {
    console.error('Ingestion error:', err);
    res.status(500).json({ error: 'Ingestion failed', details: err.message });
  }
}
