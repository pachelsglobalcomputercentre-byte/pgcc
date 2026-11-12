const nodemailer = require('nodemailer');

/* Email delivery.
   Render's free tier blocks outbound SMTP (ports 25/465/587) since Sept 2025,
   so Gmail SMTP can't work there. When BREVO_API_KEY is set we send over
   HTTPS through Brevo's API instead (port 443, never blocked). With no
   BREVO_API_KEY (e.g. running locally) it falls back to Gmail SMTP exactly
   as before. */
let smtpTransporter = null;
function getSmtpTransporter() {
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_EMAIL, pass: process.env.GMAIL_APP_PASSWORD }
    });
  }
  return smtpTransporter;
}

async function deliver({ to, subject, html }) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_EMAIL;

  if (process.env.BREVO_API_KEY) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: SCHOOL_NAME, email: senderEmail }, to: [{ email: to }], subject, htmlContent: html }),
      signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Brevo rejected the email (${res.status}): ${detail.slice(0, 300)}`);
    }
    return res.json();
  }

  return getSmtpTransporter().sendMail({ from: `"${SCHOOL_NAME}" <${senderEmail}>`, to, subject, html });
}

const SCHOOL_NAME = 'PGCC Institute';

async function sendApplicationReceivedEmail(application) {
  return deliver({
    to: application.email,
    subject: 'Your PGCC Institute Application Has Been Received',
    html: `
      <p>Dear ${application.fullName},</p>
      <p>Thank you for applying to <b>${application.course}</b> at ${SCHOOL_NAME}.</p>
      <p>Your application has been received and is currently under review. You'll hear back from us within <b>24 hours</b> with a decision.</p>
      <p>No action is needed from you right now — just keep an eye on this inbox.</p>
      <p>— ${SCHOOL_NAME}</p>
    `
  });
}

async function sendApprovalEmail(application) {
  const paymentLink = `${process.env.SITE_URL}/payment.html?applicationId=${application._id}`;
  return deliver({
    to: application.email,
    subject: 'Your PGCC Institute Application Has Been Approved',
    html: `
      <p>Dear ${application.fullName},</p>
      <p>Congratulations — your application for <b>${application.course}</b> has been approved.</p>
      <p>The final step is payment. Click below to complete your enrollment:</p>
      <p><a href="${paymentLink}" style="background:#17a34a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;">Complete Payment</a></p>
      <p>Once payment is confirmed, your Student Portal login details will be sent to this email.</p>
      <p>— ${SCHOOL_NAME}</p>
    `
  });
}

async function sendCredentialsEmail(application) {
  return deliver({
    to: application.email,
    subject: 'Welcome to PGCC Institute — Your Login Details',
    html: `
      <p>Congratulations, ${application.fullName}!</p>
      <p>Your payment has been received and your Student Portal account is ready.</p>
      <p><b>Login Email:</b> ${application.officialEmail}<br>
      <b>Passkey:</b> ${application.passkey}</p>
      <p style="color:#a3382a;"><b>Do not share this with anyone.</b></p>
      <p><a href="${process.env.SITE_URL}/login.html?role=student">Log in to your Student Portal</a></p>
    `
  });
}

async function sendTwoFactorCode(toEmail, code) {
  return deliver({
    to: toEmail,
    subject: `Your PGCC Institute verification code: ${code}`,
    html: `<p>Your admin login verification code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  });
}

async function sendBroadcastEmail(toEmail, subject, bodyHtml) {
  return deliver({
    to: toEmail,
    subject,
    html: `${bodyHtml}<p style="margin-top:24px;color:#8a8a8a;font-size:12px;">— ${SCHOOL_NAME}</p>`
  });
}

module.exports = { sendApplicationReceivedEmail, sendApprovalEmail, sendCredentialsEmail, sendTwoFactorCode, sendBroadcastEmail };
