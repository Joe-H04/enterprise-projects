// Project 5 — RAG (Retrieval-Augmented Generation), all the logic in one file.
//
//   INDEXING (once, `npm run ingest`)            ANSWERING (every question)
//   docs/*.md ─► 1. chunk ─► 2. embed ─► index.json
//                                            question ─► 2. embed ─► 3. search index.json
//                                                     ─► 4. send the best chunks + question to Gemini
//
// Both the embeddings (step 2) and the answer (step 4) use the Google Gemini API,
// free tier: one free API key from https://aistudio.google.com/apikey is enough.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const here = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(here, 'docs');
const INDEX_FILE = path.join(here, 'index.json');

const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_SIZE = 768;              // 768 numbers per vector (the model can go up to 3072)
const CHAT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'; // override in .env to try another model
const TOP_K = 4;                         // how many chunks we give to the model

let ai;
function gemini() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Copy .env.example to .env and paste your key.');
  }
  ai ??= new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    // Free-tier models are sometimes "experiencing high demand" (HTTP 503).
    // Retry those server errors a few times: after ~2 s, ~4 s, then ~8 s.
    // 429 (quota used up) is not retried: retrying would only use more quota.
    httpOptions: { retryOptions: { attempts: 4, initialDelay: 2, maxDelay: 10, httpStatusCodes: [500, 502, 503, 504] } },
  });
  return ai;
}

// ---------- 1. CHUNK ----------
// Split each Markdown file into one chunk per "## " section. Our sections are short,
// so this is enough. For long documents you would also split big sections into
// pieces of a few hundred words, with some overlap between pieces.
export function chunkMarkdown(source, markdown) {
  const lines = markdown.split('\n');
  const title = (lines.find((l) => l.startsWith('# ')) ?? `# ${source}`).slice(2).trim();
  const chunks = [];
  let heading = null;
  let body = [];

  const flush = () => {
    const text = body.join('\n').trim();
    if (heading && text) chunks.push({ id: `${source}#${chunks.length + 1}`, source, title, heading, text });
    body = [];
  };
  for (const line of lines) {
    if (line.startsWith('## ')) { flush(); heading = line.slice(3).trim(); }
    else if (!line.startsWith('# ')) body.push(line);
  }
  flush();
  return chunks;
}

// ---------- 2. EMBED ----------
// Turns texts into vectors. Texts with similar MEANING get vectors that point in a
// similar direction, even when they use different words ("vacation days" ≈ "paid annual leave").
//
// taskType tells the model how the text will be used: RETRIEVAL_DOCUMENT for the chunks
// we store, RETRIEVAL_QUERY for the user's question. This improves the matches.
export async function embed(texts, taskType) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += 100) { // the API takes at most 100 texts per call
    const response = await gemini().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts.slice(i, i + 100),
      config: { taskType, outputDimensionality: EMBEDDING_SIZE },
    });
    vectors.push(...response.embeddings.map((e) => normalize(e.values)));
  }
  return vectors;
}

// Scale a vector to length 1. Gemini only does this itself for the full 3072 size.
function normalize(v) {
  const length = Math.hypot(...v);
  return v.map((x) => x / length);
}

// The heading and the document title are added to the text we embed, so a chunk
// like "27 days per year" still knows it is about "Leave and Holidays".
const textToEmbed = (c) => `${c.title} — ${c.heading}\n${c.text}`;

export async function buildIndex() {
  const files = (await fs.readdir(DOCS_DIR)).filter((f) => f.endsWith('.md')).sort();
  const chunks = [];
  for (const file of files) {
    chunks.push(...chunkMarkdown(file, await fs.readFile(path.join(DOCS_DIR, file), 'utf8')));
  }
  const vectors = await embed(chunks.map(textToEmbed), 'RETRIEVAL_DOCUMENT');
  chunks.forEach((c, i) => { c.vector = vectors[i]; });

  await fs.writeFile(INDEX_FILE, JSON.stringify({ model: EMBEDDING_MODEL, chunks }));
  return { files: files.length, chunks: chunks.length, dimensions: vectors[0]?.length ?? 0 };
}

// ---------- 3. SEARCH ----------
let index;
export async function loadIndex() {
  index ??= JSON.parse(await fs.readFile(INDEX_FILE, 'utf8'));
  return index;
}

// The vectors are normalized (length 1), so the dot product IS the cosine similarity:
// 1 = same meaning, 0 = unrelated.
const dot = (a, b) => a.reduce((sum, x, i) => sum + x * b[i], 0);

export async function search(question, k = TOP_K) {
  const { chunks } = await loadIndex();
  const [q] = await embed([question], 'RETRIEVAL_QUERY');
  return chunks
    .map(({ vector, ...chunk }) => ({ ...chunk, score: Number(dot(q, vector).toFixed(3)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

// ---------- 4. GENERATE ----------
const SYSTEM_PROMPT = `You are the Brightwave handbook assistant. You answer employees' questions using ONLY the handbook excerpts inside <sources>.
- After each fact, cite the source it comes from with its number in square brackets, like [2].
- If the excerpts do not contain the answer, say that you could not find it in the handbook and suggest who to ask (HR or the IT helpdesk). Do not guess and do not use outside knowledge.
- Be short: a few sentences or a short list. Write plain text, without Markdown formatting.`;

export async function answer(question) {
  const sources = await search(question);

  const context = sources
    .map((s, i) => `<source id="${i + 1}" document="${s.title}" section="${s.heading}">\n${s.text}\n</source>`)
    .join('\n');

  const response = await gemini().models.generateContent({
    model: CHAT_MODEL,
    contents: `<sources>\n${context}\n</sources>\n\nQuestion: ${question}`,
    config: { systemInstruction: SYSTEM_PROMPT },
  });

  // response.text is empty when Gemini blocks the question or the answer (safety filters).
  const text = response.text?.trim();
  return { answer: text || 'Sorry, I cannot answer that question.', sources, usage: response.usageMetadata };
}
