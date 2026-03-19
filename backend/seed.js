const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Room = require('./models/Room');
const Booking = require('./models/Booking');

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/campus-booking');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});
    await Booking.deleteMany({});
    console.log('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@campus.edu',
      password: 'admin123',
      role: 'admin'
    });

    // Create regular user
    const user = await User.create({
      name: 'John Student',
      email: 'john@campus.edu',
      password: 'user123',
      role: 'user'
    });

    console.log('Created users:');
    console.log('  Admin: admin@campus.edu / admin123');
    console.log('  User:  john@campus.edu / user123');

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
        isAvailable: true
      },
      {
        name: 'Seminar Room B2',
        type: 'seminar_hall',
        capacity: 60,
        building: 'Academic Block B',
        floor: 2,
        amenities: ['Projector', 'Whiteboard', 'AC', 'WiFi'],
        description: 'Mid-size seminar hall ideal for workshops and presentations.',
        isAvailable: true
      },
      {
        name: 'Meeting Room C3',
        type: 'meeting_room',
        capacity: 15,
        building: 'Admin Block',
        floor: 3,
        amenities: ['TV Screen', 'Whiteboard', 'AC', 'WiFi', 'Video Conferencing'],
        description: 'Small meeting room with video conferencing capabilities.',
        isAvailable: true
      },
      {
        name: 'Conference Hall D1',
        type: 'conference_room',
        capacity: 200,
        building: 'Convention Center',
        floor: 1,
        amenities: ['Projector', 'Stage', 'AC', 'WiFi', 'Mic System', 'Recording'],
        description: 'Large conference hall for events, conferences, and guest lectures.',
        isAvailable: true
      },
      {
        name: 'Computer Lab E2',
        type: 'lab',
        capacity: 40,
        building: 'Tech Block',
        floor: 2,
        amenities: ['Computers', 'AC', 'WiFi', 'Projector'],
        description: 'Fully-equipped computer lab with 40 workstations.',
        isAvailable: true
      },
      {
        name: 'Classroom F1',
        type: 'classroom',
        capacity: 50,
        building: 'Academic Block A',
        floor: 1,
        amenities: ['Projector', 'Whiteboard', 'AC'],
        description: 'Standard classroom for regular lectures.',
        isAvailable: true
      },
      {
        name: 'Board Room G3',
        type: 'meeting_room',
        capacity: 10,
        building: 'Admin Block',
        floor: 3,
        amenities: ['TV Screen', 'AC', 'WiFi', 'Video Conferencing'],
        description: 'Executive board room for small group meetings.',
        isAvailable: true
      },
      {
        name: 'Physics Lab H2',
        type: 'lab',
        capacity: 30,
        building: 'Science Block',
        floor: 2,
        amenities: ['Lab Equipment', 'AC', 'WiFi', 'Projector'],
        description: 'Physics laboratory with experimental setups.',
        isAvailable: false
      }
    ]);

    console.log(`Created ${rooms.length} rooms`);

    // Create sample bookings
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    await Booking.insertMany([
      {
        room: rooms[0]._id,
        user: user._id,
        title: 'Data Structures Lecture',
        date: tomorrow,
        startTime: '09:00',
        endTime: '10:30',
        purpose: 'Regular CS201 lecture',
        status: 'approved'
      },
      {
        room: rooms[1]._id,
        user: user._id,
        title: 'ML Workshop',
        date: tomorrow,
        startTime: '14:00',
        endTime: '16:00',
        purpose: 'Machine Learning hands-on workshop for 3rd year students',
        status: 'pending'
      },
      {
        room: rooms[2]._id,
        user: admin._id,
        title: 'Faculty Meeting',
        date: dayAfter,
        startTime: '11:00',
        endTime: '12:00',
        purpose: 'Monthly faculty review meeting',
        status: 'approved'
      }
    ]);

    console.log('Created 3 sample bookings');
    console.log('\n✅ Seed complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
