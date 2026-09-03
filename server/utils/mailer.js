const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const SCHOOL_NAME = 'PGCC Institute';

async function sendApplicationReceivedEmail(application) {
  return transporter.sendMail({
    from: `"${SCHOOL_NAME}" <${process.env.GMAIL_EMAIL}>`,
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
  return transporter.sendMail({
    from: `"${SCHOOL_NAME}" <${process.env.GMAIL_EMAIL}>`,
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
  return transporter.sendMail({
    from: `"${SCHOOL_NAME}" <${process.env.GMAIL_EMAIL}>`,
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
  return transporter.sendMail({
    from: `"${SCHOOL_NAME}" <${process.env.GMAIL_EMAIL}>`,
    to: toEmail,
    subject: `Your PGCC Institute verification code: ${code}`,
    html: `<p>Your admin login verification code is:</p><h2 style="letter-spacing:4px;">${code}</h2><p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  });
}

async function sendBroadcastEmail(toEmail, subject, bodyHtml) {
  return transporter.sendMail({
    from: `"${SCHOOL_NAME}" <${process.env.GMAIL_EMAIL}>`,
    to: toEmail,
    subject,
    html: `${bodyHtml}<p style="margin-top:24px;color:#8a8a8a;font-size:12px;">— ${SCHOOL_NAME}</p>`
  });
}

module.exports = { sendApplicationReceivedEmail, sendApprovalEmail, sendCredentialsEmail, sendTwoFactorCode, sendBroadcastEmail };
