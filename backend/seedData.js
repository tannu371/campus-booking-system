const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');
const AuditLog = require('./models/AuditLog');
const { generateConfirmationCode } = require('./utils/bookingValidator');

/**
 * Seeds the database with sample data.
 * Called from server.js on first boot or from seed.js CLI.
 * 
 * SECURITY: Uses environment variables for passwords.
 * Set SEED_ADMIN_PASSWORD, SEED_FACULTY_PASSWORD, SEED_USER_PASSWORD, SEED_STAFF_PASSWORD
 * in your .env file. Defaults are INSECURE and for development only.
 */
module.exports = async function seedData() {
  // Get passwords from environment or use INSECURE defaults for dev
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'CHANGE_ME_admin123';
  const facultyPassword = process.env.SEED_FACULTY_PASSWORD || 'CHANGE_ME_faculty123';
  const userPassword = process.env.SEED_USER_PASSWORD || 'CHANGE_ME_user123';
  const staffPassword = process.env.SEED_STAFF_PASSWORD || 'CHANGE_ME_staff123';

  // Warn if using default passwords
  if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_FACULTY_PASSWORD || 
      !process.env.SEED_USER_PASSWORD || !process.env.SEED_STAFF_PASSWORD) {
    console.warn('⚠️  WARNING: Using default seed passwords. Set SEED_*_PASSWORD in .env for production!');
  }

  await User.deleteMany({});
  await Room.deleteMany({});
  await Booking.deleteMany({});
  await AuditLog.deleteMany({});

  const admin = await User.create({
    name: 'Admin User', email: 'admin@campus.edu', password: adminPassword,
    role: 'admin', department: 'Administration', maxActiveBookings: 50
  });
  const faculty = await User.create({
    name: 'Dr. Sarah Chen', email: 'sarah@campus.edu', password: facultyPassword,
    role: 'faculty', department: 'Computer Science', maxActiveBookings: 20
  });
  const user1 = await User.create({
    name: 'John Student', email: 'john@campus.edu', password: userPassword,
    role: 'user', department: 'Computer Science'
  });
  const user2 = await User.create({
    name: 'Alice Johnson', email: 'alice@campus.edu', password: userPassword,
    role: 'user', department: 'Electronics'
  });
  const user3 = await User.create({
    name: 'Bob Smith', email: 'bob@campus.edu', password: userPassword,
    role: 'user', department: 'Mechanical Engineering'
  });
  await User.create({
    name: 'Carol Lee', email: 'carol@campus.edu', password: staffPassword,
    role: 'staff', department: 'Library', maxActiveBookings: 10
  });

  console.log('  Created 6 users');

  const rooms = await Room.insertMany([
    { name: 'Lecture Hall A1', type: 'classroom', capacity: 120, building: 'Academic Block A', floor: 1, amenities: ['Projector','Whiteboard','AC','WiFi','Mic System'], description: 'Large lecture hall with tiered seating.', operatingHoursStart: '07:00', operatingHoursEnd: '22:00', bufferMinutes: 15 },
    { name: 'Seminar Room B2', type: 'seminar_hall', capacity: 60, building: 'Academic Block B', floor: 2, amenities: ['Projector','Whiteboard','AC','WiFi'], description: 'Mid-size seminar hall for workshops.', operatingHoursStart: '08:00', operatingHoursEnd: '21:00', bufferMinutes: 10 },
    { name: 'Meeting Room C3', type: 'meeting_room', capacity: 15, building: 'Admin Block', floor: 3, amenities: ['TV Screen','Whiteboard','AC','WiFi','Video Conferencing'], description: 'Small meeting room with video conferencing.', operatingHoursStart: '08:00', operatingHoursEnd: '20:00', bufferMinutes: 5 },
    { name: 'Conference Hall D1', type: 'conference_room', capacity: 200, building: 'Convention Center', floor: 1, amenities: ['Projector','Stage','AC','WiFi','Mic System','Recording'], description: 'Large conference hall for events.', operatingHoursStart: '07:00', operatingHoursEnd: '22:00', bufferMinutes: 30, requiresApproval: true, internalNotes: 'Requires AV team setup.' },
    { name: 'Computer Lab E2', type: 'lab', capacity: 40, building: 'Tech Block', floor: 2, amenities: ['Computers','AC','WiFi','Projector'], description: 'Computer lab with 40 workstations.', operatingHoursStart: '08:00', operatingHoursEnd: '20:00', bufferMinutes: 10, requiresApproval: true },
    { name: 'Classroom F1', type: 'classroom', capacity: 50, building: 'Academic Block A', floor: 1, amenities: ['Projector','Whiteboard','AC'], description: 'Standard classroom.', operatingHoursStart: '07:00', operatingHoursEnd: '21:00', bufferMinutes: 10 },
    { name: 'Board Room G3', type: 'meeting_room', capacity: 10, building: 'Admin Block', floor: 3, amenities: ['TV Screen','AC','WiFi','Video Conferencing'], description: 'Executive board room.', operatingHoursStart: '09:00', operatingHoursEnd: '18:00', bufferMinutes: 10, requiresApproval: true },
    { name: 'Physics Lab H2', type: 'lab', capacity: 30, building: 'Science Block', floor: 2, amenities: ['Lab Equipment','AC','WiFi','Projector'], description: 'Physics laboratory.', isAvailable: false, operatingHoursStart: '09:00', operatingHoursEnd: '17:00', bufferMinutes: 15, internalNotes: 'Under maintenance.' },
    { name: 'Seminar Room S1', type: 'seminar_hall', capacity: 80, building: 'Academic Block A', floor: 2, amenities: ['Projector','Whiteboard','AC','WiFi','Podium'], description: 'Large seminar room with podium.', operatingHoursStart: '07:00', operatingHoursEnd: '22:00', bufferMinutes: 10 },
    { name: 'Study Room L1', type: 'meeting_room', capacity: 6, building: 'Library Building', floor: 1, amenities: ['Whiteboard','WiFi','Power Outlets'], description: 'Quiet study room in the library.', operatingHoursStart: '08:00', operatingHoursEnd: '22:00', bufferMinutes: 5 },
    { name: 'Innovation Lab I3', type: 'lab', capacity: 25, building: 'Tech Block', floor: 3, amenities: ['3D Printer','Computers','AC','WiFi','Projector'], description: 'Maker space with 3D printing.', operatingHoursStart: '09:00', operatingHoursEnd: '21:00', bufferMinutes: 15, requiresApproval: true },
    { name: 'Classroom F2', type: 'classroom', capacity: 45, building: 'Academic Block B', floor: 1, amenities: ['Projector','Whiteboard','AC','WiFi'], description: 'Modern classroom with smart board.', operatingHoursStart: '07:00', operatingHoursEnd: '21:00', bufferMinutes: 10 }
  ]);

  console.log(`  Created ${rooms.length} rooms`);

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const day2 = new Date(); day2.setDate(day2.getDate() + 2);
  const day3 = new Date(); day3.setDate(day3.getDate() + 3);
  const day4 = new Date(); day4.setDate(day4.getDate() + 4);
  const today = new Date();

  const bookings = await Booking.insertMany([
    { room: rooms[0]._id, user: user1._id, title: 'Data Structures Lecture', date: tomorrow, startTime: '09:00', endTime: '10:30', purpose: 'CS201 lecture', status: 'approved', attendeeCount: 85, confirmationCode: generateConfirmationCode() },
    { room: rooms[1]._id, user: user1._id, title: 'ML Workshop', date: tomorrow, startTime: '14:00', endTime: '16:00', purpose: 'Machine Learning workshop', status: 'pending', attendeeCount: 40, confirmationCode: generateConfirmationCode() },
    { room: rooms[2]._id, user: admin._id, title: 'Faculty Meeting', date: day2, startTime: '11:00', endTime: '12:00', purpose: 'Monthly review', status: 'approved', attendeeCount: 10, confirmationCode: generateConfirmationCode() },
    { room: rooms[0]._id, user: faculty._id, title: 'Algorithm Design Class', date: day2, startTime: '09:00', endTime: '11:00', purpose: 'CS401 Advanced Algorithms', status: 'approved', attendeeCount: 100, confirmationCode: generateConfirmationCode() },
    { room: rooms[3]._id, user: user2._id, title: 'Debate Club Semifinals', date: day3, startTime: '17:00', endTime: '20:00', purpose: 'Annual debate competition', status: 'pending', attendeeCount: 150, confirmationCode: generateConfirmationCode() },
    { room: rooms[5]._id, user: user3._id, title: 'Study Group - Physics', date: tomorrow, startTime: '16:00', endTime: '18:00', purpose: 'Final exam prep', status: 'approved', attendeeCount: 20, confirmationCode: generateConfirmationCode() },
    { room: rooms[4]._id, user: faculty._id, title: 'Database Lab Session', date: day2, startTime: '14:00', endTime: '16:00', purpose: 'SQL exercises', status: 'approved', attendeeCount: 35, confirmationCode: generateConfirmationCode() },
    { room: rooms[8]._id, user: user2._id, title: 'Project Presentation Prep', date: day3, startTime: '10:00', endTime: '12:00', purpose: 'Final year rehearsal', status: 'approved', attendeeCount: 15, confirmationCode: generateConfirmationCode() },
    { room: rooms[9]._id, user: user1._id, title: 'Group Study - Calculus', date: day4, startTime: '09:00', endTime: '11:00', purpose: 'Math midterm prep', status: 'approved', attendeeCount: 5, confirmationCode: generateConfirmationCode() },
    { room: rooms[10]._id, user: user3._id, title: 'Robotics Club Workshop', date: day3, startTime: '14:00', endTime: '17:00', purpose: 'Building robots', status: 'pending', attendeeCount: 20, confirmationCode: generateConfirmationCode() },
    { room: rooms[0]._id, user: user2._id, title: 'Guest Lecture - AI Ethics', date: day4, startTime: '14:00', endTime: '16:00', purpose: 'Talk by Dr. Priya Sharma', status: 'approved', attendeeCount: 90, confirmationCode: generateConfirmationCode() },
    { room: rooms[1]._id, user: user1._id, title: 'Cancelled Study Session', date: today, startTime: '10:00', endTime: '12:00', status: 'cancelled', confirmationCode: generateConfirmationCode(), cancelReason: 'Exam postponed' },
    { room: rooms[2]._id, user: user3._id, title: 'Team Sync', date: today, startTime: '15:00', endTime: '16:00', status: 'rejected', confirmationCode: generateConfirmationCode(), cancelReason: 'Room maintenance' }
  ]);

  console.log(`  Created ${bookings.length} bookings`);

  await AuditLog.insertMany([
    { action: 'USER_REGISTERED', performedBy: user1._id, targetType: 'user', targetId: user1._id, details: { name: 'John Student' } },
    { action: 'BOOKING_CREATED', performedBy: user1._id, targetType: 'booking', targetId: bookings[0]._id, details: { room: 'Lecture Hall A1' } },
    { action: 'ROOM_CREATED', performedBy: admin._id, targetType: 'room', targetId: rooms[0]._id, details: { name: 'Lecture Hall A1' } },
    { action: 'BOOKING_CANCELLED', performedBy: user1._id, targetType: 'booking', targetId: bookings[11]._id, details: { reason: 'Exam postponed' } }
  ]);

  console.log('  Created audit logs');
  console.log('  📋 Seed accounts created: admin@campus.edu, sarah@campus.edu, john@campus.edu, alice@campus.edu, bob@campus.edu, carol@campus.edu');
  console.log('  🔐 Passwords configured via SEED_*_PASSWORD environment variables');
};
