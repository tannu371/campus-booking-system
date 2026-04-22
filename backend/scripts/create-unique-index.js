#!/usr/bin/env node

/**
 * Manually create the unique index for multi-instance safety
 * 
 * This script creates the partial unique index that prevents double-booking
 * across multiple server instances.
 * 
 * Usage:
 *   node scripts/create-unique-index.js
 * 
 * Prerequisites:
 *   - Run check-conflicts.js first to ensure no existing conflicts
 *   - MongoDB 4.0+ (for transaction support)
 *   - Replica set or sharded cluster (for production)
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const createIndex = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/campus-booking';
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('bookings');

    // Check if index already exists
    const existingIndexes = await collection.indexes();
    const indexExists = existingIndexes.some(idx => 
      idx.name === 'unique_room_date_startTime_active'
    );

    if (indexExists) {
      console.log('ℹ️  Index "unique_room_date_startTime_active" already exists');
      console.log('   No action needed.\n');
      
      // Show index details
      const index = existingIndexes.find(idx => 
        idx.name === 'unique_room_date_startTime_active'
      );
      console.log('Index details:');
      console.log(JSON.stringify(index, null, 2));
    } else {
      console.log('🔨 Creating unique index...\n');
      
      await collection.createIndex(
        { room: 1, date: 1, startTime: 1 },
        {
          unique: true,
          partialFilterExpression: {
            status: { $in: ['approved', 'pending'] }
          },
          name: 'unique_room_date_startTime_active'
        }
      );

      console.log('✅ Index created successfully!\n');
      console.log('Index: unique_room_date_startTime_active');
      console.log('Keys: { room: 1, date: 1, startTime: 1 }');
      console.log('Partial filter: status in ["approved", "pending"]');
      console.log('\nThis index will prevent double-booking across all server instances.');
    }

    // Verify MongoDB version and replica set status
    console.log('\n📊 MongoDB Configuration:');
    const adminDb = db.admin();
    const serverInfo = await adminDb.serverInfo();
    console.log(`   Version: ${serverInfo.version}`);
    
    const serverStatus = await adminDb.serverStatus();
    const isReplicaSet = serverStatus.repl && serverStatus.repl.setName;
    
    if (isReplicaSet) {
      console.log(`   Replica Set: ${serverStatus.repl.setName} ✅`);
      console.log('   Transactions: Supported ✅');
    } else {
      console.log('   Replica Set: Not configured ⚠️');
      console.log('   Transactions: Limited (standalone mode)');
      console.log('\n⚠️  WARNING: For production deployments, use a replica set!');
      console.log('   Transactions require MongoDB replica set or sharded cluster.');
      console.log('   See CONCURRENCY.md for setup instructions.');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 11000) {
      console.error('\n⚠️  Duplicate key error detected!');
      console.error('   This means you have existing conflicting bookings.');
      console.error('   Run: node scripts/check-conflicts.js');
      console.error('   Then resolve conflicts before creating the index.');
    }
    
    process.exit(1);
  }
};

createIndex();
