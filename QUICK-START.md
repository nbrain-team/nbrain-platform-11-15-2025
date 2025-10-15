# ⚡ QUICK START - Clone Project Deployment

**Time to complete:** 15-20 minutes

---

## 🎯 Your Mission

Deploy this cloned platform as a completely independent project with its own:
- GitHub repository
- Render services (backend, frontend, database)
- All features and data from the original

---

## 📋 Checklist (Do in Order)

### ✅ Before You Start
- [ ] You have this folder open in a **NEW Cursor window**
- [ ] Original project still open in another Cursor window
- [ ] You're logged into GitHub
- [ ] You're logged into Render

---

### 1️⃣ GitHub Setup (5 minutes)

**Create new repo:** https://github.com/new

```bash
# In THIS Cursor project terminal:
git init
git add .
git commit -m "Initial commit - AI Platform"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-NEW-REPO.git
git push -u origin main
```

✅ **Checkpoint:** Code is now on GitHub

---

### 2️⃣ Database Backup (5 minutes)

**In original backend Render shell:**

https://dashboard.render.com/web/srv-d38tncur433s73frbr00 → Shell tab

```bash
pg_dump --no-owner --no-acl --clean --if-exists \
  $DATABASE_URL > /tmp/backup.sql

# Then show the backup
cat /tmp/backup.sql
```

**Copy all output** and save to your computer as: `backup.sql`

✅ **Checkpoint:** You have backup.sql file

---

### 3️⃣ Create New Render Database (2 minutes)

**Tell me in Cursor:**
```
Create a new PostgreSQL database named "my-platform-db" 
with plan "basic_1gb" in Oregon
```

**OR create manually** at: https://dashboard.render.com/ → New + → PostgreSQL

✅ **Checkpoint:** New database created, you have connection URL

---

### 4️⃣ Restore Database (3 minutes)

**In NEW database shell** (click Connect in Render dashboard):

```bash
# Paste your backup.sql contents or:
psql $DATABASE_URL < backup.sql
```

✅ **Checkpoint:** Database has all your data

---

### 5️⃣ Create Backend Service (5 minutes)

**Tell me in Cursor:**
```
Create backend Render service using repo: [your-new-repo-url]
```

**OR manually:**
- Name: `my-platform-backend`
- Repo: Your new GitHub repo
- Build: `cd backend && npm ci`
- Start: `cd backend && npm start`
- Env vars: See `ENV-TEMPLATES.md`

✅ **Checkpoint:** Backend deployed and running

---

### 6️⃣ Create Frontend Service (5 minutes)

**Tell me in Cursor:**
```
Create frontend Render service using repo: [your-new-repo-url]
```

**OR manually:**
- Name: `my-platform-frontend`
- Root: `web`
- Build: `npm install && npm run build`
- Start: `npm start`
- Env: `NEXT_PUBLIC_API_BASE_URL=https://your-new-backend.onrender.com`

✅ **Checkpoint:** Frontend deployed and running

---

### 7️⃣ Run Migrations (2 minutes)

**In NEW backend Render shell:**

```bash
cd backend && node << 'EOF'
const {Pool} = require('pg');
const fs = require('fs');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: false}
});
const sql = fs.readFileSync('migrations/update_roadmap_tables_v2.sql', 'utf8');
pool.query(sql).then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
EOF
```

✅ **Checkpoint:** All database tables updated

---

### 8️⃣ Test Your New Platform! (2 minutes)

1. Go to your new frontend URL
2. Login with existing credentials
3. Check:
   - [ ] Projects page loads
   - [ ] AI Ecosystem works
   - [ ] Can create new projects
   - [ ] AI chat works

✅ **Checkpoint:** Everything works!

---

## 🎉 Success!

You now have **two completely independent platforms:**

**Original (Production):**
- Folder: `Managed AI Offering`
- GitHub: xsourcing
- Render: X-Sourcing services
- Keep using for production

**New (Your Clone):**
- Folder: `Managed-AI-Platform-Clone`
- GitHub: Your new repo
- Render: Your new services
- Use for whatever you need!

---

## 📞 Get Help

**In THIS Cursor project, ask me:**
- "Create Render services"
- "Set environment variables"
- "Something isn't working"
- "Help me deploy"

---

**Estimated Total Cost:** $21/month
- Backend: $7/month
- Frontend: $7/month  
- Database: $7/month

**Time Investment:** 15-20 minutes setup, then it's done!

Ready? Start with step 1! 🚀

