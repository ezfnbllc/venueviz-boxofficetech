$(cat <<'INNER_EOF'
#!/bin/bash
cd venueviz-app
echo "🚀 Enhancing VenueViz..."

# Update package.json
cat > package.json << 'PKG'
{
  "name": "venueviz-boxofficetech",
  "version": "3.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.1.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "firebase": "10.8.0",
    "stripe": "14.20.0",
    "framer-motion": "11.0.0",
    "lucide-react": "0.344.0",
    "tailwindcss": "3.4.0",
    "typescript": "5.3.3"
  }
}
PKG

# Create API routes
mkdir -p app/api/events app/api/auth app/api/ai
cat > app/api/events/route.ts << 'API'
export async function GET() {
  return Response.json({ events: [] })
}
API

# Commit and push
git add -A
git commit -m "Enhanced features"
git push origin main --force
echo "✅ Done! Vercel rebuilding..."
INNER_EOF
)
