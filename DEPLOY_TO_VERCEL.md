# 🚀 Deploy to Vercel - Quick Guide

## Option 1: One-Click Deploy (Easiest)
Click this button:
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/ezfnbllc/venueviz-boxofficetech)

## Option 2: Manual Deploy

1. Go to: https://vercel.com
2. Click "Add New..." → "Project"
3. Import Git Repository: `ezfnbllc/venueviz-boxofficetech`
4. Configure Project:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: ./ (leave as is)
   - Build Command: `npm run build`
   - Install Command: `npm install --legacy-peer-deps`

5. Add Environment Variables:
   ```
   NEXTAUTH_SECRET=click-generate-button-in-vercel
   NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
   ```

6. Click "Deploy"

## �� Your App URLs:
- Main: https://venueviz.vercel.app
- Admin: https://venueviz.vercel.app/admin
- Box Office: https://venueviz.vercel.app/box-office
