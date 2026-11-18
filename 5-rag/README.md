# Project 5: A Simple RAG App (Node.js + Express + Gemini, free tier)

**RAG (Retrieval-Augmented Generation)** lets a language model answer questions about **your own documents**,
which it has never seen. Instead of retraining the model, we **retrieve** the relevant passages first
and put them in the prompt. The model then **generates** an answer from those passages only, and cites them.

Here the documents are the employee handbook of a fictional company, *Brightwave Inc.* (`docs/`).
The facts are made up on purpose (27 days of leave, €40 meal limit, ...): a correct answer can only come
from retrieval, not from what the model already knows.

Everything runs on the **Google Gemini API free tier**: one free key, no credit card.

## How it works (see `rag.js`)

```
INDEXING  (once: npm run ingest)
  docs/*.md ──► 1. CHUNK  one chunk per "## " section (26 chunks)
            ──► 2. EMBED  each chunk → a vector of 768 numbers (gemini-embedding-001, task RETRIEVAL_DOCUMENT)
            ──► index.json

ANSWERING  (every question)
  question  ──► 2. EMBED the question (same model, task RETRIEVAL_QUERY)
            ──► 3. SEARCH  cosine similarity with every chunk, keep the top 4
            ──► 4. GENERATE  send the 4 chunks + the question to gemini-3.5-flash-lite
            ──► answer with citations [1] [2] + the passages used
```

| Step | What happens | Why |
|------|--------------|-----|
| Chunk | Split documents into small, self-contained pieces | The prompt only gets the few pieces that matter, not the whole handbook |
| Embed | Turn text into a vector that captures its **meaning** | "vacation days" finds "paid annual leave" even with no shared word |
| Search | Compare the question vector with every chunk vector | Vectors are normalized, so the dot product = cosine similarity |
| Generate | The model answers **only** from the given passages and cites them | Grounded answers you can check; it says "not in the handbook" instead of guessing |

A real system would usually store the vectors in a vector database (pgvector, Qdrant, ...)
instead of a JSON file, but the idea is the same.

## Run

Get a free API key at <https://aistudio.google.com/apikey> (sign in with a Google account → *Create API key*).

```bash
cp .env.example .env    # then paste your GEMINI_API_KEY
npm install
npm run ingest          # build index.json (run again after editing docs/)
npm start               # http://localhost:3002
```

From the terminal:

```bash
npm run search -- "How many vacation days do I get?"   # retrieval only: shows which chunks match
npm run ask -- "How many vacation days do I get?"      # retrieval + Gemini answer
```

## Things to try

- *"Can I work from Spain for a month?"* → combines two passages (20 working days abroad + HR approval).
- *"When do I need to tell my boss I'm ill?"* → finds "Sick leave … tell your manager before 10:00", although it shares no key word with the question (boss/manager, ill/sick). That is what embeddings add over keyword search.
- *"Is there a gym membership benefit?"* → not in the handbook: the model should say so instead of inventing an answer.
- Add your own `.md` file in `docs/`, run `npm run ingest`, and ask about it.

## Files

```
rag.js              The 4 RAG steps: chunkMarkdown, embed, search, answer (Gemini calls)
ingest.js           Builds index.json from docs/
ask.js              Command-line version (npm run ask / npm run search)
server.js           Express server: serves the page and POST /api/ask
views/index.html    Question box, answer with citation badges, retrieved passages with scores
public/style.css    Styles (same look as projects 2 and 3)
docs/               The knowledge base (5 Markdown files)
```

## Notes on the free tier

- It has **rate limits** (requests per minute and per day). If you see "rate limit reached", wait a minute.
- On the free tier, **Google may use your prompts to improve its products**. That is fine for this fictional
  handbook, but don't put real company or personal data in `docs/` with a free key.
- To change models, edit `EMBEDDING_MODEL` / `CHAT_MODEL` at the top of `rag.js`. If you change the
  embedding model or its size, run `npm run ingest` again: vectors from different models can't be compared.
- Ideas to extend it: split long sections into overlapping pieces, add keyword search (BM25)
  next to vector search ("hybrid search"), or stream the answer word by word.
