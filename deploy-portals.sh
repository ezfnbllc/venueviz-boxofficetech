#!/bin/bash

echo "========================================="
echo "VenueViz Deployment Helper"
echo "========================================="
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
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
        fi
        
        echo "Building admin portal..."
        npm run build
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Build successful!"
            echo ""
            echo "Deploy to Vercel with:"
            echo "  cd venueviz-admin"
            echo "  vercel --prod"
            echo ""
            echo "⚠️  Remember: Admin deployments should require manual approval"
        else
            echo "❌ Build failed. Check errors above."
        fi
        ;;
    2)
        echo "Deploying Customer Portal..."
        cd venueviz-customer
        
        # Check if node_modules exists
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies..."
            npm install
        fi
        
        echo "Building customer portal..."
        npm run build
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "✅ Build successful!"
            echo "Auto-deploying to Vercel..."
            vercel --prod
        else
            echo "❌ Build failed. Check errors above."
        fi
        ;;
    3)
        echo "Deploying both portals..."
        echo ""
        echo "========== ADMIN PORTAL =========="
        cd venueviz-admin
        
        if [ ! -d "node_modules" ]; then
            echo "Installing admin dependencies..."
            npm install
        fi
        
        echo "Building admin portal..."
        npm run build
        
        if [ $? -eq 0 ]; then
            echo "✅ Admin build successful"
            echo "Deploy with: vercel --prod"
        else
            echo "❌ Admin build failed"
        fi
        
        echo ""
        echo "========== CUSTOMER PORTAL =========="
        cd ../venueviz-customer
        
        if [ ! -d "node_modules" ]; then
            echo "Installing customer dependencies..."
            npm install
        fi
        
        echo "Building customer portal..."
        npm run build
        
        if [ $? -eq 0 ]; then
            echo "✅ Customer build successful"
            echo "Auto-deploying..."
            vercel --prod
        else
            echo "❌ Customer build failed"
        fi
        ;;
    *)
        echo "Invalid choice"
        ;;
esac
