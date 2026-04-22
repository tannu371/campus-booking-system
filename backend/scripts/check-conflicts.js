#!/usr/bin/env node

/**
 * Pre-migration conflict checker
 * 
 * Run this script before deploying the concurrency fix to identify
 * any existing double-bookings in your database.
 * 
 * Usage:
 *   node scripts/check-conflicts.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const checkConflicts = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-booking';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    
    // Check for duplicate bookings (same room, date, startTime with active status)
    console.log('🔍 Checking for existing conflicts...\n');
    
    const conflicts = await db.collection('bookings').aggregate([
      {
        $match: {
          status: { $in: ['approved', 'pending'] }
        }
      },
      {
        $group: {
          _id: {
            room: '$room',
            date: '$date',
            startTime: '$startTime'
          },
          count: { $sum: 1 },
          bookings: {
            $push: {
              id: '$_id',
              title: '$title',
              user: '$user',
              status: '$status',
              date: '$date',
              startTime: '$startTime',
              endTime: '$endTime'
            }
          }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { '_id.date': 1, '_id.startTime': 1 }
      }
    ]).toArray();

    if (conflicts.length === 0) {
      console.log('✅ No conflicts found! Safe to deploy.\n');
      console.log('The unique index will prevent future double-bookings.');
    } else {
      console.log(`⚠️  Found ${conflicts.length} conflict(s):\n`);
      
      for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i];
        console.log(`Conflict ${i + 1}:`);
        console.log(`  Room ID: ${conflict._id.room}`);
        console.log(`  Date: ${new Date(conflict._id.date).toISOString().split('T')[0]}`);
        console.log(`  Start Time: ${conflict._id.startTime}`);
        console.log(`  Duplicate bookings: ${conflict.count}`);
        console.log(`  Booking IDs:`);
        
        conflict.bookings.forEach((booking, idx) => {
          console.log(`    ${idx + 1}. ${booking.id} - "${booking.title}" (${booking.status})`);
          console.log(`       Time: ${booking.startTime} - ${booking.endTime}`);
        });
        console.log('');
      }

      console.log('⚠️  ACTION REQUIRED:');
      console.log('   1. Review the conflicts above');
      console.log('   2. Manually resolve by cancelling or rescheduling duplicate bookings');
      console.log('   3. Re-run this script to verify all conflicts are resolved');
      console.log('   4. Then deploy the new code with unique index\n');
      
      console.log('💡 TIP: You can cancel bookings via the admin dashboard or MongoDB shell:');
      console.log('   db.bookings.updateOne(');
      console.log('     { _id: ObjectId("BOOKING_ID") },');
      console.log('     { $set: { status: "cancelled", cancelReason: "Duplicate booking cleanup" } }');
      console.log('   )\n');
    }

    // Check if unique index already exists
    const indexes = await db.collection('bookings').indexes();
    const hasUniqueIndex = indexes.some(idx => 
      idx.name === 'unique_room_date_startTime_active'
    );

    if (hasUniqueIndex) {
      console.log('✅ Unique index already exists');
    } else {
      console.log('ℹ️  Unique index not yet created (will be created on next server start)');
    }

    await mongoose.disconnect();
    process.exit(conflicts.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

checkConflicts();
