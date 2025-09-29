const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://venueviz.firebaseio.com'
});

const db = admin.firestore();

async function migrateCustomers() {
  console.log('Creating customers from orders...');
  
  const ordersSnapshot = await db.collection('orders').get();
  const customerMap = {};
  
  // Build unique customers from orders
  ordersSnapshot.docs.forEach(doc => {
    const order = doc.data();
    if (order.customerEmail) {
      if (!customerMap[order.customerEmail]) {
        customerMap[order.customerEmail] = {
          email: order.customerEmail,
          name: order.customerName || '',
          phone: order.customerPhone || '',
          totalOrders: 0,
          totalSpent: 0,
          firstOrderDate: order.createdAt || order.purchaseDate,
          lastOrderDate: order.createdAt || order.purchaseDate
        };
      }
      
      customerMap[order.customerEmail].totalOrders++;
      const amount = order.pricing?.total || order.totalAmount || order.total || 0;
      customerMap[order.customerEmail].totalSpent += amount;
      
      // Update dates
      const orderDate = order.createdAt || order.purchaseDate;
      if (orderDate && orderDate < customerMap[order.customerEmail].firstOrderDate) {
        customerMap[order.customerEmail].firstOrderDate = orderDate;
      }
      if (orderDate && orderDate > customerMap[order.customerEmail].lastOrderDate) {
        customerMap[order.customerEmail].lastOrderDate = orderDate;
      }
    }
  });
  
  // Create customer documents
  for (const [email, data] of Object.entries(customerMap)) {
    await db.collection('customers').doc(email.replace('@', '_at_')).set({
      ...data,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`Created customer: ${email}`);
  }
  
  console.log(`Created ${Object.keys(customerMap).length} customers`);
  process.exit(0);
}

migrateCustomers().catch(console.error);
