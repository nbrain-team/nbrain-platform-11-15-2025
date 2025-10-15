# AI Roadmap Database Migration Instructions

## ✅ Code Deployed Successfully!

Your AI Roadmap feature code is now live on Render! Now you just need to run the database migration.

## 🚀 Run the Migration (Choose One Method)

### Method 1: Via Admin Panel (Recommended - Easiest)

1. **Login to your admin account** at: https://x-sourcing-front.onrender.com/login
2. **Open your browser's Developer Console** (F12 or Right-click → Inspect → Console)
3. **Copy and paste this code** into the console:

```javascript
fetch('https://x-sourcing-backend.onrender.com/admin/run-roadmap-migration', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('xsourcing_token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(data => {
  if (data.ok) {
    console.log('✅ Migration completed successfully!');
    console.log('Tables created:', data.tablesCreated);
    alert('✅ Database migration completed! AI Roadmap is now ready to use.');
  } else {
    console.error('❌ Migration failed:', data.error);
    alert('Migration failed: ' + data.error);
  }
})
.catch(err => {
  console.error('❌ Error:', err);
  alert('Error running migration: ' + err.message);
});
```

4. **Press Enter** - You should see "✅ Migration completed successfully!"
5. **Done!** Navigate to "Your AI Roadmap" to start using it.

---

### Method 2: Via curl (Alternative)

If you prefer command line:

```bash
# 1. Login to get your admin token
curl -X POST https://x-sourcing-backend.onrender.com/login \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_ADMIN_EMAIL","password":"YOUR_ADMIN_PASSWORD"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4 > admin_token.txt

# 2. Run the migration
curl -X POST https://x-sourcing-backend.onrender.com/admin/run-roadmap-migration \
  -H "Authorization: Bearer $(cat admin_token.txt)" \
  -H "Content-Type: application/json"
```

---

### Method 3: Via Render Shell

```bash
# 1. SSH into your backend service
# Go to: https://dashboard.render.com/web/srv-d38tncur433s73frbr00
# Click "Shell" tab

# 2. Run the migration script
cd backend && node run-migration.js
```

---

## 🎉 After Migration

Once the migration completes successfully:

1. **Navigate to**: https://x-sourcing-front.onrender.com/roadmap
2. **Your AI Roadmap will**:
   - Auto-import all existing projects
   - Auto-import all existing ideas
   - Create an interactive visual canvas
   - Allow drag-and-drop organization
   - Support adding new nodes and connections
   - Export to PNG/PDF

## 📊 What Was Created

The migration creates these database tables:
- `ai_roadmap_configs` - User roadmap configurations
- `roadmap_nodes` - Visual nodes (projects, ideas, departments)
- `roadmap_edges` - Connections between nodes
- `roadmap_departments` - Business units/departments
- `roadmap_snapshots` - Version history

## ❓ Troubleshooting

**If migration fails:**
1. Check you're logged in as an admin
2. Check the browser console for error messages
3. Verify backend is accessible: https://x-sourcing-backend.onrender.com/health
4. Try Method 3 (Render Shell) if browser method doesn't work

**Need help?** The migration endpoint is at:
`POST /admin/run-roadmap-migration` (admin only)

---

## 🎨 Feature Overview

**Navigation:**
- Clients see: "Your AI Roadmap"
- Advisors see: "Client Roadmaps"

**Node Types:**
- **Green nodes** = Active Projects
- **Purple dashed nodes** = Ideas
- **Blue nodes** = Departments

**Actions:**
- Drag nodes to reposition
- Click nodes for details
- Connect nodes (drag from handle to handle)
- Add new nodes via "Add Node" button
- Export via toolbar (PNG/PDF)

Enjoy your new AI Adoption Roadmap feature! 🚀

