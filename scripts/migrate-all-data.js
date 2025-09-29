#!/usr/bin/env node

// Firebase Admin SDK migration script
// Run with: node scripts/migrate-all-data.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
// You'll need to download your service account key from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://venueviz.firebaseio.com'
});

const db = admin.firestore();

async function migrateData() {
  console.log('Starting migration...\n');

  // Migrate Events
  console.log('=== Migrating Events ===');
  try {
    const eventsSnapshot = await db.collection('events').get();
    let eventCount = 0;
    
    for (const doc of eventsSnapshot.docs) {
      const data = doc.data();
      const updates = {};
      
      // Check if event needs migration
      if (data.date && !data.schedule) {
        updates.schedule = {
          date: data.date,
          doorsOpen: data.gateOpenTime || data.doorsOpen || '',
          startTime: data.startTime || data.time || '',
          endTime: data.endTime || '',
          timezone: 'America/Chicago'
        };
      }
      
      // Ensure required fields exist
      if (!data.venueId) updates.venueId = '';
      if (!data.venueName) updates.venueName = data.venue || '';
      if (!data.layoutId) updates.layoutId = '';
      if (!data.status) updates.status = 'published';
      if (!data.pricing) updates.pricing = [];
      if (!data.analytics) {
        updates.analytics = {
          views: 0,
          ticketsSold: 0,
          revenue: 0,
          lastUpdated: admin.firestore.Timestamp.now()
        };
      }
      
      // Update if there are changes
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✓ Migrated event: ${data.name || doc.id}`);
        eventCount++;
      }
    }
    console.log(`Migrated ${eventCount} events\n`);
  } catch (error) {
    console.error('Error migrating events:', error);
  }

  // Migrate Orders
  console.log('=== Migrating Orders ===');
  try {
    const ordersSnapshot = await db.collection('orders').get();
    let orderCount = 0;
    
    for (const doc of ordersSnapshot.docs) {
      const data = doc.data();
      const updates = {};
      
      // Standardize pricing structure
      if (!data.pricing) {
        const total = data.totalAmount || data.total || 
          (data.tickets || []).reduce((sum, ticket) => {
            return sum + (ticket.price || ticket.ticketPrice || 0);
          }, 0);
        
        updates.pricing = {
          subtotal: total,
          fees: 0,
          tax: 0,
          discount: 0,
          total: total,
          currency: 'USD'
        };
      }
      
      // Ensure status exists
      if (!data.status) {
        if (data.paymentStatus === 'paid') {
          updates.status = 'confirmed';
        } else {
          updates.status = data.paymentStatus || 'pending';
        }
      }
      
      // Ensure payment structure
      if (!data.payment) {
        updates.payment = {
          method: data.paymentMethod || 'credit_card',
          status: data.paymentStatus || 'pending',
          transactionId: data.transactionId || '',
          processor: data.paymentProcessor || '',
          processedAt: data.purchaseDate || admin.firestore.Timestamp.now()
        };
      }
      
      // Update if there are changes
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✓ Migrated order: ${data.orderId || doc.id}`);
        orderCount++;
      }
    }
    console.log(`Migrated ${orderCount} orders\n`);
  } catch (error) {
    console.error('Error migrating orders:', error);
  }

  // Migrate Venues
  console.log('=== Checking Venues ===');
  try {
    const venuesSnapshot = await db.collection('venues').get();
    let venueCount = 0;
    
    for (const doc of venuesSnapshot.docs) {
      const data = doc.data();
      const updates = {};
      
      // Ensure address structure
      if (!data.address && (data.streetAddress1 || data.city)) {
        updates.address = {
          street: data.streetAddress1 || '',
          city: data.city || 'Dallas',
          state: data.state || 'TX',
          zip: data.zipCode || '',
          country: 'USA',
          coordinates: {
            lat: data.latitude || 32.7767,
            lng: data.longitude || -96.7970
          }
        };
      }
      
      // Ensure capacity
      if (!data.capacity) updates.capacity = 1000;
      if (!data.type) updates.type = 'theater';
      
      // Update if there are changes
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✓ Updated venue: ${data.name || doc.id}`);
        venueCount++;
      }
    }
    console.log(`Updated ${venueCount} venues\n`);
  } catch (error) {
    console.error('Error checking venues:', error);
  }

  // Check Promotions
  console.log('=== Checking Promotions ===');
  try {
    const promotionsSnapshot = await db.collection('promotions').get();
    let promotionCount = 0;
    
    for (const doc of promotionsSnapshot.docs) {
      const data = doc.data();
      const updates = {};
      
      // Ensure required fields
      if (!data.type) updates.type = 'percentage';
      if (!data.value) updates.value = 10;
      if (!data.maxUses) updates.maxUses = 100;
      if (data.usedCount === undefined) updates.usedCount = 0;
      if (data.active === undefined) updates.active = true;
      if (!data.minPurchase) updates.minPurchase = 0;
      
      // Update if there are changes
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        console.log(`✓ Updated promotion: ${data.code || doc.id}`);
        promotionCount++;
      }
    }
    console.log(`Updated ${promotionCount} promotions\n`);
  } catch (error) {
    console.error('Error checking promotions:', error);
  }

  // Check Promoters
  console.log('=== Checking Promoters ===');
  try {
    const promotersSnapshot = await db.collection('promoters').get();
    console.log(`Found ${promotersSnapshot.size} promoters\n`);
  } catch (error) {
    console.error('Error checking promoters:', error);
  }

  console.log('Migration complete!');
  process.exit(0);
}

migrateData().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
