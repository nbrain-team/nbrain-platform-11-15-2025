#!/bin/bash

# Run the roadmap migration via the admin API endpoint
# This script will call the migration endpoint once the backend is deployed

echo "🚀 Running AI Roadmap Database Migration..."
echo ""

# Get admin token (you'll need to replace this with an actual admin token)
ADMIN_TOKEN=$(node -e "
const token = '$1';
if (!token || token === 'undefined') {
  console.log('Please provide admin token as argument');
  process.exit(1);
}
console.log(token);
")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: Admin token required"
  echo "Usage: ./run-migration-api.sh <admin_token>"
  exit 1
fi

# Call the migration endpoint
RESPONSE=$(curl -s -X POST \
  https://x-sourcing-backend.onrender.com/admin/run-roadmap-migration \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json")

echo "Response from server:"
echo "$RESPONSE" | python3 -m json.tool

# Check if migration was successful
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo ""
  echo "✅ Migration completed successfully!"
  exit 0
else
  echo ""
  echo "❌ Migration failed. Please check the error above."
  exit 1
fi

