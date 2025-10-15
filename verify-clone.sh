#!/bin/bash

echo "🔍 Verifying Clone Project Setup..."
echo ""

# Check folder structure
echo "📁 Checking folder structure..."
if [ -d "backend" ] && [ -d "web" ]; then
  echo "   ✅ Backend and web folders exist"
else
  echo "   ❌ Missing backend or web folders"
  exit 1
fi

# Check package.json files
echo ""
echo "📦 Checking package files..."
if [ -f "backend/package.json" ] && [ -f "web/package.json" ]; then
  echo "   ✅ Package files found"
else
  echo "   ❌ Missing package.json files"
  exit 1
fi

# Check migrations
echo ""
echo "🗄️  Checking database migrations..."
if [ -d "backend/migrations" ]; then
  MIGRATION_COUNT=$(ls backend/migrations/*.sql 2>/dev/null | wc -l)
  echo "   ✅ Found $MIGRATION_COUNT migration files"
else
  echo "   ❌ No migrations folder"
fi

# Check documentation
echo ""
echo "📖 Checking documentation..."
DOC_COUNT=$(ls *.md 2>/dev/null | wc -l)
echo "   ✅ Found $DOC_COUNT documentation files"

# Check git status
echo ""
echo "🔄 Checking git status..."
if [ -d ".git" ]; then
  echo "   ⚠️  Git repository found (should be clean for new project)"
else
  echo "   ✅ No git history (ready for fresh init)"
fi

echo ""
echo "═══════════════════════════════════════"
echo "✅ Clone verification complete!"
echo "═══════════════════════════════════════"
echo ""
echo "📋 Next steps:"
echo "1. Open START-HERE.md"
echo "2. Create GitHub repo"
echo "3. Deploy to Render"
echo ""
echo "Or just tell Cursor AI: 'Help me deploy this clone project'"
