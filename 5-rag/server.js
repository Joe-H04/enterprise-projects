// Project 5 — RAG web app. The RAG logic itself is in rag.js; this file only serves
// the page and exposes POST /api/ask.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiError } from '@google/genai';
import { answer, loadIndex } from './rag.js';

const { PORT = 3002, GEMINI_API_KEY } = process.env;
if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set. Copy .env.example to .env and paste your key.');
  process.exit(1);
}

try {
  const { chunks } = await loadIndex();
  console.log(`Loaded index.json (${chunks.length} chunks)`);
} catch {
  console.error('index.json not found. Run `npm run ingest` first.');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));

app.post('/api/ask', async (req, res) => {
  const question = String(req.body?.question ?? '').trim();
  if (!question) return res.status(400).json({ error: 'Please type a question.' });
  if (question.length > 500) return res.status(400).json({ error: 'Please keep your question under 500 characters.' });

  try {
    res.json(await answer(question));
  } catch (err) {
    console.error(err);
    if (err instanceof ApiError && err.status === 429) {
      return res.status(429).json({ error: 'Free-tier rate limit reached. Wait a minute and try again.' });
    }
    if (err instanceof ApiError && [400, 401, 403].includes(err.status)) {
      return res.status(500).json({ error: `Gemini rejected the request (${err.status}). Check GEMINI_API_KEY in .env and the server log.` });
    }
    if (err instanceof ApiError) {
      return res.status(502).json({ error: `Gemini API error (${err.status}). Try again.` });
    }
    res.status(500).json({ error: 'Something went wrong on the server.' });
  }
});

app.listen(PORT, () => console.log(`Handbook assistant on http://localhost:${PORT}`));
