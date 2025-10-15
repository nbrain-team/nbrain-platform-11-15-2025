# 🚀 Managed AI Platform - Clone Project

**This is a complete clone of the X-Sourcing / Managed AI Offering platform.**

---

## 📁 What Is This?

This folder contains a **full copy** of your AI platform codebase, ready to be deployed as a separate, independent instance.

**Original Project:**
- Location: `/Users/dannydemichele/Managed AI Offering`
- GitHub: `nbrain-team/xsourcing`
- Render: X-Sourcing services

**This Clone:**
- Location: `/Users/dannydemichele/Managed-AI-Platform-Clone`
- GitHub: **You'll create new repo**
- Render: **You'll create new services**

---

## 🎯 What You Can Do With This

**Use Cases:**
- Create a separate platform for a different client
- Development/testing environment
- White-label version for partners
- Experimental features without affecting production
- Multi-tenant deployment

**It Includes:**
- ✅ Complete frontend (Next.js + React)
- ✅ Complete backend (Node.js + Express)
- ✅ All features (AI chat, projects, roadmap, etc.)
- ✅ Database schema and migrations
- ✅ Documentation and deployment guides

---

## 📚 Documentation Files

**START HERE:**
1. **`QUICK-START.md`** - Fast deployment guide (15 mins)
2. **`CURSOR-OPENING-PROMPT.md`** - Complete deployment steps
3. **`DATABASE-BACKUP-INSTRUCTIONS.md`** - How to backup/restore database
4. **`ENV-TEMPLATES.md`** - All environment variables needed

**Supporting Files:**
- `RENDER-DB-BACKUP.sh` - Script to backup original database
- `DEPLOYMENT-GUIDE.md` - General deployment info
- `dev-package/ARCHITECTURE.md` - Platform architecture overview

---

## 🚀 Quick Deployment (3 Commands)

```bash
# 1. Initialize git
git init && git add . && git commit -m "Initial commit"

# 2. Push to your new GitHub repo (create first on github.com/new)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-NEW-REPO.git
git push -u origin main

# 3. Tell Cursor AI to create Render services
# "Create Render PostgreSQL, backend, and frontend services for this project"
```

Then restore database backup and you're live! 🎉

---

## ⚙️ Technology Stack

**Frontend:**
- Next.js 15.5.3
- React 19.1.0
- TypeScript 5
- Tailwind CSS 4
- React Flow (for AI Ecosystem)

**Backend:**
- Node.js 20+
- Express.js 4.18.2
- PostgreSQL 16
- Google Gemini AI
- JWT authentication

**Deployment:**
- Platform: Render.com
- CI/CD: Auto-deploy on git push
- SSL: Automatic HTTPS

---

## 💡 Features Included

### Core Platform
- User authentication (admin, advisor, client roles)
- Project management system
- AI-powered project ideation chat
- Proposal system with approvals
- Real-time communication

### AI Ecosystem Roadmap (NEW!)
- Interactive visual strategy map
- React Flow canvas
- Category nodes (The Brain, Sales, Marketing, HR, Ops, Finance)
- Project and idea nodes
- Drag-and-drop organization
- Connection mapping
- Export to PNG/PDF

### Additional Features
- File upload/document management
- Email templates and sequences
- Webinar management
- Learning center
- Credential management
- Project phases tracking

---

## 🔒 Security Notes

**Before deploying:**
- [ ] Generate NEW JWT_SECRET (don't reuse original)
- [ ] Review user accounts in database backup
- [ ] Update admin passwords if needed
- [ ] Set up proper CORS origins
- [ ] Configure email settings for your domain

---

## 📊 Estimated Costs

**Monthly Render Costs:**
- PostgreSQL basic_1gb: $7/month
- Backend (starter): $7/month
- Frontend (starter): $7/month
- **Total: ~$21/month**

**Can scale up:**
- More powerful plans available
- Auto-scaling options
- Load balancing for high traffic

---

## 🆘 Need Help?

**Open this folder in Cursor and ask:**
- "Help me deploy this to Render"
- "Create the Render services for me"
- "I'm stuck on [specific step]"
- "How do I backup the database?"
- "Set up my environment variables"

**AI Assistant (me!) can:**
- Create Render services via MCP
- Set environment variables
- Run database migrations
- Troubleshoot deployment issues
- Explain any part of the codebase

---

## 🎨 Next Steps

1. **Read:** `QUICK-START.md`
2. **Create:** GitHub repository
3. **Tell me:** "Create Render services for this project"
4. **Deploy:** Follow the guide
5. **Enjoy:** Your new independent platform!

---

**This is a complete, production-ready platform.** All features work exactly like the original. You just need to deploy it! 🚀

**Questions?** Just ask in Cursor! I'm here to help.

