#!/bin/bash

# Database Backup Script for X-Sourcing
# Run this from Render Shell to create a backup

echo "🗄️  Creating database backup..."
echo ""

# Create backup with clean format (no ownership, easier to restore)
pg_dump \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=plain \
  $DATABASE_URL > xsourcing_backup_$(date +%Y%m%d_%H%M%S).sql

if [ $? -eq 0 ]; then
  echo "✅ Backup created successfully!"
  echo ""
  ls -lh xsourcing_backup_*.sql
  echo ""
  echo "To download this backup:"
  echo "1. The file is in your Render shell's current directory"
  echo "2. You can cat the file and copy contents, or"
  echo "3. Use Render's dashboard to access files"
else
  echo "❌ Backup failed!"
  exit 1
fi

