// Step 1 + 2: read docs/*.md, cut them into chunks, embed every chunk, save index.json.
// Run it again whenever you change a file in docs/.
import { buildIndex } from './rag.js';

console.log('Indexing docs/ with Gemini embeddings...');
const { files, chunks, dimensions } = await buildIndex();
console.log(`Done: ${files} documents → ${chunks} chunks → vectors of ${dimensions} numbers, saved in index.json`);
