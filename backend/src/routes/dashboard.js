const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

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
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

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

module.exports = router;
