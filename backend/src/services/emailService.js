const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const logger = require('../config/logger');

let _client = null;

function getClient() {
  if (!_client) {
    _client = new SESClient({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

async function sendEmail({ to, subject, html, text }) {
  const client = getClient();
  const params = {
    Source: process.env.AWS_SES_FROM || 'PRANITRA ERP <admin@pranitra.com>',
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to],
    },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {},
    },
  };
  if (html) params.Message.Body.Html = { Data: html, Charset: 'UTF-8' };
  if (text) params.Message.Body.Text = { Data: text, Charset: 'UTF-8' };

  const result = await client.send(new SendEmailCommand(params));
  logger.info(`Email sent: ${result.MessageId} → ${to}`);
  return result;
}

// ── OTP Email ─────────────────────────────────────────────────────
async function sendOtpEmail(email, name, otp) {
  const subject = 'Your PRANITRA PM Login Code';
  const html = `
    <div style="font-family:'Times New Roman',Times,serif;max-width:480px;margin:0 auto;padding:32px;">
      <div style="background:#003264;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;font-size:18px;margin:0;">PRANITRA PM</h1>
      </div>
      <div style="border:1px solid #D8DDE6;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px;">
        <p style="color:#003264;font-size:15px;">Hello ${name},</p>
        <p style="color:#6B7A90;font-size:14px;">Your one-time login code is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#003264;">${otp}</span>
        </div>
        <p style="color:#6B7A90;font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #D8DDE6;margin:20px 0;">
        <p style="color:#B0BAC8;font-size:12px;">If you did not attempt to log in, please contact your IT Administrator immediately.</p>
      </div>
    </div>`;
  return sendEmail({ to: email, subject, html, text: `Your PRANITRA PM login code: ${otp}` });
}

// ── Notification Email ────────────────────────────────────────────
async function sendNotificationEmail(email, name, title, body) {
  const subject = `PRANITRA PM — ${title}`;
  const html = `
    <div style="font-family:'Times New Roman',Times,serif;max-width:480px;margin:0 auto;padding:32px;">
      <div style="background:#003264;padding:16px 24px;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;font-size:18px;margin:0;">PRANITRA PM</h1>
      </div>
      <div style="border:1px solid #D8DDE6;border-top:none;padding:28px 24px;border-radius:0 0 8px 8px;">
        <p style="color:#003264;font-size:15px;">Hello ${name},</p>
        <h2 style="color:#003264;font-size:16px;">${title}</h2>
        <p style="color:#6B7A90;font-size:14px;">${body}</p>
      </div>
    </div>`;
  return sendEmail({ to: email, subject, html, text: `${title}\n\n${body}` });
}

module.exports = { sendEmail, sendOtpEmail, sendNotificationEmail };
