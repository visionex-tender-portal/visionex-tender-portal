#!/bin/bash
# Quick deployment helper

echo "🚀 Visionex Tender Portal - Deployment Helper"
echo ""

# Check if git remote exists
if git remote get-url origin &> /dev/null; then
    echo "✅ Git remote exists"
    REMOTE=$(git remote get-url origin)
    echo "   Remote: $REMOTE"
else
    echo "❌ No git remote configured"
    echo ""
    echo "Steps to deploy:"
    echo "1. Create repo on GitHub: https://github.com/new"
    echo "2. Name it: visionex-tender-portal"
    echo "3. Run these commands:"
    echo ""
    echo "   git remote add origin https://github.com/YOUR_USERNAME/visionex-tender-portal.git"
    echo "   git push -u origin master"
    echo ""
    echo "4. Deploy to Railway: https://railway.app"
    echo "   - New Project → Deploy from GitHub → Select repo"
    exit 1
fi

echo ""
echo "Ready to deploy!"
echo ""
echo "Option 1 - Railway (Recommended):"
echo "  1. Go to https://railway.app"
echo "  2. Connect GitHub account"
echo "  3. New Project → Deploy from GitHub"
echo "  4. Select: visionex-tender-portal"
echo "  5. Done! Live in 2 minutes"
echo ""
echo "Option 2 - Render:"
echo "  1. Go to https://render.com"
echo "  2. New Web Service"
echo "  3. Connect GitHub repo"
echo "  4. Deploy"
echo ""
echo "After deployment, your app will be live at:"
echo "  Railway: visionex-tender-portal.up.railway.app"
echo "  Render:  visionex-tender-portal.onrender.com"
