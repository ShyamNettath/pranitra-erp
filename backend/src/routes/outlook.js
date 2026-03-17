const router = require('express').Router();

// GET /api/auth/outlook — redirect to Microsoft OAuth
router.get('/', (_req, res) => {
  try {
    const clientId   = process.env.MS_CLIENT_ID;
    const tenantId   = process.env.MS_TENANT_ID;
    const redirectUri = process.env.MS_REDIRECT_URI;

    console.log('[outlook] MS_CLIENT_ID:   ', clientId);
    console.log('[outlook] MS_TENANT_ID:   ', tenantId);
    console.log('[outlook] MS_REDIRECT_URI:', redirectUri);

    const missing = [];
    if (!clientId)    missing.push('MS_CLIENT_ID');
    if (!tenantId)    missing.push('MS_TENANT_ID');
    if (!redirectUri) missing.push('MS_REDIRECT_URI');

    if (missing.length > 0) {
      return res.status(500).type('text').send(`Outlook OAuth misconfigured — missing env vars: ${missing.join(', ')}`);
    }

    const params = new URLSearchParams({
      client_id:     clientId,
      response_type: 'code',
      redirect_uri:  redirectUri,
      scope:         'Calendars.Read Tasks.Read offline_access openid profile',
      response_mode: 'query',
    });

    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`;
    res.redirect(url);
  } catch (err) {
    console.error('[outlook] Error in GET /api/auth/outlook:', err);
    res.status(500).type('text').send('Outlook OAuth error — check server logs');
  }
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

    const token = data.access_token;
    res.send(`<html><body><script>
window.opener && window.opener.postMessage({ ms_token: ${JSON.stringify(token)} }, 'https://erp.pranitra.com');
setTimeout(function(){ window.close(); }, 500);
</script><p>Connected! You can close this window.</p></body></html>`);
  } catch (err) {
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

module.exports = router;
