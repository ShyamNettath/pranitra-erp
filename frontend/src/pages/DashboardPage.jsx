import React, { useState, useEffect, useRef, useCallback } from 'react';
import useAuthStore from '@/store/authStore';
import api from '@/services/api';

const FONT = 'Arial, sans-serif';
const NAVY = '#003264';
const GREY = '#8A9BB0';
const CARD = { background: '#F5F7FA', padding: 20, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' };
const CARD_HEADER = { fontSize: 12, fontWeight: 700, letterSpacing: 1.2, color: NAVY, marginBottom: 14, fontFamily: FONT, textTransform: 'uppercase' };

// ── Quote hook ───────────────────────────────────────────────────
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

// ── Meetings card ────────────────────────────────────────────────
function MeetingsCard() {
  const [meetings, setMeetings] = useState(null);
  const [error, setError] = useState(false);
  const [msToken, setMsToken] = useState(() => localStorage.getItem('ms_access_token'));

  const openOutlookPopup = () => {
    const popup = window.open(
      '/api/auth/outlook',
      'outlook_auth',
      'width=600,height=700,left=400,top=100'
    );
    const handler = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.ms_token) {
        localStorage.setItem('ms_access_token', e.data.ms_token);
        popup?.close();
        window.removeEventListener('message', handler);
        setMsToken(e.data.ms_token);
      }
    };
    window.addEventListener('message', handler);
  };

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
          onClick={openOutlookPopup}
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

// ── To-Do card ───────────────────────────────────────────────────
function TodoCard() {
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    api.get('/dashboard/todos')
      .then(({ data }) => setTodos(data))
      .catch(() => {});
  }, []);

  function addTodo() {
    const text = input.trim();
    if (!text) return;
    api.post('/dashboard/todos', { text })
      .then(({ data }) => setTodos(prev => [...prev, data]))
      .catch(() => {});
    setInput('');
  }

  function toggleTodo(id) {
    api.patch(`/dashboard/todos/${id}`)
      .then(({ data }) => setTodos(prev => prev.map(t => t.id === id ? data : t)))
      .catch(() => {});
  }

  function deleteTodo(id) {
    api.delete(`/dashboard/todos/${id}`)
      .then(() => setTodos(prev => prev.filter(t => t.id !== id)))
      .catch(() => {});
  }

  const incomplete = todos.filter(t => !t.is_done).length;

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
            <input type="checkbox" checked={t.is_done} onChange={() => toggleTodo(t.id)} style={{ cursor: 'pointer', accentColor: NAVY }} />
            <span style={{ flex: 1, fontSize: 13, fontFamily: FONT, color: t.is_done ? GREY : '#333', textDecoration: t.is_done ? 'line-through' : 'none' }}>{t.text}</span>
            <button onClick={() => deleteTodo(t.id)} title="Delete task" style={{ background: 'none', border: 'none', color: GREY, cursor: 'pointer', fontSize: 16, padding: '0 4px', fontFamily: FONT }}>×</button>
          </div>
        ))}
        {todos.length === 0 && <div style={{ fontSize: 13, color: GREY, fontFamily: FONT, padding: '8px 0' }}>No Tasks Yet</div>}
      </div>
    </div>
  );
}

// ── Notes card ───────────────────────────────────────────────────
function NotesCard() {
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    api.get('/dashboard/notes')
      .then(({ data }) => setNotes(data.content || ''))
      .catch(() => {});
  }, []);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setNotes(val);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.put('/dashboard/notes', { content: val })
        .then(() => setSaved(true))
        .catch(() => {});
    }, 500);
  }, []);

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
        rows={5}
        style={{ width: '100%', border: '1.5px solid #D8DDE6', borderRadius: 6, padding: 10, fontFamily: FONT, fontSize: 13, color: NAVY, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
      />
      {saved && <div style={{ fontSize: 11, color: GREY, marginTop: 4, fontFamily: FONT }}>Saved</div>}
    </div>
  );
}

