#!/bin/bash

echo "🚀 Starting KSEB Room Management deployment..."

# stop on error
set -e

echo "📦 Installing backend dependencies..."
cd backend
npm install
npm run build
cd ..

echo "📦 Installing frontend dependencies..."
cd frontend
npm install
npm run build
cd ..

echo "🧹 Cleaning git cache..."
git add .

echo "📝 Committing changes..."
git commit -m "Auto deploy $(date)" || echo "No changes to commit"

echo "⬆️ Pushing to GitHub..."
git push origin main

echo "🌐 Deployment triggered!"
echo ""
echo "Render backend:"
echo "https://kseb-room-management.onrender.com/api/health"
echo ""
echo "Vercel frontend:"
echo "https://kseb-room-management.vercel.app"
echo ""
echo "✅ Done!"
