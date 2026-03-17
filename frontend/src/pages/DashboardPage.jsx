import React, { useState, useEffect, useRef, useCallback } from 'react';
import useAuthStore from '@/store/authStore';
import api from '@/services/api';

const FONT = 'Arial, sans-serif';
const NAVY = '#003264';
const GREY = '#8A9BB0';
const CARD = { background: '#F5F7FA', padding: 20, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const CARD_HEADER = { fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: NAVY, marginBottom: 14, fontFamily: FONT };

function useQuote() {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `daily_quote_${today}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try { setQuote(JSON.parse(cached)); return; } catch {}
    }

    api.get('/dashboard/quote')
      .then(({ data }) => {
        if (data && data.quote) {
          const q = { text: data.quote, author: data.author };
          localStorage.setItem(cacheKey, JSON.stringify(q));
          setQuote(q);
        }
      })
      .catch(() => {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('daily_quote_') && key !== cacheKey) {
            try { setQuote(JSON.parse(localStorage.getItem(key))); return; } catch {}
          }
        }
      });
  }, []);

  return quote;
}

function MeetingsCard() {
  const [meetings, setMeetings] = useState(null);
  const [error, setError] = useState(false);
  const [msToken, setMsToken] = useState(() => localStorage.getItem('ms_access_token'));

  // On mount: capture ms_token from URL if present, save to localStorage, clean URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('ms_token');
    if (tokenFromUrl) {
      localStorage.setItem('ms_access_token', tokenFromUrl);
      setMsToken(tokenFromUrl);
      params.delete('ms_token');
      const cleanUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Fetch meetings from backend proxy when token is available
  useEffect(() => {
    if (!msToken) return;
    api.get('/dashboard/meetings', {
      headers: { Authorization: `Bearer ${msToken}` },
    })
      .then(({ data }) => setMeetings(data))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('ms_access_token');
          setMsToken(null);
        }
        setError(true);
      });
  }, [msToken]);

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>Your Meetings</div>
      {!msToken ? (
        <button
          onClick={() => { window.location.href = '/api/auth/outlook'; }}
          title="Connect your Outlook calendar"
          style={{ padding: '10px 20px', background: NAVY, color: 'white', border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
        >
          Connect Outlook Calendar
        </button>
      ) : error ? (
        <div style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>Could Not Load Meetings</div>
      ) : meetings === null ? (
        <div style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>Loading...</div>
      ) : meetings.length === 0 ? (
        <div style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>No Meetings Today</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {meetings.map((m, i) => {
            const time = m.start ? new Date(m.start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontFamily: FONT }}>
                <span style={{ fontWeight: 700, color: NAVY, minWidth: 50 }}>{time}</span>
                <span style={{ color: '#333' }}>{m.title}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TodoCard() {
  const { user } = useAuthStore();
  const storageKey = `todos_${user?.id}`;
  const [todos, setTodos] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || []; } catch { return []; }
  });
  const [input, setInput] = useState('');

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(todos));
  }, [todos, storageKey]);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }]);
    setInput('');
  }

  function toggleTodo(id) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }

  function deleteTodo(id) {
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  const incomplete = todos.filter(t => !t.done).length;

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>To-Do {incomplete > 0 ? `(${incomplete})` : ''}</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTodo()}
          placeholder="Add a task..."
          title="Type a new task"
          style={{ flex: 1, height: 34, border: '1.5px solid #D8DDE6', borderRadius: 6, padding: '0 10px', fontFamily: FONT, fontSize: 13, color: NAVY, outline: 'none' }}
        />
        <button onClick={addTodo} title="Add task" style={{ padding: '0 14px', height: 34, background: NAVY, color: 'white', border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          Add
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
        {todos.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #E8ECF0' }}>
            <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} style={{ cursor: 'pointer', accentColor: NAVY }} />
            <span style={{ flex: 1, fontSize: 13, fontFamily: FONT, color: t.done ? GREY : '#333', textDecoration: t.done ? 'line-through' : 'none' }}>{t.text}</span>
            <button onClick={() => deleteTodo(t.id)} title="Delete task" style={{ background: 'none', border: 'none', color: GREY, cursor: 'pointer', fontSize: 16, padding: '0 4px', fontFamily: FONT }}>×</button>
          </div>
        ))}
        {todos.length === 0 && <div style={{ fontSize: 13, color: GREY, fontFamily: FONT, padding: '8px 0' }}>No Tasks Yet</div>}
      </div>
      <button
        onClick={() => { if (!localStorage.getItem('ms_access_token')) window.location.href = '/api/auth/outlook'; }}
        title="Sync tasks from Outlook"
        style={{ marginTop: 12, padding: '6px 14px', background: '#E8ECF0', color: GREY, border: 'none', borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
      >
        Sync Outlook Tasks
      </button>
    </div>
  );
}

function NotesCard() {
  const { user } = useAuthStore();
  const storageKey = `notes_${user?.id}`;
  const [notes, setNotes] = useState(() => localStorage.getItem(storageKey) || '');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setNotes(val);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(storageKey, val);
      setSaved(true);
    }, 500);
  }, [storageKey]);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <div style={CARD}>
      <div style={CARD_HEADER}>Notes</div>
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder="Write your notes here..."
        title="Personal notes"
        rows={6}
        style={{ width: '100%', border: '1.5px solid #D8DDE6', borderRadius: 6, padding: 10, fontFamily: FONT, fontSize: 13, color: NAVY, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
      />
      {saved && <div style={{ fontSize: 11, color: GREY, marginTop: 4, fontFamily: FONT }}>Saved</div>}
    </div>
  );
}

export default function DashboardPage() {
  const { workspace, user } = useAuthStore();
  const quote = useQuote();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h <= 11) return 'Good Morning';
    if (h >= 12 && h <= 16) return 'Good Afternoon';
    if (h >= 17 && h <= 20) return 'Good Evening';
    return 'Good Night';
  })();

  return (
    <div style={{ padding: 28, fontFamily: FONT, height: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: NAVY, marginBottom: 3, fontFamily: FONT }}>
          {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>
          {workspace?.name} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '40% 60%', gap: 20, alignItems: 'start' }}>
        {/* Left — Quote */}
        <div style={{ ...CARD, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 300 }}>
          {quote ? (
            <>
              <div style={{ fontSize: 20, fontWeight: 700, color: NAVY, lineHeight: 1.5, fontFamily: FONT, textAlign: 'center' }}>
                &ldquo;{quote.text}&rdquo;
              </div>
              <div style={{ fontSize: 13, color: GREY, fontStyle: 'italic', textAlign: 'center', marginTop: 16, fontFamily: FONT }}>
                — {quote.author}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: GREY, textAlign: 'center', fontFamily: FONT }}>Loading Quote...</div>
          )}
        </div>

        {/* Right — 3 stacked cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <MeetingsCard />
          <TodoCard />
          <NotesCard />
        </div>
      </div>
    </div>
  );
}
