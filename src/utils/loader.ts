import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { Document } from '@langchain/core/documents';
import { DATA_PATH } from '../config/constants.js';

export async function loadPdf(): Promise<Document[]> {
  const allFiles = fs.readdirSync(DATA_PATH);
  const pdfFiles = allFiles.filter((file) => file.endsWith('.pdf'));

  const docs: Document[] = [];

  for (let i = 0; i < pdfFiles.length; i++) {
    const file = pdfFiles[i];
    const filePath = path.join(DATA_PATH, file);
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);

    docs.push(
      new Document({
        pageContent: data.text,
        metadata: { source: filePath, page: 0 },
      })
    );
  }
  console.log(`Found ${pdfFiles.length} PDF(s):`, pdfFiles);
  return docs;
}
