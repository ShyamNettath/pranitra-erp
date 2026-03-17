const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const db = require('../config/db');

let cachedQuote = null;
let cachedDate = null;

router.get('/quote', authenticate, async (_req, res) => {
  const today = new Date().toISOString().split('T')[0];
  if (cachedQuote && cachedDate === today) {
    return res.json(cachedQuote);
  }

  try {
    const response = await fetch('https://zenquotes.io/api/today');
    const data = await response.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (item && item.q) {
      cachedQuote = { quote: item.q, author: item.a };
      cachedDate = today;
      return res.json(cachedQuote);
    }
    return res.json(cachedQuote || { quote: null, author: null });
  } catch {
    return res.json(cachedQuote || { quote: null, author: null });
  }
});

// GET /api/dashboard/meetings — proxy to Microsoft Graph calendar
router.get('/meetings', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    let start, end;
    if (req.query.startDate && req.query.endDate) {
      start = new Date(req.query.startDate).toISOString();
      end   = new Date(req.query.endDate).toISOString();
    } else {
      const now = new Date();
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
    }

    const graphUrl = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${start}&endDateTime=${end}`;
    const response = await fetch(graphUrl, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Microsoft Graph API error' });
    }

    const data = await response.json();
    const meetings = (data.value || []).map(event => ({
      title: event.subject || 'Untitled',
      start: event.start?.dateTime || null,
      end: event.end?.dateTime || null,
    }));

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// ── Todos ───────────────────────────────────────────────────────

// GET /api/dashboard/todos
router.get('/todos', authenticate, async (req, res) => {
  try {
    const todos = await db('dashboard_todos')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'asc');
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch todos' });
  }
});

// POST /api/dashboard/todos
router.post('/todos', authenticate, async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text is required' });
  }
  try {
    const [todo] = await db('dashboard_todos')
      .insert({ user_id: req.user.id, text: text.trim() })
      .returning('*');
    res.status(201).json(todo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// PATCH /api/dashboard/todos/:id — toggle is_done
router.patch('/todos/:id', authenticate, async (req, res) => {
  try {
    const todo = await db('dashboard_todos')
      .where({ id: req.params.id, user_id: req.user.id })
      .first();
    if (!todo) return res.status(404).json({ error: 'Todo not found' });

    const [updated] = await db('dashboard_todos')
      .where({ id: req.params.id, user_id: req.user.id })
      .update({ is_done: !todo.is_done })
      .returning('*');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE /api/dashboard/todos/:id
router.delete('/todos/:id', authenticate, async (req, res) => {
  try {
    const deleted = await db('dashboard_todos')
      .where({ id: req.params.id, user_id: req.user.id })
      .del();
    if (!deleted) return res.status(404).json({ error: 'Todo not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// ── Notes ───────────────────────────────────────────────────────

// GET /api/dashboard/notes
router.get('/notes', authenticate, async (req, res) => {
  try {
    const row = await db('dashboard_notes')
      .where({ user_id: req.user.id })
      .first();
    res.json({ content: row?.content || '' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// PUT /api/dashboard/notes — upsert
router.put('/notes', authenticate, async (req, res) => {
  const { content } = req.body;
  try {
    const existing = await db('dashboard_notes')
      .where({ user_id: req.user.id })
      .first();
    if (existing) {
      await db('dashboard_notes')
        .where({ user_id: req.user.id })
        .update({ content: content || '', updated_at: db.fn.now() });
    } else {
      await db('dashboard_notes')
        .insert({ user_id: req.user.id, content: content || '' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

module.exports = router;
