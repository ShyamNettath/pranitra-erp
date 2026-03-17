const router = require('express').Router();

// GET /api/auth/outlook — redirect to Microsoft OAuth
router.get('/', (_req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.MS_REDIRECT_URI,
    scope: 'Calendars.Read Tasks.Read offline_access openid profile',
    response_mode: 'query',
  });

  const url = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/authorize?${params}`;
  res.redirect(url);
});

// GET /api/auth/outlook/callback — exchange code for tokens
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      code,
      redirect_uri: process.env.MS_REDIRECT_URI,
      grant_type: 'authorization_code',
      scope: 'Calendars.Read Tasks.Read offline_access openid profile',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      return res.status(400).json({ error: 'Token exchange failed', details: data.error_description });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost';
    res.send(`<!DOCTYPE html><html><body><script>window.opener.postMessage({ms_token:${JSON.stringify(data.access_token)}},${JSON.stringify(frontendUrl)});window.close();</script></body></html>`);
  } catch (err) {
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

module.exports = router;
