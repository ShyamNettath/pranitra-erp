const { authenticator } = require('otplib');
const QRCode = require('qrcode');

/**
 * Generate a new TOTP secret + QR code for a user.
 * @param {string} userEmail
 * @returns {Promise<{ secret: string, otpauthUrl: string, qrCodeDataUrl: string }>}
 */
async function generateSecret(userEmail) {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, 'PRANITRA PM', secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return { secret, otpauthUrl, qrCodeDataUrl };
}

/**
 * Verify a 6-digit TOTP token against a secret.
 * @param {string} secret
 * @param {string} token
 * @returns {boolean}
 */
function verifyToken(secret, token) {
  return authenticator.verify({ token, secret });
}

module.exports = { generateSecret, verifyToken };
