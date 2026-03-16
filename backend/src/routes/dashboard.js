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

module.exports = router;
