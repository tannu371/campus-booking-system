const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send an email. Fails silently if SMTP is not configured.
 */
const sendEmail = async (to, subject, html) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`📧 Email skipped (SMTP not configured): "${subject}" → ${to}`);
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"CampusBook" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent: "${subject}" → ${to}`);
  } catch (error) {
    console.error(`❌ Email failed: "${subject}" → ${to}:`, error.message);
  }
};

module.exports = { sendEmail };
