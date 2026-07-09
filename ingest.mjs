// ingest.mjs
// One-off / re-runnable build step. Reads text from ./content, splits it into
// chunks, embeds each chunk with OpenAI, and upserts the vectors into Pinecone.
//
// Runs on YOUR machine or in CI — never in the browser. Keys come from env vars.
//
//   npm run ingest
//
import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const CONTENT_DIR = './content';
const EMBED_MODEL = 'text-embedding-3-small'; // 1536 dims — your Pinecone index dim must match
const CHUNK_SIZE = 1000;   // characters per chunk
const CHUNK_OVERLAP = 150; // characters shared between neighbouring chunks
const BATCH = 100;         // chunks per embeddings call / Pinecone upsert

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
// PINECONE_INDEX may be the index NAME (e.g. "thinkquip") or the index HOST URL
// (e.g. "https://thinkquip-xxxx.svc.....pinecone.io"). Targeting by host skips
// the control-plane describeIndex lookup entirely.
const target = (process.env.PINECONE_INDEX ?? '').trim();
const index = target.includes('.svc.')
  ? pc.index({ host: target })
  : pc.index({ name: target });

function chunkText(text) {
  const clean = text.replace(/\r\n/g, '\n').trim();
  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function readContentFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...(await readContentFiles(full)));
    } else if (/\.(md|markdown|txt)$/i.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

async function embedBatch(texts) {
  const res = await openai.embeddings.create({ model: EMBED_MODEL, input: texts });
  return res.data.map((d) => d.embedding);
}

async function main() {
  const files = await readContentFiles(CONTENT_DIR);
  if (files.length === 0) {
    console.error(`No .md/.txt files found in ${CONTENT_DIR}. Add your content there first.`);
    process.exit(1);
  }

  // Flatten every file into {id, text, metadata} chunks
  const records = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const source = path.relative(CONTENT_DIR, file);
    chunkText(raw).forEach((chunk, i) => {
      records.push({
        id: `${source}#${i}`,
        text: chunk,
        // We stash the raw text in metadata so the query function can read it back
        metadata: { source, chunk: i, text: chunk },
      });
    });
  }
  console.log(`Prepared ${records.length} chunks from ${files.length} file(s).`);

  // Embed + upsert in batches
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    const vectors = await embedBatch(slice.map((r) => r.text));
    const upserts = slice.map((r, j) => ({ id: r.id, values: vectors[j], metadata: r.metadata }));
    // Pinecone SDK v6+ takes { records }, not a bare array
    await index.upsert({ records: upserts });
    console.log(`Upserted ${Math.min(i + BATCH, records.length)}/${records.length}`);
  }
  console.log('Done. Your Pinecone index is ready to answer questions.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
