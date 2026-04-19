/**
 * Auto-Release Worker
 * Automatically releases bookings that haven't been checked in
 * Runs periodically to find and release expired bookings
 */

const Booking = require('../models/Booking');
const { logAudit } = require('./auditLogger');
const { sendEmail } = require('../config/mailer');

const WORKER_INTERVAL_MS = 60000; // Run every 60 seconds
let workerInterval = null;

/**
 * Process auto-release for bookings past their autoReleaseAt time
 */
const processAutoRelease = async () => {
  try {
    const now = new Date();

    // Find bookings that should be auto-released
    const bookingsToRelease = await Booking.find({
      status: 'approved',
      checkedIn: false,
      autoReleaseAt: { $lte: now, $ne: null }
    }).populate(['room', 'user']);

    if (bookingsToRelease.length === 0) {
      return { processed: 0, released: 0 };
    }

    let releasedCount = 0;

    for (const booking of bookingsToRelease) {
      try {
        // Use atomic update to prevent race condition with check-in
        const updated = await Booking.findOneAndUpdate(
          {
            _id: booking._id,
            status: 'approved',
            checkedIn: false
          },
          {
            $set: {
              status: 'auto_released',
              cancelReason: 'Automatically released due to no check-in',
              cancelledAt: now
            }
          },
          { new: true }
        );

        if (updated) {
          releasedCount++;

          // Log audit
          await logAudit('BOOKING_AUTO_RELEASED', {
            performedBy: null,
            targetType: 'booking',
            targetId: booking._id,
            details: {
              room: booking.room?.name,
              date: booking.date,
              startTime: booking.startTime,
              endTime: booking.endTime,
              autoReleaseAt: booking.autoReleaseAt,
              user: booking.user?.email
            }
          });

          // Send notification email (non-blocking)
          if (booking.user?.email) {
            sendEmail(
              booking.user.email,
              `Booking Auto-Released: ${booking.title}`,
              generateAutoReleaseEmail(booking)
            ).catch(err => {
              console.error(`Failed to send auto-release email: ${err.message}`);
            });
          }

          console.log(`✅ Auto-released booking ${booking._id} for ${booking.user?.email}`);
        }
      } catch (error) {
        console.error(`❌ Failed to auto-release booking ${booking._id}:`, error.message);
      }
    }

    return { processed: bookingsToRelease.length, released: releasedCount };
  } catch (error) {
    console.error('❌ Auto-release worker error:', error.message);
    return { processed: 0, released: 0, error: error.message };
  }
};

/**
 * Generate auto-release notification email
 */
const generateAutoReleaseEmail = (booking) => {
  const room = booking.room || {};
  const dateStr = new Date(booking.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">Booking Auto-Released</h2>
      
      <p>Your booking was automatically released because you did not check in on time.</p>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">${booking.title}</h3>
        <p style="margin: 5px 0;"><strong>Room:</strong> ${room.name || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>Building:</strong> ${room.building || 'N/A'}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${dateStr}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${booking.startTime} - ${booking.endTime}</p>
        <p style="margin: 5px 0;"><strong>Confirmation Code:</strong> ${booking.confirmationCode}</p>
      </div>
      
      <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
        <p style="margin: 0;"><strong>⚠️ Important:</strong> To avoid auto-release in the future, please check in within the allowed time window before your booking starts.</p>
      </div>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you have questions, please contact the booking system administrator.
      </p>
    </div>
  `;
};

/**
 * Start the auto-release worker
 */
const startAutoReleaseWorker = () => {
  if (workerInterval) {
    console.log('⚠️ Auto-release worker already running');
    return;
  }

  console.log('🚀 Starting auto-release worker...');
  
  // Run immediately on start
  processAutoRelease().then(result => {
    console.log(`✅ Initial auto-release check: ${result.released}/${result.processed} released`);
  });

  // Then run periodically
  workerInterval = setInterval(async () => {
    const result = await processAutoRelease();
    if (result.released > 0) {
      console.log(`✅ Auto-release: ${result.released}/${result.processed} bookings released`);
    }
  }, WORKER_INTERVAL_MS);

  console.log(`✅ Auto-release worker started (interval: ${WORKER_INTERVAL_MS}ms)`);
};

/**
 * Stop the auto-release worker
 */
const stopAutoReleaseWorker = () => {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('🛑 Auto-release worker stopped');
  }
};

/**
 * Calculate auto-release time for a booking
 * @param {Date} bookingDate - Booking date
 * @param {string} startTime - Start time (HH:MM)
 * @param {number} graceMinutes - Grace period in minutes (default 15)
 * @returns {Date}
 */
const calculateAutoReleaseTime = (bookingDate, startTime, graceMinutes = 15) => {
  const [hours, minutes] = startTime.split(':').map(Number);
  const releaseTime = new Date(bookingDate);
  releaseTime.setHours(hours, minutes + graceMinutes, 0, 0);
  return releaseTime;
};

module.exports = {
  startAutoReleaseWorker,
  stopAutoReleaseWorker,
  processAutoRelease,
  calculateAutoReleaseTime
};
