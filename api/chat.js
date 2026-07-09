// api/chat.js — Vercel serverless function (Node runtime).
//
// This is the ONLY place your API keys live. The browser POSTs { message, history }
// here; the RAG core (api/_lib/rag.js — shared with the Vite dev middleware)
// embeds the question, retrieves matching content from Pinecone, asks OpenAI to
// answer using only that content, and returns { answer, sources }.
//
// Netlify / Cloudflare equivalents are in the README.

import { answerQuestion } from './_lib/rag.js';

// Only let your own site call this endpoint (set ALLOWED_ORIGINS in env)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export default async function handler(req, res) {
  // --- CORS / origin check ---
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.length && origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { message, history = [], pageContext = '' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Missing "message" string.' });
    }
    const { answer, sources } = await answerQuestion({ message, history, pageContext });
    return res.status(200).json({ answer, sources });
  } catch (err) {
    console.error('chat error', err);
    return res.status(500).json({ error: 'Something went wrong answering that. Please try again.' });
  }
}
