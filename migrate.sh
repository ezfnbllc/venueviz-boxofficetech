#!/bin/bash
set -e

echo "========================================="
echo "VENUEVIZ ARCHITECTURE MIGRATION"
echo "Separating Admin & Customer Portals"
echo "========================================="
echo ""

# Configuration
CURRENT_REPO="https://github.com/ezfnbllc/venueviz-boxofficetech"
ADMIN_REPO="venueviz-admin"
CUSTOMER_REPO="venueviz-customer"
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"

echo "📦 Step 1: Creating backup of current state..."
git clone $CURRENT_REPO $BACKUP_DIR
echo "✅ Backup created in $BACKUP_DIR"
echo ""

echo "📋 Step 2: Creating Admin Portal Repository..."
mkdir -p $ADMIN_REPO
cd $BACKUP_DIR

# Copy admin files
echo "  Copying admin pages..."
mkdir -p ../$ADMIN_REPO/app
cp -r app/admin ../$ADMIN_REPO/app/ 2>/dev/null || true
cp -r app/login ../$ADMIN_REPO/app/ 2>/dev/null || true
cp -r app/api ../$ADMIN_REPO/app/ 2>/dev/null || true

echo "  Copying admin components..."
mkdir -p ../$ADMIN_REPO/components
cp -r components/admin ../$ADMIN_REPO/components/ 2>/dev/null || true
cp components/AdminLayout.tsx ../$ADMIN_REPO/components/ 2>/dev/null || true

echo "  Copying admin libraries..."
mkdir -p ../$ADMIN_REPO/lib
cp -r lib/admin ../$ADMIN_REPO/lib/ 2>/dev/null || true
cp -r lib/firebase.ts ../$ADMIN_REPO/lib/ 2>/dev/null || true
cp -r lib/firebase-admin.ts ../$ADMIN_REPO/lib/ 2>/dev/null || true
cp -r lib/store/eventWizardStore.ts ../$ADMIN_REPO/lib/store/ 2>/dev/null || true
cp -r lib/storage ../$ADMIN_REPO/lib/ 2>/dev/null || true

echo "  Copying configuration files..."
cp package.json ../$ADMIN_REPO/
cp package-lock.json ../$ADMIN_REPO/ 2>/dev/null || true
cp tsconfig.json ../$ADMIN_REPO/
cp next.config.js ../$ADMIN_REPO/
cp tailwind.config.js ../$ADMIN_REPO/
cp postcss.config.js ../$ADMIN_REPO/ 2>/dev/null || true
cp .eslintrc.json ../$ADMIN_REPO/ 2>/dev/null || true
cp -r public ../$ADMIN_REPO/ 2>/dev/null || true

# Create admin-specific files
cd ../$ADMIN_REPO

echo "  Creating admin homepage redirect..."
cat > app/page.tsx << 'EOF'
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/admin')
  }, [router])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-white">Redirecting to admin panel...</div>
    </div>
  )
}
EOF

echo "  Creating admin .env.example..."
cat > .env.example << 'EOF'
# Admin Portal Environment Variables
NEXT_PUBLIC_APP_URL=https://admin.venueviz.com
NEXTAUTH_URL=https://admin.venueviz.com
NEXTAUTH_SECRET=generate-a-secret-here

# Stripe (Admin needs full access)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLIC_KEY=pk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret

# AI Features
ANTHROPIC_API_KEY=sk-ant-your_key

# Firebase Admin SDK (optional)
FIREBASE_ADMIN_PROJECT_ID=venueviz
FIREBASE_ADMIN_CLIENT_EMAIL=your-email
FIREBASE_ADMIN_PRIVATE_KEY=your-key
EOF

echo "  Creating admin README..."
cat > README.md << 'EOF'
# VenueViz Admin Portal

## 🔐 PROTECTED REPOSITORY

This repository contains the admin portal for VenueViz. It is protected and requires approval for all changes.

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Add your environment variables
4. Run `npm install`
5. Run `npm run dev` for development

## Deployment

Deployments to production require manual approval.

```bash
npm run build
vercel --prod
```

## Security

- All changes must be reviewed
- Direct pushes to main are disabled
- Deployment requires approval
EOF

echo "✅ Admin portal created in $ADMIN_REPO"
echo ""

