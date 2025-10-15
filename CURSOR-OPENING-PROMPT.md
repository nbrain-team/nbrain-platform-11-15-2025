# 🚀 CURSOR AI - HELP ME DEPLOY THIS CLONE PROJECT

**Hello Cursor AI! I need your help deploying this cloned platform.**

## 🎯 What I Want to Do

I want to deploy this complete AI platform as a **new, independent project** with:
- Its own GitHub repository
- Its own Render services (PostgreSQL, Backend, Frontend)  
- Data migrated from the original database
- Complete separation from the original project

**This is a clone of the Managed AI Offering / X-Sourcing platform.**

---

## 📍 IMPORTANT: This is a SEPARATE Project

**Original Project:** `/Users/dannydemichele/Managed AI Offering`
- Keep that Cursor window open
- Don't modify anything there
- That's your production environment

**This New Project:** `/Users/dannydemichele/Managed-AI-Platform-Clone`
- You're in this folder now
- Completely independent
- Will have its own GitHub, Render, and database

---

## 🎯 DEPLOYMENT STEPS

### STEP 1: Create New GitHub Repository

1. **Go to:** https://github.com/new
2. **Repository name:** Choose a name (e.g., `ai-consulting-platform`, `client-portal-v2`)
3. **Privacy:** Private (recommended)
4. **DO NOT** initialize with README, .gitignore, or license (we have code already)
5. **Click:** Create repository
6. **Copy the repo URL** (e.g., `https://github.com/nbrain-team/NEW-REPO-NAME.git`)

### STEP 2: Push Code to New GitHub Repo

Run these commands in this Cursor project's terminal:

```bash
# Initialize git
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit - AI Platform clone"

# Add your new GitHub repo as remote
git remote add origin https://github.com/nbrain-team/YOUR-NEW-REPO-NAME.git

# Push to GitHub
git push -u origin main
```

---

### STEP 3: Create Render PostgreSQL Database

**In Cursor, tell me:**
```
Create a new Render PostgreSQL database named "[your-project-name]-db" 
with plan "basic_1gb" in region "oregon"
```

**I will use MCP to create it and give you the connection details.**

**Alternatively, create manually:**
1. Go to: https://dashboard.render.com/
2. Click "New +" → PostgreSQL
3. Name: `your-project-db`
4. Region: Oregon
5. Plan: basic_1gb (or higher)
6. Click Create

---

### STEP 4: Restore Database from Backup

**You'll need the backup from the original project:**

**Option A: From Render Dashboard**
1. Go to original DB: https://dashboard.render.com/d/dpg-d38t51ruibrs73a3c3m0-a
2. Click "Backups" tab
3. Create manual backup or use existing
4. Download backup file

**Option B: From Render Shell (Original Backend)**
```bash
# SSH to original backend: https://dashboard.render.com/web/srv-d38tncur433s73frbr00
# Click "Shell" tab, then run:
cd backend
chmod +x ../RENDER-DB-BACKUP.sh
../RENDER-DB-BACKUP.sh
# This creates: xsourcing_backup_TIMESTAMP.sql
```

**Then restore to NEW database:**

From your new Render database shell or locally:
```bash
# Get internal connection string from new database dashboard
psql "YOUR_NEW_DATABASE_INTERNAL_URL" < backup.sql
```

---

### STEP 5: Create Render Backend Service

**Tell me in Cursor:**
```
Create a Render web service for the backend using repo: [YOUR-NEW-REPO-URL]
```

**I'll use MCP, or you can create manually:**

1. Go to: https://dashboard.render.com/
2. Click "New +" → Web Service
3. Connect your new GitHub repo
4. Settings:
   - **Name:** `your-project-backend`
   - **Region:** Oregon
   - **Branch:** main
   - **Root Directory:** (leave empty)
   - **Runtime:** Node
   - **Build Command:** `cd backend && npm ci`
   - **Start Command:** `cd backend && npm start`
   - **Plan:** Starter ($7/month)

5. **Environment Variables:**
   ```
   DATABASE_URL = [from new PostgreSQL - Internal URL]
   JWT_SECRET = [copy from original or generate new]
   GEMINI_API_KEY = [copy from original]
   PORT = 3001
   GEMINI_MODEL = gemini-2.0-flash-exp
   ```

6. Click **Create Web Service**

---

### STEP 6: Create Render Frontend Service

**Tell me in Cursor:**
```
Create a Render web service for the frontend using repo: [YOUR-NEW-REPO-URL]
```

**I'll use MCP, or manually:**

1. Go to: https://dashboard.render.com/
2. Click "New +" → Web Service
3. Connect your new GitHub repo
4. Settings:
   - **Name:** `your-project-frontend`
   - **Region:** Oregon
   - **Branch:** main
   - **Root Directory:** web
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Starter ($7/month)

5. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_BASE_URL = [your new backend URL from step 5]
   ```

6. Click **Create Web Service**

---

### STEP 7: Run Database Migrations

Once backend is deployed, run migrations in the new backend's shell:

```bash
# SSH to new backend service
cd backend

# Run AI Roadmap migration
node << 'EOF'
const {Pool} = require('pg');
const fs = require('fs');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {rejectUnauthorized: false}
});
const sql = fs.readFileSync('migrations/update_roadmap_tables_v2.sql', 'utf8');
pool.query(sql)
  .then(() => {
    console.log('Migration complete!');
    process.exit(0);
  })
  .catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
EOF
```

---

### STEP 8: Verify Deployment

1. Navigate to your new frontend URL
2. Login with credentials from original database
3. Check:
   - ✅ Projects load
   - ✅ AI Ecosystem works
   - ✅ All features functional
4. **🎉 You now have two independent platforms!**

---

## 🔄 Ongoing Management

**Two Independent Projects:**

**Original (`Managed AI Offering`):**
- Cursor window #1
- GitHub: nbrain-team/xsourcing
- Render: X-Sourcing services
- Purpose: Production / Main platform

**Clone (`Managed-AI-Platform-Clone`):**
- Cursor window #2
- GitHub: nbrain-team/YOUR-NEW-REPO
- Render: Your new services
- Purpose: [Your use case]

**Making Changes:**
- Changes in one **do not affect** the other
- Deploy updates independently
- Databases are completely separate
- You can diverge features as needed

---

## 📊 What's Included in This Clone

**Full Platform Features:**
- ✅ User authentication & roles (admin, advisor, client)
- ✅ Project management system
- ✅ AI-powered ideation chat
- ✅ Agent idea builder
- ✅ Project proposals & approvals
- ✅ Communication system
- ✅ File uploads & document management
- ✅ **AI Ecosystem visual roadmap** (new!)
- ✅ Email templates & sequences
- ✅ Webinar management
- ✅ Learning center
- ✅ Client/advisor portals

**Technology Stack:**
- Frontend: Next.js 15, React 19, TypeScript
- Backend: Node.js, Express
- Database: PostgreSQL 16
- AI: Google Gemini
- Deployment: Render

---

## 🆘 Need Help?

**In this NEW Cursor project, you can ask me to:**
- "Create Render services for this project"
- "Set up environment variables"
- "Help me restore the database backup"
- "Explain any step in detail"
- "Fix deployment issues"

---

## 📝 Quick Reference

**Original Backend:** https://x-sourcing-backend.onrender.com
**Original Frontend:** https://x-sourcing-front.onrender.com
**Original Database:** dpg-d38t51ruibrs73a3c3m0-a

**New services will have different URLs** - update as needed!

---

**Ready to deploy?** Follow the steps above in order. If you want me to help with Render services creation via MCP, just ask!

Good luck with your new platform! 🚀