// ── Emergency Contacts card ──────────────────────────────────────
function EmergencyContactsCard() {
  const [contacts, setContacts] = useState(null);

  useEffect(() => {
    api.get('/hr/emergency-contacts')
      .then(({ data }) => setContacts(data))
      .catch(() => setContacts([]));
  }, []);

  return (
    <div style={{ ...CARD, height: '100%', boxSizing: 'border-box' }}>
      <div style={CARD_HEADER}>Emergency Contacts</div>
      {contacts === null ? (
        <div style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>Loading...</div>
      ) : contacts.length === 0 ? (
        <div style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>No Emergency Contacts Configured</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: 13 }}>
          <thead>
            <tr style={{ background: NAVY }}>
              {['Name', 'Role', 'Phone'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'white', fontWeight: 700, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #E8ECF0' }}>
                <td style={{ padding: '9px 12px', fontWeight: 700, color: NAVY }}>{c.name}</td>
                <td style={{ padding: '9px 12px', color: GREY }}>{c.role}</td>
                <td style={{ padding: '9px 12px', color: '#333' }}>{c.phone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── My Day tab ───────────────────────────────────────────────────
function MyDayTab() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 300 }}>
        <MeetingsCard />
        <EmergencyContactsCard />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 300 }}>
        <TodoCard />
        <NotesCard />
      </div>
    </div>
  );
}

// ── Coming Soon placeholder ──────────────────────────────────────
function ComingSoonTab() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
      <div style={{ ...CARD, textAlign: 'center', padding: '40px 80px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: NAVY, fontFamily: FONT }}>Coming Soon</div>
      </div>
    </div>
  );
}

// ── Dashboard page ───────────────────────────────────────────────
const TABS = [
  { key: 'my-day',      label: 'My Day' },
  { key: 'my-profile',  label: 'My Profile' },
  { key: 'skills',      label: 'Skills Matrix' },
  { key: 'performance', label: 'Performance & KPIs' },
];

export default function DashboardPage() {
  const { workspace, user } = useAuthStore();
  const quote = useQuote();
  const [tab, setTab] = useState('my-day');

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h <= 11) return 'Good Morning';
    if (h >= 12 && h <= 16) return 'Good Afternoon';
    if (h >= 17 && h <= 20) return 'Good Evening';
    return 'Good Night';
  })();

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

      {/* ── Persistent Header ─────────────────────────── */}
      <div style={{ margin: '20px 28px 0', ...CARD }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
          {/* Left — greeting + date */}
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, fontFamily: FONT, marginBottom: 6 }}>
              {greeting}, {user?.name?.split(' ')[0]} 👋
            </div>
            <div style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>
              {workspace?.name} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          {/* Right — daily quote */}
          <div>
            {quote ? (
              <>
                <div style={{ fontSize: 13, color: NAVY, fontStyle: 'italic', fontFamily: FONT, lineHeight: 1.6 }}>
                  &ldquo;{quote.text}&rdquo;
                </div>
                <div style={{ fontSize: 12, color: GREY, fontStyle: 'italic', fontFamily: FONT, marginTop: 6 }}>
                  — {quote.author}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: GREY, fontFamily: FONT }}>Loading Quote...</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, padding: '16px 28px 0', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '9px 20px',
              fontFamily: FONT,
              fontSize: 13,
              fontWeight: 600,
              color: tab === t.key ? 'white' : '#555',
              background: tab === t.key ? NAVY : '#EBEEF2',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────── */}
      <div style={{ flex: 1, padding: '20px 28px 28px' }}>
        {tab === 'my-day'      && <MyDayTab />}
        {tab === 'my-profile'  && <ComingSoonTab />}
        {tab === 'skills'      && <ComingSoonTab />}
        {tab === 'performance' && <ComingSoonTab />}
      </div>

    </div>
  );
}
