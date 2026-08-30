const nodemailer = require('nodemailer');

let cachedTransporter = null;

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createSmtpTransporter() {
  if (!cachedTransporter) {
    // Create the transporter once and reuse it. Recreating SMTP connections for
    // every email is slower and can trigger provider rate limits.
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return cachedTransporter;
}

async function sendMail({ to, subject, text }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'Ocula <no-reply@ocula.local>';

  if (!hasSmtpConfig()) {
    // Local/dev fallback: the feature remains testable without paying for an
    // email provider, but production should use real SMTP credentials.
    console.info('[email:dev-only]', { to, subject, text });
    return { skipped: true };
  }

  return createSmtpTransporter().sendMail({ from, to, subject, text });
}

async function sendVerificationEmail({ email, token }) {
  const verificationUrl = `${getFrontendUrl()}/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  return sendMail({
    to: email,
    subject: 'Verify your Ocula account',
    text: `Welcome to Ocula.\n\nVerify your account here:\n${verificationUrl}\n\nThis link expires in 24 hours.`
  });
}

async function sendPasswordResetEmail({ email, token }) {
  const resetUrl = `${getFrontendUrl()}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;

  return sendMail({
    to: email,
    subject: 'Reset your Ocula password',
    text: `Reset your Ocula password here:\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, ignore this email.`
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail
};
