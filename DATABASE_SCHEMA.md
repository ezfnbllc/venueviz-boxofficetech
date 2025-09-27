# VenueViz Firebase Database Schema

## Database Information
- **Project ID**: venueviz
- **Database**: Default Firestore Database
- **Console URL**: https://console.firebase.google.com/project/venueviz/firestore/databases/-default-

## Collections Schema

### 1. events
- id: string (Auto-generated document ID)
- name: string (Event name)
- description: string (Full event description)
- date: Timestamp (Event date)
- startTime: string (Start time e.g. "18:30")
- gateOpenTime: string (Gate opening time)
- type: string (Event type e.g. "concert")
- venueId: string (Reference to venues collection)
- venueName: string (Venue name denormalized)
- layoutId: string (Reference to layouts collection)
- layoutName: string (Layout name denormalized)
- promoterId: string (Reference to promoters collection)
- promoterName: string (Promoter name denormalized)
- images: string[] (Array of image URLs)
- performers: string[] (Array of performer names)
- promotionIds: string[] (Array of promotion IDs)
- ticketPurchaseUrl: string (External ticket purchase URL)
- allowPromotionStacking: boolean (Allow multiple promotions)
- scrapeUrl: string (Original source URL)
- seo: object (SEO metadata with pageTitle, pageDescription, keywords, urlSlug, structuredData)

### 2. venues
- id: string (Auto-generated document ID)
- name: string (Venue name)
- streetAddress1: string (Primary address)
- streetAddress2: string (Secondary address optional)
- city: string (City)
- state: string (State code e.g. "TX")
- zipCode: string (ZIP code)
- latitude: number (GPS latitude)
- longitude: number (GPS longitude)
- imageUrl: string (Venue image URL)

### 3. orders (Permission restricted)
- id: string (Document ID)
- orderId: string (Order ID)
- customerEmail: string (Customer email)
- customerName: string (Customer full name)
- customerPhone: string (Phone number)
- searchableEmails: string[] (Array for search optimization)
- eventId: string (Reference to events collection)
- eventName: string (Event name denormalized)
- eventDate: string (Event date string)
- tickets: Array of ticket objects with ticketId, seatId, section, row, seat, price, ticketPrice
- paymentMethod: string (Payment method e.g. "PayPal")
- purchaseDate: Timestamp (Purchase timestamp)
- promoterId: string (Promoter ID)

### 4. promotions
- id: string (Auto-generated document ID)
- code: string (Promotion code e.g. "STUDENT20")
- type: string (Type: "percentage" or "fixed")
- value: number (Discount value)
- description: string (Description of promotion)

### 5. seat_status
- id: string (Composite ID: eventId_seatId)
- eventId: string (Reference to events collection)
- seatId: string (Seat identifier)
- status: string (Status: "held", "sold", "available")
- sessionId: string (Session that holds the seat)
- heldUntil: Timestamp (Expiration time for held status)

### 6. layouts (Permission restricted)
- id: string (Layout ID)
- name: string (Layout name)
- sections: Array (Section configuration data)

### 7. promoters (Permission restricted)
- id: string (Promoter ID)
- name: string (Promoter name)

### 8. users (Permission restricted)
- id: string (User ID)
- email: string (User email)

## Key Differences from Original Code
1. Orders use "tickets" array instead of "seats"
2. Orders use "purchaseDate" instead of "createdAt"
3. Events have detailed SEO object and performers array
4. Venues have GPS coordinates and separate address fields
5. Many fields are denormalized for query performance
