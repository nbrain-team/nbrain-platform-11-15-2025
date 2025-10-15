# ✅ Deployment Checklist - Use This to Track Progress

**Project:** Managed AI Platform Clone
**Date:** October 15, 2025

---

## PRE-DEPLOYMENT

- [ ] Opened this folder in NEW Cursor window
- [ ] Original project still open in separate window
- [ ] Read START-HERE.md
- [ ] Understand this is separate from original

---

## PHASE 1: GITHUB SETUP

- [ ] Created new GitHub repository at github.com/new
- [ ] Repository name: ________________________
- [ ] Initialized git: `git init`
- [ ] Added files: `git add .`
- [ ] Committed: `git commit -m "Initial commit"`
- [ ] Added remote: `git remote add origin [URL]`
- [ ] Pushed: `git push -u origin main`
- [ ] ✅ Code is on GitHub

**Repo URL:** _______________________________________

---

## PHASE 2: DATABASE BACKUP

- [ ] Accessed original Render DB dashboard
- [ ] Created manual backup OR
- [ ] Ran backup script from Render shell
- [ ] Downloaded/saved backup.sql file
- [ ] Verified backup file size (should be several MB)
- [ ] ✅ Have database backup

**Backup file location:** _______________________________________

---

## PHASE 3: RENDER POSTGRESQL

- [ ] Created new Render PostgreSQL database
- [ ] Name: ________________________
- [ ] Plan: basic_1gb (or higher)
- [ ] Region: Oregon
- [ ] Database status: Available
- [ ] Copied INTERNAL connection string
- [ ] ✅ New database ready

**Database ID:** _______________________________________
**Connection URL:** postgresql://________________________

---

## PHASE 4: RESTORE DATABASE

- [ ] Accessed new database shell or connected locally
- [ ] Ran: `psql $DATABASE_URL < backup.sql`
- [ ] No errors during restore
- [ ] Verified tables exist: `\dt`
- [ ] Verified data: `SELECT COUNT(*) FROM users;`
- [ ] ✅ Database restored successfully

**User count:** _____ **Project count:** _____ **Idea count:** _____

---

## PHASE 5: BACKEND SERVICE

- [ ] Created Render web service for backend
- [ ] Connected to new GitHub repo
- [ ] Build command: `cd backend && npm ci`
- [ ] Start command: `cd backend && npm start`
- [ ] Set environment variables:
  - [ ] DATABASE_URL (internal URL)
  - [ ] JWT_SECRET
  - [ ] GEMINI_API_KEY
  - [ ] PORT=3001
  - [ ] GEMINI_MODEL=gemini-2.0-flash-exp
- [ ] Service deployed successfully
- [ ] Health check passes: /health endpoint
- [ ] ✅ Backend running

**Backend URL:** https://________________________.onrender.com

---

## PHASE 6: FRONTEND SERVICE

- [ ] Created Render web service for frontend
- [ ] Connected to new GitHub repo
- [ ] Root directory: `web`
- [ ] Build command: `npm install && npm run build`
- [ ] Start command: `npm start`
- [ ] Set environment variables:
  - [ ] NEXT_PUBLIC_API_BASE_URL=[backend URL]
- [ ] Service deployed successfully
- [ ] Can access homepage
- [ ] ✅ Frontend running

**Frontend URL:** https://________________________.onrender.com

---

## PHASE 7: RUN MIGRATIONS

- [ ] Accessed new backend Render shell
- [ ] Ran roadmap v2 migration
- [ ] Migration completed successfully
- [ ] Verified roadmap tables exist
- [ ] ✅ All migrations applied

---

## PHASE 8: TESTING

- [ ] Opened frontend URL in browser
- [ ] Login page loads
- [ ] Logged in with existing credentials
- [ ] Dashboard loads correctly
- [ ] Checked Projects page
- [ ] Checked AI Ecosystem page
- [ ] Tested AI chat/ideation
- [ ] Verified all main features work
- [ ] ✅ Platform fully functional

---

## FINAL VERIFICATION

- [ ] Original project untouched
- [ ] New project fully deployed
- [ ] Both projects independent
- [ ] Can access both platforms separately
- [ ] Database data migrated correctly
- [ ] All features working in new platform
- [ ] Environment variables correct
- [ ] SSL/HTTPS working

---

## 🎊 DEPLOYMENT COMPLETE!

**Original Platform:**
- Location: /Users/dannydemichele/Managed AI Offering
- GitHub: nbrain-team/xsourcing
- Frontend: https://x-sourcing-front.onrender.com
- Backend: https://x-sourcing-backend.onrender.com
- Status: Production / Untouched ✅

**New Platform:**
- Location: /Users/dannydemichele/Managed-AI-Platform-Clone
- GitHub: _______________________________________
- Frontend: _______________________________________
- Backend: _______________________________________
- Status: Newly Deployed 🎉

---

## 📝 Notes & Observations

(Add your notes here as you deploy)

---

**Deployment completed by:** _______________________
**Date completed:** _______________________
**Total time:** _______________________
**Issues encountered:** _______________________

---

## 🔄 Ongoing Maintenance

**Remember:**
- These are TWO SEPARATE projects
- Updates to one don't affect the other
- Each has its own deployment pipeline
- Each has its own database
- Manage them independently

**Future updates:**
- Git push to respective repos
- Render auto-deploys each one
- Run migrations on each separately
- Monitor costs for both

---

**Congratulations on your new platform!** 🚀
