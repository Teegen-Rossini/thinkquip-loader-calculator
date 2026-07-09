import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev-only /api/chat endpoint so the ChatWidget works under `npm run dev`.
 * Reuses the exact same RAG core the deployed Vercel function uses
 * (api/_lib/rag.js); keys come from .env via dotenv. Production builds are
 * untouched — on the host, api/chat.js serves the route.
 */
function chatApiDev() {
  return {
    name: 'thinkquip-chat-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/chat', (req, res) => {
        (async () => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Method not allowed' }))
            return
          }
          await import('dotenv/config') // load .env into process.env (once)
          // Node caches dynamic imports, which would pin the FIRST version of
          // rag.js for the dev server's whole lifetime — edits would silently
          // not apply until a restart. Keying the URL on the file's mtime
          // re-imports only when the file actually changes.
          const ragPath = path.resolve('api/_lib/rag.js')
          const ragUrl = `${pathToFileURL(ragPath).href}?v=${fs.statSync(ragPath).mtimeMs}`
          const { answerQuestion } = await import(ragUrl)

          const chunks = []
          for await (const c of req) chunks.push(c)
          const { message, history = [], pageContext = '' } = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
          if (!message || typeof message !== 'string') {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'Missing "message" string.' }))
            return
          }
          const { answer, sources } = await answerQuestion({ message, history, pageContext })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ answer, sources }))
        })().catch((err) => {
          console.error('[chat-api-dev]', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: 'Something went wrong answering that. Please try again.' }))
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), chatApiDev()],
})
