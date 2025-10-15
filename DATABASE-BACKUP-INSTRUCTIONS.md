# 🗄️ Database Backup & Restore Instructions

## Overview

You need to backup the original database and restore it to your new database.

---

## STEP 1: Create Backup from Original Database

### Option A: Via Render Dashboard (Easiest)

1. **Go to original database:**
   https://dashboard.render.com/d/dpg-d38t51ruibrs73a3c3m0-a

2. **Click "Backups" tab**

3. **Click "Create Manual Backup"**

4. **Wait for backup to complete** (1-5 minutes)

5. **Download backup file**
   - Click the download icon next to the backup
   - Save as: `xsourcing_backup.sql`

---

### Option B: Via Render Shell (Original Backend)

1. **SSH to original backend:**
   https://dashboard.render.com/web/srv-d38tncur433s73frbr00
   
2. **Click "Shell" tab**

3. **Run backup command:**
```bash
pg_dump --no-owner --no-acl --clean --if-exists $DATABASE_URL > /tmp/backup.sql
cat /tmp/backup.sql
```

4. **Copy all output** and save to local file: `xsourcing_backup.sql`

---

### Option C: Using Provided Script

1. **SSH to original backend shell**

2. **Run:**
```bash
cd /opt/render/project/src
chmod +x RENDER-DB-BACKUP.sh
./RENDER-DB-BACKUP.sh
```

3. **Download the generated file**

---

## STEP 2: Restore to New Database

### Via New Backend Render Shell (Recommended)

1. **Upload backup file to new backend:**
   - Option 1: Copy/paste SQL contents
   - Option 2: Clone repo (backup file will be there)

2. **SSH to new backend service**

3. **Run restore:**
```bash
# If you have the backup file in the project:
psql $DATABASE_URL < /path/to/backup.sql

# Or if you have SQL content copied:
psql $DATABASE_URL << 'EOF'
[paste all SQL content here]
EOF
```

### Via Local Machine (Alternative)

If you have PostgreSQL installed locally:

```bash
# Get the EXTERNAL connection string from new Render database
# Then restore:
psql "postgresql://user:pass@host:5432/dbname" < xsourcing_backup.sql
```

---

## STEP 3: Run Additional Migrations

After restoring, run the roadmap v2 migration:

```bash
# In new backend Render shell:
cd backend && node << 'EOF'
const {Pool} = require('pg');
const fs = require('fs');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: false}
});
const sql = fs.readFileSync('migrations/update_roadmap_tables_v2.sql', 'utf8');
pool.query(sql)
  .then(() => {
    console.log('Roadmap v2 migration complete!');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
EOF
```

---

## 🎯 What Gets Copied

The backup includes:
- ✅ All table schemas
- ✅ All user accounts
- ✅ All projects
- ✅ All ideas
- ✅ All messages
- ✅ All files metadata
- ✅ All settings
- ✅ Email templates
- ✅ Webinars

**Note:** Actual uploaded files (PDFs, images) are stored in Render's filesystem, not database. You'll need to manually copy those if needed.

---

## ⚠️ Important Notes

**Data Privacy:**
- The backup contains real user data
- Store backup file securely
- Don't commit backup to GitHub
- Delete backup after successful restore

**Database Size:**
- Check current database size first
- Ensure new database plan can handle it
- basic_1gb should be sufficient for most cases

**Connection Strings:**
- Always use INTERNAL URLs when possible (faster, more secure)
- External URLs work but are slower
- Format: `postgresql://user:password@host:5432/dbname`

---

## ✅ Verification After Restore

Run these queries in your NEW database to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check user count
SELECT COUNT(*) FROM users;

-- Check project count
SELECT COUNT(*) FROM projects;

-- Check roadmap tables
SELECT COUNT(*) FROM ai_roadmap_configs;
SELECT COUNT(*) FROM roadmap_nodes;
```

Expected results should match your original database!

---

## 🆘 Troubleshooting

**Backup too large?**
- Render free tier has limits
- Use basic_1gb or higher plan
- Compress backup: `gzip backup.sql`

**Restore fails with "permission denied"?**
- Use `--no-owner --no-acl` flags in pg_dump
- Remove ownership statements from SQL

**Missing tables after restore?**
- Check for error messages in restore output
- Run migrations manually
- Verify PostgreSQL versions match (both v16)

**Need help?** Ask me in Cursor:
- "Help me backup the database"
- "Restore is failing with error: [paste error]"
- "Verify my database was restored correctly"

