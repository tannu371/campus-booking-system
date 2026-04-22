/**
 * HTML email templates for CampusBook
 */

const baseStyles = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
`;

const headerStyle = `
  background: linear-gradient(135deg, #E67E22 0%, #F39C12 100%);
  padding: 32px 24px;
  text-align: center;
  color: white;
`;

const bodyStyle = `
  padding: 32px 24px;
  color: #333;
  line-height: 1.6;
`;

const footerStyle = `
  padding: 20px 24px;
  text-align: center;
  background: #f9fafb;
  color: #6b7280;
  font-size: 13px;
  border-top: 1px solid #e5e7eb;
`;

const buttonStyle = `
  display: inline-block;
  padding: 12px 28px;
  background: linear-gradient(135deg, #E67E22, #F39C12);
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin-top: 16px;
`;

const infoBoxStyle = `
  background: #fef3e2;
  border-left: 4px solid #E67E22;
  padding: 16px;
  border-radius: 0 8px 8px 0;
  margin: 16px 0;
`;

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Welcome email for new users
 */
const welcomeEmail = (name) => `
<div style="${baseStyles}">
  <div style="${headerStyle}">
    <h1 style="margin:0; font-size:28px;">🏫 Welcome to CampusBook!</h1>
  </div>
  <div style="${bodyStyle}">
    <h2 style="color:#1a1a2e; margin-bottom:16px;">Hi ${escapeHtml(name)}! 👋</h2>
    <p>Thank you for creating an account on <strong>CampusBook</strong> — your one-stop platform for booking campus rooms and facilities.</p>
    <div style="${infoBoxStyle}">
      <strong>What you can do:</strong>
      <ul style="margin:8px 0 0 0; padding-left:20px;">
        <li>Browse available rooms, labs, and meeting spaces</li>
        <li>Book rooms instantly with calendar view</li>
        <li>Track and manage your bookings</li>
        <li>Get email notifications for booking updates</li>
      </ul>
    </div>
    <p>Start exploring available rooms and make your first booking!</p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/rooms" style="${buttonStyle}">Browse Rooms →</a>
    </div>
  </div>
  <div style="${footerStyle}">
    <p style="margin:0;">© ${new Date().getFullYear()} CampusBook — Campus Room & Facility Booking System</p>
  </div>
</div>
`;

/**
 * Booking confirmation email
 */
const bookingConfirmationEmail = (booking, room, user) => `
<div style="${baseStyles}">
  <div style="${headerStyle}">
    <h1 style="margin:0; font-size:24px;">📅 Booking Confirmed!</h1>
  </div>
  <div style="${bodyStyle}">
    <h2 style="color:#1a1a2e; margin-bottom:16px;">Hi ${escapeHtml(user.name)},</h2>
    <p>Your room booking has been successfully created. Here are the details:</p>
    <div style="${infoBoxStyle}">
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:6px 0; color:#6b7280; width:120px;"><strong>Title:</strong></td><td style="padding:6px 0;">${escapeHtml(booking.title)}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Room:</strong></td><td style="padding:6px 0;">${escapeHtml(room.name)}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Building:</strong></td><td style="padding:6px 0;">${escapeHtml(room.building)}, Floor ${escapeHtml(room.floor)}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Date:</strong></td><td style="padding:6px 0;">${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Time:</strong></td><td style="padding:6px 0;">${escapeHtml(booking.startTime)} — ${escapeHtml(booking.endTime)}</td></tr>
        ${booking.purpose ? `<tr><td style="padding:6px 0; color:#6b7280;"><strong>Purpose:</strong></td><td style="padding:6px 0;">${escapeHtml(booking.purpose)}</td></tr>` : ''}
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Status:</strong></td><td style="padding:6px 0;"><span style="background:#27ae60; color:white; padding:3px 10px; border-radius:12px; font-size:12px; font-weight:600; text-transform:uppercase;">${escapeHtml(booking.status)}</span></td></tr>
      </table>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-bookings" style="${buttonStyle}">View My Bookings</a>
    </div>
  </div>
  <div style="${footerStyle}">
    <p style="margin:0;">© ${new Date().getFullYear()} CampusBook — Campus Room & Facility Booking System</p>
  </div>
</div>
`;

/**
 * Booking status update email
 */
const bookingStatusEmail = (booking, room, user, newStatus) => {
  const statusColors = {
    approved: '#27ae60',
    rejected: '#e74c3c',
    cancelled: '#6b7280',
    pending: '#f39c12'
  };

  const statusMessages = {
    approved: 'Your booking has been approved! 🎉',
    rejected: 'Unfortunately, your booking has been rejected.',
    cancelled: 'Your booking has been cancelled.',
    pending: 'Your booking is now pending review.'
  };

  const statusColor = statusColors[newStatus] || '#6b7280';

  return `
<div style="${baseStyles}">
  <div style="${headerStyle}">
    <h1 style="margin:0; font-size:24px;">📋 Booking Status Update</h1>
  </div>
  <div style="${bodyStyle}">
    <h2 style="color:#1a1a2e; margin-bottom:16px;">Hi ${escapeHtml(user.name)},</h2>
    <p>${escapeHtml(statusMessages[newStatus])}</p>
    <div style="text-align:center; margin:20px 0;">
      <span style="background:${statusColor}; color:white; padding:8px 20px; border-radius:20px; font-size:14px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">${escapeHtml(newStatus)}</span>
    </div>
    <div style="${infoBoxStyle}">
      <table style="width:100%; border-collapse:collapse;">
        <tr><td style="padding:6px 0; color:#6b7280; width:120px;"><strong>Title:</strong></td><td style="padding:6px 0;">${escapeHtml(booking.title)}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Room:</strong></td><td style="padding:6px 0;">${escapeHtml(room.name || 'N/A')}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Date:</strong></td><td style="padding:6px 0;">${new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;"><strong>Time:</strong></td><td style="padding:6px 0;">${escapeHtml(booking.startTime)} — ${escapeHtml(booking.endTime)}</td></tr>
      </table>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/my-bookings" style="${buttonStyle}">View My Bookings</a>
    </div>
  </div>
  <div style="${footerStyle}">
    <p style="margin:0;">© ${new Date().getFullYear()} CampusBook — Campus Room & Facility Booking System</p>
  </div>
</div>
  `;
};

module.exports = {
  welcomeEmail,
  bookingConfirmationEmail,
  bookingStatusEmail
};
