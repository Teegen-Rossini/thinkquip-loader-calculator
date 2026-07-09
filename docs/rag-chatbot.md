# ThinkQuip RAG chatbot

A lightweight retrieval-augmented chatbot for a static React 19 + Vite site.
Your site stays static — only the `/api/chat` call goes through a small serverless
function that keeps your API keys off the client.

## How it works

```
content/*.md ──► ingest.mjs ──► OpenAI embeddings ──► Pinecone (vector store)
                 (build time, on your machine or CI)

browser  ──►  <ChatWidget/>  ──►  POST /api/chat  ──►  embed question
                                   (serverless fn)  ──►  query Pinecone (top 5 chunks)
                                                    ──►  OpenAI answers from those chunks
                                                    ──►  { answer, sources }  ──► widget
```

Two things run server-side, both only because API keys must never sit in browser JS:
- **ingest.mjs** — a build step you run yourself. Keys live in your local `.env`.
- **api/chat.js** — one serverless function. Keys live in your host's env settings.

Everything else stays exactly as it is today: static HTML/JS/CSS you can host anywhere
that also supports functions (Vercel, Netlify, Cloudflare Pages — all free tiers).

## Setup

### 1. Create a Pinecone index
In the Pinecone console, create a **serverless** index:
- **Dimensions:** `1536` (matches `text-embedding-3-small`)
- **Metric:** `cosine`
- Name it whatever you set as `PINECONE_INDEX` (e.g. `thinkquip-content`)

### 2. Add your content
Put `.md`/`.txt` files in `content/` — one per loader model, plus how the calculator
works, FAQs, contact info, etc. See `content/example.md` for ideas.

### 3. Set env vars and ingest
```bash
cp .env.example .env      # fill in your OpenAI + Pinecone keys
npm install
npm run ingest            # chunks, embeds, and uploads your content
```
Re-run `npm run ingest` whenever your content changes.

### 4. Deploy the function
Set `OPENAI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`, and `ALLOWED_ORIGINS`
in your host's environment settings, then deploy.

- **Vercel** — `api/chat.js` works as-is; it's served at `/api/chat`.
- **Netlify** — move the logic into `netlify/functions/chat.js`, export
  `export async function handler(event)`, read the body with `JSON.parse(event.body)`,
  and return `{ statusCode, body: JSON.stringify(...) }`. Add a redirect from
  `/api/chat` to `/.netlify/functions/chat` in `netlify.toml`.
- **Cloudflare Pages** — put it in `functions/api/chat.js` as
  `export async function onRequestPost({ request, env })` and read keys from `env`.

### 5. Add the widget to your app
Copy `src/ChatWidget.jsx` and `src/ChatWidget.css` into your Vite project, then render
it once (e.g. in `App.jsx`):
```jsx
import ChatWidget from './ChatWidget';

// ...somewhere in your top-level component
<ChatWidget />
```
It floats bottom-right and only calls `/api/chat`, so no keys touch the browser.

## Costs (rough, verify current rates)
- Embeddings (`text-embedding-3-small`) are very cheap — cents for a small site's content.
- Each question = 1 small embedding + 1 chat completion. With `gpt-4o-mini` this is a
  fraction of a cent per question; a bigger model costs more.
- Pinecone serverless has a free tier that comfortably covers a small knowledge base.

## Sensible upgrades later
- **Streaming replies** — switch the completion to `stream: true` and stream tokens to
  the widget for a snappier feel.
- **Rate limiting** — add per-IP limits to `/api/chat` (e.g. Upstash Redis) to prevent abuse.
- **Auto re-ingest** — run `npm run ingest` in CI whenever `content/` changes.
- **Smaller corpus?** For a very small knowledge base you can skip Pinecone entirely and
  do the similarity search in-memory inside the function — one less service to run.

## A note on model names
`api/chat.js` defaults to `gpt-4o-mini`. Newer OpenAI models may be available now —
check OpenAI's current model list and update the `CHAT_MODEL` constant to your preference.
