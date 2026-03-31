const QRCode = require('qrcode');
const crypto = require('crypto');
require('dotenv').config();

function signPayload(payload) {
  const str = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', process.env.SESSION_SECRET);
  hmac.update(str);
  const sig = hmac.digest('hex');
  return Buffer.from(JSON.stringify({ data: payload, sig })).toString('base64');
}

function verifyPayload(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    const { data, sig } = decoded;
    const hmac = crypto.createHmac('sha256', process.env.SESSION_SECRET);
    hmac.update(JSON.stringify(data));
    const expected = hmac.digest('hex');
    if (sig !== expected) return null;
    return data;
  } catch {
    return null;
  }
}

async function generateQR(payload) {
  const token = signPayload(payload);
  const qrBase64 = await QRCode.toDataURL(token, { width: 300, margin: 2 });
  return { token, qrBase64 };
}

module.exports = { generateQR, verifyPayload };