# Create Customer Portal
echo "📋 Step 3: Creating Customer Portal Repository..."
cd ../$BACKUP_DIR
mkdir -p ../$CUSTOMER_REPO

echo "  Copying customer pages..."
mkdir -p ../$CUSTOMER_REPO/app
cp app/page.tsx ../$CUSTOMER_REPO/app/ 2>/dev/null || true
cp -r app/events ../$CUSTOMER_REPO/app/ 2>/dev/null || true
cp -r app/box-office ../$CUSTOMER_REPO/app/ 2>/dev/null || true
cp -r app/checkout ../$CUSTOMER_REPO/app/ 2>/dev/null || true
cp -r app/confirmation ../$CUSTOMER_REPO/app/ 2>/dev/null || true
cp app/layout.tsx ../$CUSTOMER_REPO/app/ 2>/dev/null || true
cp app/globals.css ../$CUSTOMER_REPO/app/ 2>/dev/null || true

echo "  Copying customer components..."
mkdir -p ../$CUSTOMER_REPO/components
cp -r components/layout ../$CUSTOMER_REPO/components/ 2>/dev/null || true
cp components/SeatSelector.tsx ../$CUSTOMER_REPO/components/ 2>/dev/null || true
cp components/GeneralAdmissionSelector.tsx ../$CUSTOMER_REPO/components/ 2>/dev/null || true
cp components/EventCard.tsx ../$CUSTOMER_REPO/components/ 2>/dev/null || true

echo "  Copying customer libraries..."
mkdir -p ../$CUSTOMER_REPO/lib
cp lib/firebase.ts ../$CUSTOMER_REPO/lib/
mkdir -p ../$CUSTOMER_REPO/lib/stores
cp lib/stores/cartStore.ts ../$CUSTOMER_REPO/lib/stores/ 2>/dev/null || true
cp lib/stores/useStore.ts ../$CUSTOMER_REPO/lib/stores/ 2>/dev/null || true

echo "  Copying configuration files..."
cp package.json ../$CUSTOMER_REPO/
cp package-lock.json ../$CUSTOMER_REPO/ 2>/dev/null || true
cp tsconfig.json ../$CUSTOMER_REPO/
cp next.config.js ../$CUSTOMER_REPO/
cp tailwind.config.js ../$CUSTOMER_REPO/
cp postcss.config.js ../$CUSTOMER_REPO/ 2>/dev/null || true
cp .eslintrc.json ../$CUSTOMER_REPO/ 2>/dev/null || true
cp -r public ../$CUSTOMER_REPO/ 2>/dev/null || true

# Create customer-specific files
cd ../$CUSTOMER_REPO

echo "  Creating customer .env.example..."
cat > .env.example << 'EOF'
# Customer Portal Environment Variables
NEXT_PUBLIC_APP_URL=https://www.venueviz.com

# Stripe (Public key only for customer)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your_key

# Optional Analytics
NEXT_PUBLIC_GA_ID=G-YOUR-ID
EOF

echo "  Creating customer README..."
cat > README.md << 'EOF'
# VenueViz Customer Portal

## 🎯 Customer-Facing Application

