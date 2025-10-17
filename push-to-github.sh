#!/bin/bash

echo "========================================="
echo "Push to GitHub Helper"
echo "========================================="
echo ""

# Check if repos exist on GitHub first
echo "⚠️  Before running this script, ensure you've created these repos on GitHub:"
echo "   1. https://github.com/new → Create 'venueviz-admin'"
echo "   2. https://github.com/new → Create 'venueviz-customer'"
echo ""
read -p "Have you created both repositories on GitHub? (y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "Please create the repositories first, then run this script again."
    exit 1
fi

echo ""
echo "Pushing Admin Portal to GitHub..."
cd venueviz-admin
git remote add origin https://github.com/ezfnbllc/venueviz-admin.git 2>/dev/null || true
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Admin portal pushed successfully"
else
    echo "❌ Failed to push admin portal. Check if the repository exists."
fi

echo ""
echo "Pushing Customer Portal to GitHub..."
cd ../venueviz-customer
git remote add origin https://github.com/ezfnbllc/venueviz-customer.git 2>/dev/null || true
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ Customer portal pushed successfully"
else
    echo "❌ Failed to push customer portal. Check if the repository exists."
fi

echo ""
echo "✅ Both repositories pushed to GitHub!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com/new"
echo "2. Import both repositories"
echo "3. Configure domains:"
echo "   - Admin: admin.venueviz.com"
echo "   - Customer: www.venueviz.com"
