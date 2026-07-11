// src/ChatWidget.jsx
// Pure client-side widget. Drop <ChatWidget /> anywhere in your React 19 app.
// It only ever talks to /api/chat — no keys, no secrets in the browser.
import { useState, useRef, useEffect } from 'react';
import './ChatWidget.css';
import launcherKid from './thinkquip-assistant-launcher.png';
import peekKid from './thinkquip-assistant-peek.png';
import { THINKQUIP_LOGO_WHITE } from './data/machinesConfig';

/**
 * In the browser/dev this is the relative route (Vite middleware in dev, the
 * serverless function api/chat.js when hosted).
 *
 * The PACKAGED DESKTOP APP has no server of its own, so a relative path would
 * resolve to tauri://localhost/api/chat and 404. Set VITE_CHAT_API_URL to the
 * DEPLOYED absolute endpoint (e.g. https://<host>/api/chat) before building the
 * desktop app. The API keys stay on that host — they are never shipped in the
 * desktop binary.
 */
const ENDPOINT = import.meta.env.VITE_CHAT_API_URL?.trim() || '/api/chat';

// Conversation survives page reloads within the tab; a closed tab starts fresh
// (sessionStorage, deliberately not localStorage — this runs on shared sales machines).
const STORAGE_KEY = 'tq-chat-messages-v1';

const GREETING = {
  role: 'assistant',
  content: 'Ask me anything about the loader range, how the ThinkQuip TCO Calculator works, or what the figures on this page mean.',
};

function restoreMessages() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {
    // corrupt/absent — start fresh
  }
  return [GREETING];
}

// `pageContext` is the live snapshot of the page the user is viewing (active
// tab + inputs + computed results, built by src/lib/chatPageContext.js). It is
// read fresh at send time, so each question carries what's on screen NOW.
export default function ChatWidget({ pageContext }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState(restoreMessages);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // storage full/blocked — memory-only is fine
    }
  }, [messages]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Keep the message list scrolled to the newest message
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setBusy(true);

    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          // Only the recent turns — the server reads at most the last few, so
          // don't let a long session grow the payload without bound.
          history: nextMessages.slice(0, -1).slice(-12).map(({ role, content }) => ({ role, content })),
          pageContext,
        }),
      });
      if (!res.ok) throw new Error('server');
      const data = await res.json();
      setMessages((m) => [...m, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      // Distinguish "the server answered with an error" (a hiccup answering —
      // retrying usually works) from "the request never got through" (network).
      const friendly =
        err?.message === 'server'
          ? 'Something went wrong answering that one — please try again. If it keeps happening, give ThinkQuip a shout directly.'
          : "I couldn't reach the server just now. Please check your connection and try again.";
      setMessages((m) => [...m, { role: 'assistant', content: friendly }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="tq-chat no-print">
      {open && (
        <div className="tq-chat__panel" role="dialog" aria-label="Mr Freig">
          <header className="tq-chat__header">
            <img className="tq-chat__logo" src={THINKQUIP_LOGO_WHITE} alt="ThinkQuip" />
            <span className="tq-chat__title">Mr Freig</span>
            <button
              className="tq-chat__close"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
            >
              ×
            </button>
          </header>

          <div className="tq-chat__messages" ref={listRef} aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`tq-chat__msg tq-chat__msg--${m.role}`}>
                {m.role === 'assistant' && (
                  <span className="tq-chat__avatar-name">Mr Freig</span>
                )}
                <div className="tq-chat__bubble">{m.content}</div>
              </div>
            ))}
            {busy && (
              <div className="tq-chat__msg tq-chat__msg--assistant">
                <span className="tq-chat__avatar-name">Mr Freig</span>
                <div className="tq-chat__bubble tq-chat__bubble--typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          <div className="tq-chat__inputRow">
            <textarea
              ref={inputRef}
              className="tq-chat__input"
              rows={1}
              maxLength={4000}
              placeholder="Ask a question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              className="tq-chat__send"
              onClick={send}
              disabled={busy || !input.trim()}
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </div>
      )}

      <button
        className={`tq-chat__launcher ${open ? 'tq-chat__launcher--open' : 'tq-chat__launcher--closed'}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close ThinkQuip Assistant' : 'Open ThinkQuip Assistant'}
      >
        {open ? (
          <img className="tq-chat__launcherFull" src={launcherKid} alt="ThinkQuip assistant character" />
        ) : (
          <>
            <img className="tq-chat__launcherPeek" src={peekKid} alt="" aria-hidden="true" />
            <span className="tq-chat__launcherLabel">Question?</span>
          </>
        )}
      </button>
    </div>
  );
}
