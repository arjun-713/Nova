const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
});

function emailBase(title, body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A0F1C;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#111827;border:1px solid #1E3A5F;border-radius:16px;overflow:hidden;">
    <div style="background:#1E3A5F;padding:24px 32px;">
      <h1 style="margin:0;color:#3B82F6;font-size:20px;">🚌 SmartBus Pass</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#F1F5F9;margin-top:0;">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #1E3A5F;text-align:center;">
      <p style="color:#4B6280;font-size:12px;margin:0;">SmartBus Pass & Tracking System</p>
    </div>
  </div></body></html>`;
}

async function sendApprovalEmail(to, fullName, routeName, expiryDate, qrBase64) {
  const body = `
    <p style="color:#94A3B8;">Hi <strong style="color:#F1F5F9;">${fullName}</strong>,</p>
    <p style="color:#94A3B8;">Your bus pass has been <strong style="color:#10B981;">approved</strong>!</p>
    <div style="background:#0A0F1C;border:1px solid #1E3A5F;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="color:#94A3B8;margin:4px 0;">Route: <span style="color:#3B82F6;font-family:monospace;">${routeName}</span></p>
      <p style="color:#94A3B8;margin:4px 0;">Valid Until: <span style="color:#F1F5F9;font-family:monospace;">${new Date(expiryDate).toDateString()}</span></p>
    </div>
    <p style="color:#94A3B8;">Your QR code is attached below. Show it to the driver when boarding.</p>
    <div style="text-align:center;margin:24px 0;">
      <img src="${qrBase64}" alt="QR Code" style="width:200px;height:200px;border:4px solid #1E3A5F;border-radius:8px;" />
    </div>`;
  await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject: '✅ Your SmartBus Pass is Approved!', html: emailBase('Pass Approved!', body) });
}

async function sendRejectionEmail(to, fullName, routeName) {
  const body = `
    <p style="color:#94A3B8;">Hi <strong style="color:#F1F5F9;">${fullName}</strong>,</p>
    <p style="color:#94A3B8;">Unfortunately, your bus pass application for <strong style="color:#3B82F6;">${routeName}</strong> was not approved at this time.</p>
    <p style="color:#94A3B8;">Please contact the transport department for more information or re-apply.</p>
    <a href="/apply.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3B82F6;color:white;border-radius:8px;text-decoration:none;">Re-Apply Now</a>`;
  await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject: '❌ Bus Pass Application Update', html: emailBase('Application Update', body) });
}

async function sendExpiryReminderEmail(to, fullName, routeName, daysLeft) {
  const body = `
    <p style="color:#94A3B8;">Hi <strong style="color:#F1F5F9;">${fullName}</strong>,</p>
    <p style="color:#94A3B8;">Your bus pass for <strong style="color:#3B82F6;">${routeName}</strong> expires in <strong style="color:#F59E0B;">${daysLeft} day(s)</strong>.</p>
    <p style="color:#94A3B8;">Renew now to avoid any disruption to your commute.</p>
    <a href="/apply.html" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#3B82F6;color:white;border-radius:8px;text-decoration:none;">Renew Pass</a>`;
  await transporter.sendMail({ from: process.env.GMAIL_USER, to, subject: `⚠️ Your SmartBus Pass expires in ${daysLeft} days`, html: emailBase('Pass Expiry Reminder', body) });
}

module.exports = { sendApprovalEmail, sendRejectionEmail, sendExpiryReminderEmail };
