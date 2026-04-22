const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');
const AuditLog = require('./models/AuditLog');
const { generateConfirmationCode } = require('./utils/bookingValidator');

const seed = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-booking';
    try {
      await mongoose.connect(uri);
      console.log('Connected to MongoDB');
    } catch (err) {
      console.log('Local MongoDB unavailable, using in-memory server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
      console.log('Connected to in-memory MongoDB');
    }

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

    // Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});
    await Booking.deleteMany({});
    await AuditLog.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@campus.edu',
      password: adminPassword,
      role: 'admin',
      department: 'Administration',
      maxActiveBookings: 50,
      status: 'active'
    });

    // Create faculty user
    const faculty = await User.create({
      name: 'Dr. Sarah Chen',
      email: 'sarah@campus.edu',
      password: facultyPassword,
      role: 'faculty',
      department: 'Computer Science',
      maxActiveBookings: 20,
      status: 'active'
    });

    // Create regular users
    const user1 = await User.create({
      name: 'John Student',
      email: 'john@campus.edu',
      password: userPassword,
      role: 'user',
      department: 'Computer Science',
      status: 'active'
    });

    const user2 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@campus.edu',
      password: userPassword,
      role: 'user',
      department: 'Electronics',
      status: 'active'
    });

    const user3 = await User.create({
      name: 'Bob Smith',
      email: 'bob@campus.edu',
      password: userPassword,
      role: 'user',
      department: 'Mechanical Engineering',
      status: 'active'
    });

    const staff1 = await User.create({
      name: 'Carol Lee',
      email: 'carol@campus.edu',
      password: staffPassword,
      role: 'staff',
      department: 'Library',
      maxActiveBookings: 10,
      status: 'active'
    });

    console.log('Created 6 users (passwords configured via environment variables)');

    // Create rooms
    const rooms = await Room.insertMany([
      {
        name: 'Lecture Hall A1',
        type: 'classroom',
        capacity: 120,
        building: 'Academic Block A',
        floor: 1,
        amenities: ['Projector', 'Whiteboard', 'AC', 'WiFi', 'Mic System'],
        description: 'Large lecture hall with tiered seating and modern AV equipment.',
        isAvailable: true,
        operatingHoursStart: '07:00',
        operatingHoursEnd: '22:00',
        bufferMinutes: 15,
        requiresApproval: false
      },
      {
        name: 'Seminar Room B2',
        type: 'seminar_hall',
        capacity: 60,
        building: 'Academic Block B',
        floor: 2,
        amenities: ['Projector', 'Whiteboard', 'AC', 'WiFi'],
        description: 'Mid-size seminar hall ideal for workshops and presentations.',
        isAvailable: true,
        operatingHoursStart: '08:00',
        operatingHoursEnd: '21:00',
        bufferMinutes: 10,
        requiresApproval: false
      },
      {
        name: 'Meeting Room C3',
        type: 'meeting_room',
        capacity: 15,
        building: 'Admin Block',
        floor: 3,
        amenities: ['TV Screen', 'Whiteboard', 'AC', 'WiFi', 'Video Conferencing'],
        description: 'Small meeting room with video conferencing capabilities.',
        isAvailable: true,
        operatingHoursStart: '08:00',
        operatingHoursEnd: '20:00',
        bufferMinutes: 5,
        requiresApproval: false
      },
      {
        name: 'Conference Hall D1',
        type: 'conference_room',
        capacity: 200,
        building: 'Convention Center',
        floor: 1,
        amenities: ['Projector', 'Stage', 'AC', 'WiFi', 'Mic System', 'Recording'],
        description: 'Large conference hall for events, conferences, and guest lectures.',
        isAvailable: true,
        operatingHoursStart: '07:00',
        operatingHoursEnd: '22:00',
        bufferMinutes: 30,
        requiresApproval: true,
        internalNotes: 'Requires AV team setup. Contact Facilities at ext. 1234.'
      },
      {
        name: 'Computer Lab E2',
        type: 'lab',
        capacity: 40,
        building: 'Tech Block',
        floor: 2,
        amenities: ['Computers', 'AC', 'WiFi', 'Projector'],
        description: 'Fully-equipped computer lab with 40 workstations.',
        isAvailable: true,
        operatingHoursStart: '08:00',
        operatingHoursEnd: '20:00',
        bufferMinutes: 10,
        requiresApproval: true,
        internalNotes: 'Software licensing managed by IT dept.'
      },
      {
        name: 'Classroom F1',
        type: 'classroom',
        capacity: 50,
        building: 'Academic Block A',
        floor: 1,
        amenities: ['Projector', 'Whiteboard', 'AC'],
        description: 'Standard classroom for regular lectures.',
        isAvailable: true,
        operatingHoursStart: '07:00',
        operatingHoursEnd: '21:00',
        bufferMinutes: 10
      },
      {
        name: 'Board Room G3',
        type: 'meeting_room',
        capacity: 10,
        building: 'Admin Block',
        floor: 3,
        amenities: ['TV Screen', 'AC', 'WiFi', 'Video Conferencing'],
        description: 'Executive board room for small group meetings.',
        isAvailable: true,
        operatingHoursStart: '09:00',
        operatingHoursEnd: '18:00',
        bufferMinutes: 10,
        requiresApproval: true
      },
      {
        name: 'Physics Lab H2',
        type: 'lab',
        capacity: 30,
        building: 'Science Block',
        floor: 2,
        amenities: ['Lab Equipment', 'AC', 'WiFi', 'Projector'],
        description: 'Physics laboratory with experimental setups.',
        isAvailable: false,
        operatingHoursStart: '09:00',
        operatingHoursEnd: '17:00',
        bufferMinutes: 15,
        internalNotes: 'Under maintenance until April 25.'
      },
      {
        name: 'Seminar Room S1',
        type: 'seminar_hall',
        capacity: 80,
        building: 'Academic Block A',
        floor: 2,
        amenities: ['Projector', 'Whiteboard', 'AC', 'WiFi', 'Podium'],
        description: 'Large seminar room with podium and tiered seating.',
        isAvailable: true,
        operatingHoursStart: '07:00',
        operatingHoursEnd: '22:00',
        bufferMinutes: 10
      },
      {
        name: 'Study Room L1',
        type: 'meeting_room',
        capacity: 6,
        building: 'Library Building',
        floor: 1,
        amenities: ['Whiteboard', 'WiFi', 'Power Outlets'],
        description: 'Quiet study room in the library for group study sessions.',
        isAvailable: true,
        operatingHoursStart: '08:00',
        operatingHoursEnd: '22:00',
        bufferMinutes: 5
      },
      {
        name: 'Innovation Lab I3',
        type: 'lab',
        capacity: 25,
        building: 'Tech Block',
        floor: 3,
        amenities: ['3D Printer', 'Computers', 'AC', 'WiFi', 'Projector', 'Soldering Stations'],
        description: 'Maker space with 3D printing and electronics prototyping facilities.',
        isAvailable: true,
        operatingHoursStart: '09:00',
        operatingHoursEnd: '21:00',
        bufferMinutes: 15,
        requiresApproval: true
      },
      {
        name: 'Classroom F2',
        type: 'classroom',
        capacity: 45,
        building: 'Academic Block B',
        floor: 1,
        amenities: ['Projector', 'Whiteboard', 'AC', 'WiFi'],
        description: 'Modern classroom with smart board.',
        isAvailable: true,
        operatingHoursStart: '07:00',
        operatingHoursEnd: '21:00',
        bufferMinutes: 10
      }
    ]);

    console.log(`Created ${rooms.length} rooms`);

    // Create sample bookings
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const day3 = new Date(today);
    day3.setDate(day3.getDate() + 3);
    const day4 = new Date(today);
    day4.setDate(day4.getDate() + 4);

    const bookings = await Booking.insertMany([
      {
        room: rooms[0]._id, user: user1._id,
        title: 'Data Structures Lecture',
        date: tomorrow, startTime: '09:00', endTime: '10:30',
        purpose: 'Regular CS201 lecture',
        status: 'approved', attendeeCount: 85,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[1]._id, user: user1._id,
        title: 'ML Workshop',
        date: tomorrow, startTime: '14:00', endTime: '16:00',
        purpose: 'Machine Learning hands-on workshop for 3rd year students',
        status: 'pending', attendeeCount: 40,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[2]._id, user: admin._id,
        title: 'Faculty Meeting',
        date: dayAfter, startTime: '11:00', endTime: '12:00',
        purpose: 'Monthly faculty review meeting',
        status: 'approved', attendeeCount: 10,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[0]._id, user: faculty._id,
        title: 'Algorithm Design Class',
        date: dayAfter, startTime: '09:00', endTime: '11:00',
        purpose: 'CS401 Advanced Algorithms',
        status: 'approved', attendeeCount: 100,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[3]._id, user: user2._id,
        title: 'Debate Club Semifinals',
        date: day3, startTime: '17:00', endTime: '20:00',
        purpose: 'Annual debate competition semifinals',
        status: 'pending', attendeeCount: 150,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[5]._id, user: user3._id,
        title: 'Study Group - Physics',
        date: tomorrow, startTime: '16:00', endTime: '18:00',
        purpose: 'Final exam prep for PHY201',
        status: 'approved', attendeeCount: 20,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[4]._id, user: faculty._id,
        title: 'Database Lab Session',
        date: dayAfter, startTime: '14:00', endTime: '16:00',
        purpose: 'Hands-on SQL exercises for CS303',
        status: 'approved', attendeeCount: 35,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[8]._id, user: user2._id,
        title: 'Project Presentation Prep',
        date: day3, startTime: '10:00', endTime: '12:00',
        purpose: 'Final year project rehearsal',
        status: 'approved', attendeeCount: 15,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[9]._id, user: user1._id,
        title: 'Group Study - Calculus',
        date: day4, startTime: '09:00', endTime: '11:00',
        purpose: 'Math midterm preparation',
        status: 'approved', attendeeCount: 5,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[6]._id, user: admin._id,
        title: 'Department Head Meeting',
        date: day4, startTime: '10:00', endTime: '11:30',
        purpose: 'Quarterly department heads sync',
        status: 'approved', attendeeCount: 8,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[10]._id, user: user3._id,
        title: 'Robotics Club Workshop',
        date: day3, startTime: '14:00', endTime: '17:00',
        purpose: 'Building autonomous line-follower robots',
        status: 'pending', attendeeCount: 20,
        confirmationCode: generateConfirmationCode()
      },
      {
        room: rooms[0]._id, user: user2._id,
        title: 'Guest Lecture - AI Ethics',
        date: day4, startTime: '14:00', endTime: '16:00',
        purpose: 'Talk by Dr. Priya Sharma on AI Ethics',
        status: 'approved', attendeeCount: 90,
        confirmationCode: generateConfirmationCode()
      },
      // Some cancelled bookings for stats
      {
        room: rooms[1]._id, user: user1._id,
        title: 'Cancelled Study Session',
        date: today, startTime: '10:00', endTime: '12:00',
        purpose: 'Was going to study but exam postponed',
        status: 'cancelled', attendeeCount: 15,
        confirmationCode: generateConfirmationCode(),
        cancelReason: 'Exam postponed to next week'
      },
      {
        room: rooms[2]._id, user: user3._id,
        title: 'Team Sync',
        date: today, startTime: '15:00', endTime: '16:00',
        purpose: 'Weekly team sync',
        status: 'rejected', attendeeCount: 8,
        confirmationCode: generateConfirmationCode(),
        cancelReason: 'Room under maintenance at that time'
      }
    ]);

    console.log(`Created ${bookings.length} sample bookings`);

    // Create sample audit log entries
    await AuditLog.insertMany([
      {
        action: 'USER_REGISTERED',
        performedBy: user1._id,
        targetType: 'user',
        targetId: user1._id,
        details: { name: 'John Student', email: 'john@campus.edu' }
      },
      {
        action: 'BOOKING_CREATED',
        performedBy: user1._id,
        targetType: 'booking',
        targetId: bookings[0]._id,
        details: { room: 'Lecture Hall A1', title: 'Data Structures Lecture' }
      },
      {
        action: 'BOOKING_CREATED',
        performedBy: user2._id,
        targetType: 'booking',
        targetId: bookings[4]._id,
        details: { room: 'Conference Hall D1', title: 'Debate Club Semifinals' }
      },
      {
        action: 'ROOM_CREATED',
        performedBy: admin._id,
        targetType: 'room',
        targetId: rooms[0]._id,
        details: { name: 'Lecture Hall A1', building: 'Academic Block A' }
      },
      {
        action: 'BOOKING_CANCELLED',
        performedBy: user1._id,
        targetType: 'booking',
        targetId: bookings[12]._id,
        details: { reason: 'Exam postponed to next week' }
      }
    ]);

    console.log('Created sample audit logs');
    console.log('\n✅ Seed complete!');
    console.log('\n📋 Seed accounts created:');
    console.log('  admin@campus.edu (admin)');
    console.log('  sarah@campus.edu (faculty)');
    console.log('  john@campus.edu, alice@campus.edu, bob@campus.edu (users)');
    console.log('  carol@campus.edu (staff)');
    console.log('\n🔐 Passwords: Set via SEED_*_PASSWORD environment variables');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