This repository contains the customer portal for VenueViz. It includes:
- Event browsing
- Seat selection
- Checkout flow
- Order confirmation

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env.local`
3. Add your environment variables
4. Run `npm install`
5. Run `npm run dev` for development

## Deployment

Auto-deploys on push to main branch.

```bash
npm run build
git push origin main
```

## Development

Create feature branches for new work:

```bash
git checkout -b feature/your-feature
# Make changes
git push origin feature/your-feature
# Create PR for review
```
EOF

# Create admin data service for customer portal
echo "  Creating read-only admin service for customer..."
cat > lib/admin/adminService.ts << 'EOF'
// Read-only service for customer portal
import { db } from '@/lib/firebase'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'

export class AdminService {
  // Read-only methods for customer portal
  static async getEvent(eventId: string) {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId))
      if (eventDoc.exists()) {
        return { id: eventDoc.id, ...eventDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching event:', error)
      return null
    }
  }

  static async getActiveEvents() {
    try {
      const eventsRef = collection(db, 'events')
      const q = query(eventsRef, where('status', 'in', ['active', 'published']))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    } catch (error) {
      console.error('Error fetching events:', error)
      return []
    }
  }

  static async getLayout(layoutId: string) {
    try {
      const layoutDoc = await getDoc(doc(db, 'layouts', layoutId))
      if (layoutDoc.exists()) {
        return { id: layoutDoc.id, ...layoutDoc.data() }
      }
      return null
    } catch (error) {
      console.error('Error fetching layout:', error)
      return null
    }
  }
}
EOF

echo "✅ Customer portal created in $CUSTOMER_REPO"
echo ""

cd ..

# Initialize Git repositories
echo "📋 Step 4: Initializing Git repositories..."

# Admin repo
cd $ADMIN_REPO
git init
git add .
git commit -m "Initial commit: Admin portal isolated from main application

- Complete admin functionality preserved
- All event management features
- Venue management
- Order management
- Protected repository structure"

echo "✅ Admin repository initialized"

# Customer repo
cd ../$CUSTOMER_REPO
git init
git add .
git commit -m "Initial commit: Customer portal separated from admin

- Event browsing and discovery
- Seat selection (GA and reserved)
- Checkout flow
- Order confirmation
- Public-facing features only"

echo "✅ Customer repository initialized"

cd ..

# Create deployment script
echo ""
echo "📋 Step 5: Creating deployment helper..."

cat > deploy.sh << 'EOF'
#!/bin/bash

echo "VenueViz Deployment Helper"
echo ""
echo "Which portal do you want to deploy?"
echo "1) Admin Portal (Protected)"
echo "2) Customer Portal"
echo "3) Both"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo "Deploying Admin Portal..."
        cd venueviz-admin
        npm install
        npm run build
        if [ $? -eq 0 ]; then
            echo "Build successful. Deploy with: vercel --prod"
            echo "Remember: Admin deployments require manual approval"
        fi
        ;;
    2)
        echo "Deploying Customer Portal..."
        cd venueviz-customer
        npm install
        npm run build
        if [ $? -eq 0 ]; then
            vercel --prod
        fi
        ;;
    3)
        echo "Deploying both portals..."
        echo "Admin first..."
        cd venueviz-admin
        npm install
        npm run build
        if [ $? -eq 0 ]; then
            echo "Admin build successful. Deploy with: vercel --prod"
        fi
        
        echo "Customer portal..."
        cd ../venueviz-customer
        npm install
        npm run build
        if [ $? -eq 0 ]; then
            vercel --prod
        fi
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
EOF

chmod +x deploy.sh

echo ""
echo "========================================="
echo "✅ MIGRATION COMPLETE!"
echo "========================================="
echo ""
echo "📁 Created Structure:"
echo "  • $BACKUP_DIR/ (Full backup)"
echo "  • $ADMIN_REPO/ (Admin portal)"
echo "  • $CUSTOMER_REPO/ (Customer portal)"
echo "  • deploy.sh (Deployment helper)"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Create GitHub repositories:"
echo "    https://github.com/new → Create 'venueviz-admin'"
echo "    https://github.com/new → Create 'venueviz-customer'"
echo ""
echo "2️⃣  Push Admin Portal (Protected):"
echo "    cd $ADMIN_REPO"
echo "    git remote add origin https://github.com/ezfnbllc/venueviz-admin"
echo "    git push -u origin main"
echo ""
echo "3️⃣  Push Customer Portal:"
echo "    cd $CUSTOMER_REPO"
echo "    git remote add origin https://github.com/ezfnbllc/venueviz-customer"
echo "    git push -u origin main"
echo ""
echo "4️⃣  Deploy to Vercel:"
echo "    ./deploy.sh"
echo ""
echo "5️⃣  Configure domains in Vercel:"
echo "    Admin: admin.venueviz.com"
echo "    Customer: www.venueviz.com"
echo ""
echo "🔒 Security Setup:"
echo "  • Enable branch protection on venueviz-admin"
echo "  • Require PR reviews for admin changes"
echo "  • Set deployment approval for admin"
echo ""
echo "✨ Benefits:"
echo "  • Admin panel is now completely isolated"
echo "  • No more accidental breaks from frontend work"
echo "  • Independent deployment cycles"
echo "  • Better security and access control"
echo ""