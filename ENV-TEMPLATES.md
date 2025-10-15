# Environment Variables Configuration

## Backend Environment Variables

Create these in your **NEW** Render Backend Service:

```bash
# Database Connection (from your NEW PostgreSQL service)
DATABASE_URL=postgresql://user:password@host:5432/dbname
# ⚠️ Use the INTERNAL connection string from your new Render Postgres
# Found at: Dashboard → Your PostgreSQL → Info → Internal Database URL

# JWT Secret (copy from original or generate new)
JWT_SECRET=your-secret-key-here-make-it-long-and-random
# Generate new: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key
# Get from: https://aistudio.google.com/app/apikey
# Or copy from original project

# Gemini Model
GEMINI_MODEL=gemini-2.0-flash-exp

# Server Port
PORT=3001

# Email Configuration (if you use email features)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password

# Optional: Strict mode for Gemini
GEMINI_STRICT=false
```

---

## Frontend Environment Variables

Create these in your **NEW** Render Frontend Service:

```bash
# API Base URL (your NEW backend URL)
NEXT_PUBLIC_API_BASE_URL=https://your-new-backend.onrender.com
# ⚠️ This will be the URL from your new backend service
# Found at: Dashboard → Your Backend Service → URL at top
```

---

## How to Set Environment Variables in Render

### Via Dashboard:
1. Go to your service (Backend or Frontend)
2. Click "Environment" tab
3. Click "Add Environment Variable"
4. Enter Key and Value
5. Click "Save Changes"
6. Service will redeploy automatically

### Via MCP (in Cursor):
```
Tell me: "Update environment variables for service [service-id]"
I'll use: mcp_render_update_environment_variables
```

---

## 🔒 Security Notes

**JWT_SECRET:**
- Use a different secret than your original project
- At least 64 characters long
- Random alphanumeric string
- Never commit to GitHub

**GEMINI_API_KEY:**
- Can reuse from original project
- Or create new key for better tracking
- Monitor usage separately if using new key

**DATABASE_URL:**
- NEVER use the original database URL
- Must use your NEW database connection string
- Render provides internal URL (faster, more secure)

---

## ✅ Verification Checklist

After setting all environment variables:

**Backend Service:**
- [ ] DATABASE_URL set (new database)
- [ ] JWT_SECRET set (new or copied)
- [ ] GEMINI_API_KEY set
- [ ] PORT set to 3001
- [ ] Service deployed successfully
- [ ] Health check passes: `https://your-backend.onrender.com/health`

**Frontend Service:**
- [ ] NEXT_PUBLIC_API_BASE_URL set (new backend URL)
- [ ] Service deployed successfully
- [ ] Can access homepage
- [ ] API calls work

---

## 🆘 Troubleshooting

**Backend won't start?**
- Check DATABASE_URL is correct (internal URL)
- Verify all required env vars are set
- Check Render logs for specific error

**Frontend can't connect to backend?**
- Verify NEXT_PUBLIC_API_BASE_URL is correct
- Check backend is running (health check)
- Verify CORS is working

**Database connection failed?**
- Use INTERNAL database URL (not external)
- Ensure SSL is enabled in connection string
- Check database is "Available" status in Render

---

**Need help?** Ask in Cursor:
- "Help me set up environment variables"
- "My backend won't connect to database"
- "Frontend is getting API errors"

