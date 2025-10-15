const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const archiver = require('archiver');
const { GoogleGenerativeAI } = require('@google/generative-ai');
let dispatchOutbox = null;
try {
  ({ runOnce: dispatchOutbox } = require('./sender.js'));
} catch (_) {
  // sender not available in some environments; manual dispatch endpoint will no-op
}

// Proactive probe: whether streaming is supported for current model/API
let STREAMING_SUPPORTED = null; // null = unknown, true/false = probed
async function probeStreamingSupport() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      STREAMING_SUPPORTED = false;
      console.log('[ai] streaming probe: no API key');
      return;
    }
    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
    const mdl = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-pro' });
    const result = await mdl.generateContentStream({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] });
    for await (const _ of result.stream) { break; }
    STREAMING_SUPPORTED = true;
    console.log('[ai] streaming probe: supported');
  } catch (e) {
    STREAMING_SUPPORTED = false;
    console.log('[ai] streaming probe: not supported:', (e && e.message) || e);
  }
}

// Periodically dispatch email outbox if sender is available (acts like a lightweight cron)
if (dispatchOutbox) {
  setTimeout(() => {
    dispatchOutbox().catch(()=>{});
  }, 5000);
  setInterval(() => {
    dispatchOutbox().catch(()=>{});
  }, 60 * 1000);
}
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// Gemini transient error handling
function isTransientGeminiError(error) {
  const message = String((error && error.message) || '');
  return (
    message.includes('503') ||
    message.toLowerCase().includes('service unavailable') ||
    message.toLowerCase().includes('overloaded') ||
    message.toLowerCase().includes('rate') ||
    message.toLowerCase().includes('quota')
  );
}

async function generateContentWithRetries(model, args, maxAttempts = 3) {
  let lastError = null;
  const backoffsMs = [400, 900, 1800];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await model.generateContent(args);
    } catch (e) {
      lastError = e;
      if (attempt < maxAttempts - 1 && isTransientGeminiError(e)) {
        const delay = backoffsMs[attempt] || 1500;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  throw lastError;
}

// Fallback generation that switches models on quota/rate errors
async function generateWithFallback(genAI, baseModelOptions, args, maxAttemptsPerModel = 3) {
  const primary = (baseModelOptions && baseModelOptions.model) || (process.env.GEMINI_MODEL || 'gemini-2.5-pro');
  const candidates = Array.from(new Set([
    primary,
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ]));
  let lastErr = null;
  for (const m of candidates) {
    try {
      const mdl = genAI.getGenerativeModel({ ...baseModelOptions, model: m });
      return await generateContentWithRetries(mdl, args, maxAttemptsPerModel);
    } catch (e) {
      lastErr = e;
      if (!isTransientGeminiError(e)) throw e;
      continue;
    }
  }
  throw lastErr;
}

// Early uploader for admin webinar images (avoid TDZ on later upload init)
const uploadsDir = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir); } catch {}
const webinarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(uploadsDir, 'webinars');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const stamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${stamp}__${safe}`);
  }
});
const uploadWebinar = multer({ storage: webinarStorage });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false });
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Ensure schema exists (idempotent). Runs on boot so queries never reference missing columns.
async function ensureSchema() {
  await pool.query(`
    create table if not exists users (
      id serial primary key,
      role text not null,
      name text not null,
      email text unique not null,
      username text unique not null,
      password text not null
    );
    create table if not exists advisor_clients (
      advisor_id int not null references users(id) on delete cascade,
      client_id int not null references users(id) on delete cascade,
      primary key (advisor_id, client_id)
    );
    create table if not exists projects (
      id serial primary key,
      client_id int not null references users(id) on delete cascade,
      name text not null,
      status text not null,
      eta text,
      project_stage text default 'Scope',
      created_at timestamptz default now()
    );
  `);
  // Add project_stage column if it doesn't exist
  await pool.query("alter table projects add column if not exists project_stage text default 'Scope'");
  
  // Add extended profile columns if they don't exist
  await pool.query('alter table users add column if not exists company_name text');
  await pool.query('alter table users add column if not exists website_url text');
  await pool.query('alter table users add column if not exists phone text');

  // Messages table for advisor<->client communication per project
  await pool.query(`
    create table if not exists project_messages (
      id serial primary key,
      project_id int not null references projects(id) on delete cascade,
      user_id int references users(id) on delete set null,
      content text not null,
      created_at timestamptz default now()
    );
  `);

  // Files table for project docs (metadata only; files stored on local disk for MVP)
  await pool.query(`
    create table if not exists project_files (
      id serial primary key,
      project_id int not null references projects(id) on delete cascade,
      user_id int references users(id) on delete set null,
      filename text not null,
      originalname text not null,
      mimetype text,
      size int,
      created_at timestamptz default now()
    );
  `);
  // Add advisor_only visibility flag so some files are hidden from clients
  await pool.query('alter table project_files add column if not exists advisor_only boolean default false');

  // Stage change approvals table for client approval workflow
  await pool.query(`
    create table if not exists stage_change_approvals (
      id serial primary key,
      project_id int not null references projects(id) on delete cascade,
      advisor_id int not null references users(id) on delete cascade,
      from_stage text not null,
      to_stage text not null,
      message text,
      attachment_file_id int references project_files(id) on delete set null,
      status text not null default 'pending',
      created_at timestamptz default now(),
      approved_at timestamptz,
      rejected_at timestamptz
    );
  `);
  await pool.query('create index if not exists idx_stage_approvals_project_status on stage_change_approvals(project_id, status)');

  // Create agent_ideas table to store ideation specs
  await pool.query(`
    create table if not exists agent_ideas (
      id varchar primary key,
      title text not null,
      summary text not null,
      steps jsonb not null,
      agent_stack jsonb not null,
      client_requirements jsonb not null,
      conversation_history jsonb,
      status text default 'draft',
      agent_type text,
      implementation_estimate jsonb,
      security_considerations jsonb,
      future_enhancements jsonb,
      build_phases jsonb,
      created_at timestamptz default now(),
      updated_at timestamptz,
      user_id int references users(id) on delete set null,
      project_id int references projects(id) on delete set null
    );
  `);
  
  // Add build_phases column if it doesn't exist
  await pool.query('alter table agent_ideas add column if not exists build_phases jsonb');

  // Create project_credentials table to link projects with credentials
  await pool.query(`
    create table if not exists project_credentials (
      id serial primary key,
      project_id int not null references projects(id) on delete cascade,
      credential_id int not null references credentials(id) on delete cascade,
      created_at timestamptz default now(),
      unique(project_id, credential_id)
    );
  `);

  // Add chat_history column to projects table for draft functionality
  await pool.query(`
    ALTER TABLE projects 
    ADD COLUMN IF NOT EXISTS chat_history JSONB DEFAULT NULL
  `);

  // Add index on status for better query performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)
  `);

  // Create credentials table for storing user credentials
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credentials (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'text' or 'file'
      value TEXT, -- for text credentials
      file_data BYTEA, -- for file uploads
      file_name TEXT, -- original file name
      is_predefined BOOLEAN DEFAULT FALSE, -- for seeded credentials
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add index on user_id for better query performance
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id)
  `);
  
  // Create advisor_requests table for lead capture
  await pool.query(`
    create table if not exists advisor_requests (
      id serial primary key,
      name varchar(255) not null,
      email varchar(255) not null,
      company_url varchar(255),
      time_slot varchar(255) not null,
      status varchar(50) default 'pending',
      created_at timestamptz default now()
    )
  `);
  
  // Create schedule_requests table for client-advisor meetings
  await pool.query(`
    create table if not exists schedule_requests (
      id serial primary key,
      client_id int not null references users(id) on delete cascade,
      advisor_id int not null references users(id) on delete cascade,
      time_slot varchar(255) not null,
      meeting_description text,
      status varchar(50) default 'pending',
      created_at timestamptz default now()
    )
  `);

  // Webinars master table
  await pool.query(`
    create table if not exists webinars (
      id serial primary key,
      title text not null,
      description text,
      datetime text not null,
      duration text,
      image_url text,
      created_at timestamptz default now()
    )
  `);

  // Webinar signups
  await pool.query(`
    create table if not exists webinar_signups (
      id serial primary key,
      webinar_id int not null references webinars(id) on delete cascade,
      client_id int not null references users(id) on delete cascade,
      created_at timestamptz default now(),
      unique (webinar_id, client_id)
    )
  `);

  // Seed 3 upcoming webinars if none exist
  try {
    const wcnt = await pool.query('select count(*)::int as c from webinars');
    if ((wcnt.rows[0]?.c || 0) === 0) {
      const now = new Date();
      const fmt = (d) => d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' }).replace(',', '');
      const d1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 days
      const d2 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
      const d3 = new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000); // +12 days
      await pool.query(
        'insert into webinars(title, description, datetime, duration, image_url) values ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10), ($11,$12,$13,$14,$15)',
        [
          'Live Scope Clinic: Define Your First AI Project',
          'Hands-on framework we use to turn ideas into shippable AI projects — with examples and Q&A.',
          fmt(d1),
          '45 min',
          '',
          'RAG Patterns That Actually Ship',
          'From quick wins to production-grade retrieval: chunking, indexing, reranking, evaluation, observability.',
          fmt(d2),
          '40 min',
          '',
          'Ops Automation: 5 Workflows That Print Time',
          'Reporting, enrichment, ticket triage, QA, and handoffs — how we guarantee quality with AI.',
          fmt(d3),
          '40 min',
          ''
        ]
      );
    }
  } catch {}

  // Ensure seeded webinars have rich descriptions and images (idempotent updates)
  try {
    await pool.query(
      `update webinars set description=$2, image_url=$3 where title=$1 and (image_url is null or image_url='')`,
      [
        'Live Scope Clinic: Define Your First AI Project',
        'In this live working session, we walk through the exact scoping playbook we use to transform a raw idea into a shippable AI project. We will cover success criteria, guardrails, data considerations, and an MVP slice you can build next week. Bring a real idea—there will be live Q&A and examples from recent launches.',
        'https://images.unsplash.com/photo-1551836022-4c4c79ecde51?auto=format&fit=crop&w=1600&q=80'
      ]
    );
    await pool.query(
      `update webinars set description=$2, image_url=$3 where title=$1 and (image_url is null or image_url='')`,
      [
        'RAG Patterns That Actually Ship',
        'We break down retrieval-augmented generation (RAG) patterns that consistently make it to production. Learn how to choose chunking, embedding, and indexing strategies, when to rerank, how to evaluate responses, and what to log for observability. Includes concrete architectures you can replicate.',
        'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1600&q=80'
      ]
    );
    await pool.query(
      `update webinars set description=$2, image_url=$3 where title=$1 and (image_url is null or image_url='')`,
      [
        'Ops Automation: 5 Workflows That Print Time',
        'See the five automation workflows we deploy most often to save teams hours per week: reporting, enrichment, ticket triage, QA, and handoffs. We will show before/after swimlanes, failure handling, and how to keep humans-in-the-loop without slowing throughput. Real examples and templates included.',
        'https://images.unsplash.com/photo-1504384764586-bb4cdc1707b0?auto=format&fit=crop&w=1600&q=80'
      ]
    );
  } catch {}

  // Project proposals for advisor approval
  await pool.query(`
    create table if not exists project_proposals (
      id serial primary key,
      project_id int not null references projects(id) on delete cascade,
      name text not null,
      cost text,
      hours text,
      api_fees text,
      human_cost text,
      human_timeline text,
      status text default 'pending',
      created_at timestamptz default now(),
      accepted_at timestamptz,
      unique(project_id)
    )
  `);

  // Email templates
  await pool.query(`
    create table if not exists email_templates (
      id serial primary key,
      name text not null,
      key text unique,
      subject text not null,
      body text not null,
      is_system boolean default false,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
  // Seed core templates if missing
  await pool.query(`insert into email_templates(name, key, subject, body, is_system)
    select 'Welcome to Hyah! AI', 'signup_welcome', 'Welcome to Hyah! AI – your account details',
      'Hi {{name}},\n\nWelcome to Hyah! AI. Your account is ready.\n\nUsername: {{username}}\nPassword: {{password}}\nLogin: {{login_url}}\n\n— Hyah! AI Team', true
    where not exists (select 1 from email_templates where key='signup_welcome')`);
  await pool.query(`insert into email_templates(name, key, subject, body, is_system)
    select 'Password Reset', 'password_reset', 'Reset your Hyah! AI password',
      'Hi {{name}},\n\nUse the link below to reset your password.\n{{reset_url}}\n\nIf you did not request this, you can ignore this email.', true
    where not exists (select 1 from email_templates where key='password_reset')`);
  await pool.query(`insert into email_templates(name, key, subject, body, is_system)
    select 'Project Completed', 'project_completed', 'Your project {{project_name}} is completed',
      'Hi {{name}},\n\nGreat news—your project {{project_name}} has been marked Completed.\nOpen it here: {{project_url}}\n\nThank you for building with Hyah! AI!', true
    where not exists (select 1 from email_templates where key='project_completed')`);

  // Email sequences
  await pool.query(`
    create table if not exists email_sequences (
      id serial primary key,
      name text not null,
      description text,
      trigger text default 'manual',
      is_active boolean default true,
      created_at timestamptz default now()
    )
  `);

  // Email sequence steps
  await pool.query(`
    create table if not exists email_sequence_steps (
      id serial primary key,
      sequence_id int not null references email_sequences(id) on delete cascade,
      step_order int default 1,
      delay_minutes int default 0,
      template_id int references email_templates(id) on delete set null,
      notes text,
      created_at timestamptz default now()
    )
  `);

  // Email outbox (queue)
  await pool.query(`
    create table if not exists email_outbox (
      id serial primary key,
      to_user_id int references users(id) on delete set null,
      to_email text,
      subject text not null,
      body text not null,
      template_id int references email_templates(id) on delete set null,
      metadata jsonb default '{}'::jsonb,
      status text default 'queued',
      attempts int default 0,
      last_error text,
      scheduled_for timestamptz,
      sent_at timestamptz,
      updated_at timestamptz default now(),
      created_at timestamptz default now()
    )
  `);
  // Ensure new columns exist when table was created before these fields were added
  await pool.query('alter table email_outbox add column if not exists attempts int default 0');
  await pool.query('alter table email_outbox add column if not exists last_error text');
  await pool.query('alter table email_outbox add column if not exists updated_at timestamptz default now()');
  await pool.query('alter table email_outbox add column if not exists sent_at timestamptz');

  // Email provider settings (placeholder for SMTP)
  await pool.query(`
    create table if not exists email_settings (
      id serial primary key,
      provider text default 'smtp',
      smtp_host text,
      smtp_port int,
      smtp_username text,
      smtp_password text,
      smtp_secure boolean default false,
      from_name text,
      from_email text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);

  await pool.query(`
    create table if not exists password_reset_tokens (
      token text primary key,
      user_id int not null references users(id) on delete cascade,
      created_at timestamptz default now(),
      expires_at timestamptz not null
    )
  `);
}

// Seed predefined credentials for new users
async function seedUserCredentials(userId) {
  const predefinedCredentials = [
    { name: 'OpenAI Key', type: 'text' },
    { name: 'Gemini Key', type: 'text' },
    { name: 'Anthropic Key', type: 'text' },
    { name: 'Google Drive Folder', type: 'text' }
  ];
  
  for (const cred of predefinedCredentials) {
    await pool.query(
      'INSERT INTO credentials (user_id, name, type, is_predefined) VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING',
      [userId, cred.name, cred.type]
    );
  }
}

// Simple auth middleware using Bearer token
function auth(requiredRole) {
  return async function (req, res, next) {
    try {
      const authHeader = req.headers.authorization || '';
      let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      // Fallback: read from cookie (xsourcing_token) or query param (?token=)
      if (!token) {
        const cookieHeader = req.headers.cookie || '';
        if (cookieHeader) {
          const parts = cookieHeader.split(';').map(s => s.trim());
          for (const p of parts) {
            const [k, v] = p.split('=');
            if (k === 'xsourcing_token' && v) { token = decodeURIComponent(v); break; }
          }
        }
      }
      if (!token && req.query && (req.query.token || req.query.auth)) {
        token = String(req.query.token || req.query.auth);
      }

      if (!token) return res.status(401).json({ ok: false, error: 'Missing token' });
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ ok: false, error: 'Forbidden' });
      }
      next();
    } catch (e) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
  };
}

app.get('/health', async (_req, res) => {
  try {
    await ensureSchema();
    await pool.query('select 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// seed demo users endpoint (admin/advisor/client demo) and example projects
app.post('/seed-demo', async (_req, res) => {
  try {
    await ensureSchema();

    const inserts = [
      ['admin', 'Admin User', 'admin@example.com', 'admin', 'admin'],
      ['advisor', 'Advisor User', 'advisor@example.com', 'advisor', 'advisor'],
      ['client', 'Client User', 'client@example.com', 'client', 'client'],
    ];
    const ids = {};
    for (const [role, name, email, username, password] of inserts) {
      const r = await pool.query(
        'insert into users(role,name,email,username,password) values($1,$2,$3,$4,$5) on conflict(username) do update set role=excluded.role returning id, role',
        [role, name, email, username, password]
      );
      ids[role] = r.rows[0].id;
      // Seed credentials for client user
      if (role === 'client') {
        await seedUserCredentials(ids[role]);
      }
    }
    // map client to advisor
    await pool.query(
      'insert into advisor_clients(advisor_id, client_id) values($1,$2) on conflict do nothing',
      [ids['advisor'], ids['client']]
    );

    // seed some projects for the client
    await pool.query(
      `insert into projects(client_id, name, status, eta) values
        ($1, 'Social content pipeline', 'In production', '2 days'),
        ($1, 'Reporting deck automation', 'In production', '4 days'),
        ($1, 'CRM enrichment agent', 'Completed', null)
      on conflict do nothing`,
      [ids['client']]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// simple demo login
app.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, error: 'Missing credentials' });
  try {
    const r = await pool.query('select id, role, name, password as hash from users where username=$1', [username]);
    if (r.rowCount === 0) return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    const row = r.rows[0];

    // Support both hashed (new) and plain (legacy demo) passwords
    let valid = false;
    const stored = row.hash || '';
    if (stored.startsWith('$2')) {
      valid = await bcrypt.compare(password, stored);
    } else {
      valid = stored === password;
    }
    if (!valid) return res.status(401).json({ ok: false, error: 'Invalid credentials' });

    const user = { id: row.id, role: row.role, name: row.name };
    let clients = [];
    if (user.role === 'advisor') {
      const cr = await pool.query(
        'select u.id, u.name, u.email from advisor_clients ac join users u on ac.client_id=u.id where ac.advisor_id=$1',
        [user.id]
      );
      clients = cr.rows;
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ ok: true, token, user, clients });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// list users for admin
// Admin endpoints (JWT required)
app.get('/admin/advisor-requests', auth('admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'select * from advisor_requests order by created_at desc limit 20'
    );
    res.json({ ok: true, requests: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/admin/clients', auth('admin'), async (_req, res) => {
  try {
    const r = await pool.query("select id, name, email, username, company_name, website_url from users where role='client' order by id asc");
    res.json({ ok: true, clients: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/admin/advisors', auth('admin'), async (_req, res) => {
  try {
    const r = await pool.query("select id, name, email, username, phone from users where role='advisor' order by id asc");
    res.json({ ok: true, advisors: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/admin/users', auth('admin'), async (req, res) => {
  try {
    const { role, name, email, username, password, advisorId, companyName, websiteUrl, phone } = req.body || {};
    if (!role || !name || !email || !username || !password) return res.status(400).json({ ok: false, error: 'Missing fields' });
    if (!['advisor', 'client'].includes(role)) return res.status(400).json({ ok: false, error: 'Role must be advisor or client' });
    const r = await pool.query('insert into users(role,name,email,username,password,company_name,website_url,phone) values($1,$2,$3,$4,$5,$6,$7,$8) returning id', [role, name, email, username, password, companyName || null, websiteUrl || null, phone || null]);
    const id = r.rows[0].id;
    if (role === 'client' && advisorId) {
      await pool.query('insert into advisor_clients(advisor_id, client_id) values($1,$2) on conflict do nothing', [advisorId, id]);
    }
    // Seed predefined credentials for client users
    if (role === 'client') {
      await seedUserCredentials(id);
    }
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put('/admin/users/:id', auth('admin'), async (req, res) => {
  try {
    const { name, email, username, password, companyName, websiteUrl, phone } = req.body || {};
    await pool.query('update users set name=coalesce($1,name), email=coalesce($2,email), username=coalesce($3,username), password=coalesce($4,password), company_name=coalesce($5,company_name), website_url=coalesce($6,website_url), phone=coalesce($7,phone) where id=$8', [name, email, username, password, companyName, websiteUrl, phone, req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/admin/users/:id', auth('admin'), async (req, res) => {
  try {
    await pool.query('delete from users where id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get single client with advisor info
app.get('/admin/clients/:id', auth('admin'), async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const clientResult = await pool.query(
      'select id, name, email, username, company_name, website_url, phone from users where id=$1 and role=$2',
      [clientId, 'client']
    );
    if (clientResult.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    // Get assigned advisor
    const advisorResult = await pool.query(
      'select u.id, u.name, u.email, u.phone from advisor_clients ac join users u on ac.advisor_id = u.id where ac.client_id = $1',
      [clientId]
    );
    
    client.advisor = advisorResult.rowCount > 0 ? advisorResult.rows[0] : null;
    
    res.json({ ok: true, client });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update client info
app.put('/admin/clients/:id', auth('admin'), async (req, res) => {
  try {
    const clientId = Number(req.params.id);
    const { name, email, username, companyName, websiteUrl, phone, advisorId } = req.body || {};
    
    // Update client info
    await pool.query(
      'update users set name=$1, email=$2, username=$3, company_name=$4, website_url=$5, phone=$6 where id=$7 and role=$8',
      [name, email, username, companyName, websiteUrl, phone, clientId, 'client']
    );
    
    // Update advisor assignment if provided
    if (advisorId !== undefined) {
      // Remove existing assignment
      await pool.query('delete from advisor_clients where client_id=$1', [clientId]);
      
      // Add new assignment if advisorId is not null
      if (advisorId) {
        await pool.query('insert into advisor_clients(advisor_id, client_id) values($1,$2)', [advisorId, clientId]);
      }
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Assign or reassign a client to an advisor
app.post('/admin/assign', auth('admin'), async (req, res) => {
  try {
    const { advisorId, clientId } = req.body || {};
    if (!advisorId || !clientId) return res.status(400).json({ ok: false, error: 'advisorId and clientId required' });
    await pool.query('insert into advisor_clients(advisor_id, client_id) values($1,$2) on conflict (advisor_id, client_id) do nothing', [advisorId, clientId]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Advisor endpoints
app.get('/advisor/schedule-requests', auth('advisor'), async (req, res) => {
  try {
    const result = await pool.query(
      `select sr.*, u.name as client_name, u.email as client_email 
       from schedule_requests sr 
       join users u on sr.client_id = u.id 
        where sr.advisor_id = $1 
          and sr.status = 'pending'
          and coalesce(sr.meeting_description,'') not ilike 'webinar signup:%'
       order by sr.created_at desc`,
      [req.user.id]
    );
    res.json({ ok: true, requests: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Advisor confirms a scheduled request
app.post('/advisor/schedule-requests/:id/confirm', auth('advisor'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query(
      `update schedule_requests set status='confirmed' 
       where id=$1 and advisor_id=$2 and status='pending' returning id`,
      [id, req.user.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'Request not found or already handled' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/advisor/clients', auth('advisor'), async (req, res) => {
  try {
    const r = await pool.query(
      'select u.id, u.name, u.email from advisor_clients ac join users u on ac.client_id=u.id where ac.advisor_id=$1',
      [req.user.id]
    );
    res.json({ ok: true, clients: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Advisor aggregated communications (messages across all accessible projects)
app.get('/advisor/messages', auth('advisor'), async (req, res) => {
  try {
    const r = await pool.query(
      `select 
         m.id,
         m.project_id,
         m.user_id,
         m.content,
         m.created_at,
         p.name as project_name,
         p.client_id,
         uc.name as client_name,
         ua.name as author_name,
         ua.role as author_role
       from project_messages m
       join projects p on m.project_id = p.id
       join advisor_clients ac on ac.client_id = p.client_id and ac.advisor_id = $1
       left join users ua on m.user_id = ua.id
       left join users uc on p.client_id = uc.id
       order by m.created_at desc
       limit 500`,
      [req.user.id]
    );
    res.json({ ok: true, messages: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Advisor send message to a specific project
app.post('/advisor/messages', auth('advisor'), async (req, res) => {
  try {
    const { projectId, content } = req.body || {};
    const project_id = Number(projectId);
    if (!project_id || !content || !content.trim()) return res.status(400).json({ ok: false, error: 'projectId and content required' });
    if (!(await ensureAdvisorAccess(project_id, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    await pool.query('insert into project_messages(project_id, user_id, content) values($1,$2,$3)', [project_id, req.user.id, content]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get single client details for advisor
app.get('/advisor/clients/:clientId', auth('advisor'), async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    
    // Verify advisor has access to this client
    const access = await pool.query(
      'select 1 from advisor_clients where advisor_id=$1 and client_id=$2',
      [req.user.id, clientId]
    );
    
    if (access.rowCount === 0) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Get client details
    const r = await pool.query(
      'select id, name, email, company_name, website_url, phone from users where id=$1 and role=$2',
      [clientId, 'client']
    );
    
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }
    
    res.json({ ok: true, client: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get client credentials for advisor (with values for advisors to use)
app.get('/advisor/clients/:clientId/credentials', auth('advisor'), async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    
    // Verify advisor has access to this client
    const access = await pool.query(
      'select 1 from advisor_clients where advisor_id=$1 and client_id=$2',
      [req.user.id, clientId]
    );
    
    if (access.rowCount === 0) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Get credentials WITH values (advisors need access to use them)
    const result = await pool.query(
      'SELECT id, name, type, value, file_name, is_predefined FROM credentials WHERE user_id = $1 ORDER BY is_predefined DESC, name ASC',
      [clientId]
    );
    
    res.json({ ok: true, credentials: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get client projects for advisor
// Get all projects across all advisor's clients
app.get('/advisor/projects', auth('advisor'), async (req, res) => {
  try {
    // Get all projects for clients assigned to this advisor
    const r = await pool.query(
      `select p.id, p.name, p.status, p.eta, p.client_id, u.name as client_name
       from projects p
       join advisor_clients ac on p.client_id = ac.client_id
       join users u on p.client_id = u.id
       where ac.advisor_id = $1
       order by p.id desc`,
      [req.user.id]
    );
    
    res.json({ ok: true, projects: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/advisor/clients/:clientId/projects', auth('advisor'), async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    
    // Verify advisor has access to this client
    const access = await pool.query(
      'select 1 from advisor_clients where advisor_id=$1 and client_id=$2',
      [req.user.id, clientId]
    );
    
    if (access.rowCount === 0) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Get client projects
    const r = await pool.query(
      'select id, name, status, eta from projects where client_id=$1 order by id desc',
      [clientId]
    );
    
    res.json({ ok: true, projects: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});


// Get single project for advisor
app.get('/advisor/projects/:projectId', auth('advisor'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    
    // Verify advisor has access to this project through client assignment
    const r = await pool.query(
      `select p.* from projects p 
       join advisor_clients ac on p.client_id = ac.client_id 
       where p.id = $1 and ac.advisor_id = $2`,
      [projectId, req.user.id]
    );
    
    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Project not found or access denied' });
    }
    
    res.json({ ok: true, project: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update project for advisor
app.put('/advisor/projects/:projectId', auth('advisor'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const { status, eta, project_stage } = req.body || {};
    
    // Verify advisor has access to this project
    const access = await pool.query(
      `select 1 from projects p 
       join advisor_clients ac on p.client_id = ac.client_id 
       where p.id = $1 and ac.advisor_id = $2`,
      [projectId, req.user.id]
    );
    
    if (access.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Project not found or access denied' });
    }
    
    // Update allowed fields (but NOT project_stage directly - use stage change request instead)
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    
    if (eta !== undefined) {
      updates.push(`eta = $${paramCount++}`);
      values.push(eta);
    }
    
    // Note: project_stage changes now require client approval via stage change requests
    if (project_stage !== undefined) {
      updates.push(`project_stage = $${paramCount++}`);
      values.push(project_stage);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: 'No valid fields to update' });
    }
    
    values.push(projectId);
    
    await pool.query(
      `update projects set ${updates.join(', ')} where id = $${paramCount}`,
      values
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// AI-powered pricing suggestion for proposals
app.post('/advisor/projects/:projectId/ai-suggest-pricing', auth('advisor'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!(await ensureAdvisorAccess(projectId, req.user.id))) return res.status(403).json({ ok:false, error:'Access denied' });
    
    // Get project and idea data
    const proj = await pool.query('select name from projects where id=$1', [projectId]);
    if (proj.rowCount === 0) return res.status(404).json({ ok:false, error:'Project not found' });
    
    const ideaRes = await pool.query(
      `select * from agent_ideas where project_id=$1 order by created_at desc limit 1`,
      [projectId]
    );
    if (ideaRes.rowCount === 0) return res.status(404).json({ ok:false, error:'No project specification found' });
    
    const idea = ideaRes.rows[0];
    const projectName = proj.rows[0].name;
    
    // Use Gemini to analyze and suggest pricing
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing GEMINI_API_KEY' });
    
    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
      generationConfig: { temperature: 0.3 }
    });
    
    const prompt = `You are a pricing analyst for an AI-powered development agency. Analyze this project specification and provide accurate pricing estimates.

PROJECT: ${projectName}

SPECIFICATION:
${JSON.stringify({
  summary: idea.summary,
  steps: idea.steps,
  agent_stack: idea.agent_stack,
  client_requirements: idea.client_requirements,
  build_phases: idea.build_phases,
  security_considerations: idea.security_considerations
}, null, 2)}

TASK: Generate pricing estimates in JSON format with these fields:

{
  "human_hours": "Total hours ALL humans involved (developers, designers, QA, PM, etc.) - just the number (e.g., '360', '520', '180')",
  "human_cost": "MUST equal human_hours × $125 exactly (e.g., if 360 hours then '$45,000', if 520 hours then '$65,000')",
  "human_timeline": "Store the SAME value as human_hours with ' hours' suffix (e.g., '360 hours', '520 hours', '180 hours')",
  "ai_hours": "Hours with AI-enabled Cursor team - between 8.5% and 11% of human_hours, NEVER exactly 10% (e.g., '31', '47', '56')",
  "ai_cost": "AI team cost calculated as: ai_hours × $200/hour exactly (e.g., '$6,200', '$9,400', '$11,200')",
  "api_fees": "ONE-TIME Cursor AI build API fees - the total cost of LLM API calls to BUILD this project. Minimum $500, scale up based on complexity (e.g., '$1,200', '$2,500', '$850')"
}

CRITICAL CALCULATION RULES:
1. Calculate human_hours first based on realistic project analysis
2. human_cost MUST = human_hours × 125 (verify this calculation!)
3. human_timeline = human_hours + " hours" (e.g., "360 hours")
4. ai_hours = human_hours × (random percentage between 0.085 and 0.11, NEVER 0.10) rounded to whole number
   - Example: 520 hours × 0.091 = 47.32 → round to 47
   - Example: 360 hours × 0.105 = 37.8 → round to 38
   - IMPORTANT: Pick a percentage that is NOT 0.10 (not 10%)
5. ai_cost = ai_hours × 200 (verify this calculation!)

EXAMPLE (verify all math with 9.1% efficiency):
- Complex AI project needs 520 total human hours
- human_hours: "520"
- human_cost: "$65,000" (520 × $125 = $65,000 ✓)
- human_timeline: "520 hours"
- ai_hours: "47" (520 × 0.091 = 47.32 → 47 ✓, this is 9.1% not 10%)
- ai_cost: "$9,400" (47 × $200 = $9,400 ✓)
- api_fees: "$1,800"

GUIDELINES:
- Be precise and realistic based on the project specification
- Consider ALL roles: frontend devs, backend devs, UI/UX designers, QA engineers, project managers, DevOps
- Consider all phases from the build_phases: Scope, Discovery, UX/UI, Development, Q/C, Launch
- Break down mentally: how many hours for frontend? backend? design? testing? deployment?
- API fees are ONE-TIME costs for building the project with AI (NOT monthly recurring):
  * Simple projects (basic CRUD, few features): $500-$800
  * Medium projects (multiple integrations, AI features): $1,000-$2,000
  * Complex projects (advanced AI, multiple services, complex logic): $2,000-$5,000
  * Enterprise projects (large scale, many features): $5,000+
- Format costs as strings with $ and commas (e.g., '$15,000', '$1,200')
- Format hours as plain number strings (e.g., '360', '52')
- NEVER use approximations or ranges - use exact calculated values

Return ONLY valid JSON with exact calculations, no explanations.`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Extract JSON from response
      let jsonStr = response.trim();
      if (jsonStr.includes('```json')) {
        jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
      } else if (jsonStr.includes('```')) {
        jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
      }
      
      const pricing = JSON.parse(jsonStr);
      
      // Format the response for the frontend
      res.json({
        ok: true,
        suggestions: {
          name: projectName,
          cost: pricing.ai_cost || '',
          hours: pricing.ai_hours || '',
          api_fees: pricing.api_fees || '',
          human_cost: pricing.human_cost || '',
          human_timeline: pricing.human_timeline || ''
        }
      });
    } catch (e) {
      console.error('Error generating AI pricing:', e);
      res.status(500).json({ ok: false, error: 'Failed to generate pricing suggestions' });
    }
  } catch (e) { 
    res.status(500).json({ ok:false, error:e.message }); 
  }
});

// Advisor submits a proposal for client approval
app.post('/advisor/projects/:projectId/proposal', auth('advisor'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const { name, cost, hours, api_fees, human_cost, human_timeline } = req.body || {};
    if (!(await ensureAdvisorAccess(projectId, req.user.id))) return res.status(403).json({ ok:false, error:'Access denied' });
    const proj = await pool.query('select name, client_id from projects where id=$1', [projectId]);
    if (proj.rowCount===0) return res.status(404).json({ ok:false, error:'Project not found' });
    const displayName = name || proj.rows[0].name;
    await pool.query(`insert into project_proposals(project_id, name, cost, hours, api_fees, human_cost, human_timeline, status) 
                      values($1,$2,$3,$4,$5,$6,$7,'pending')
                      on conflict (project_id) do update set name=excluded.name, cost=excluded.cost, hours=excluded.hours, api_fees=excluded.api_fees, human_cost=excluded.human_cost, human_timeline=excluded.human_timeline, status='pending', created_at=now()`,
      [projectId, displayName, cost||'', hours||'', api_fees||'', human_cost||'', human_timeline||'']);
    // Post a formatted message to the project thread
    const grid = `PROPOSAL\n\nName: ${displayName}\nCost: ${cost||'-'}\nHours: ${hours||'-'}\nEst. API Fees: ${api_fees||'-'}\nHuman Cost: ${human_cost||'-'}\nHuman Timeline: ${human_timeline||'-'}\n\nPlease review and click Accept to proceed.`;
    await pool.query('insert into project_messages(project_id, user_id, content) values($1,$2,$3)', [projectId, req.user.id, grid]);
    // Move project to Waiting Client Feedback
    await pool.query('update projects set status=$2 where id=$1', [projectId, 'Waiting Client Feedback']);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

// Client fetch proposal
app.get('/client/projects/:projectId/proposal', auth('client'), async (req,res)=>{
  try {
    const projectId = Number(req.params.projectId);
    if (!(await ensureClientOwns(projectId, req.user.id))) return res.status(403).json({ ok:false, error:'Access denied' });
    const r = await pool.query('select * from project_proposals where project_id=$1', [projectId]);
    res.json({ ok:true, proposal: r.rows[0] || null });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

// Client accepts proposal -> project to In production
app.post('/client/projects/:projectId/proposal/accept', auth('client'), async (req,res)=>{
  try {
    const projectId = Number(req.params.projectId);
    if (!(await ensureClientOwns(projectId, req.user.id))) return res.status(403).json({ ok:false, error:'Access denied' });
    const r = await pool.query('update project_proposals set status=\'accepted\', accepted_at=now() where project_id=$1 returning *', [projectId]);
    if (r.rowCount===0) return res.status(404).json({ ok:false, error:'No proposal found' });
    await pool.query("update projects set status='In production', project_stage='Discovery' where id=$1", [projectId]);
    // Message thread note
    await pool.query('insert into project_messages(project_id, user_id, content) values($1,null,$2)', [projectId, 'Client accepted the proposal. Project moved to In production and Discovery phase.']);
    // Optionally notify via email_outbox if sequences are configured (not sending here by default)
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

// Client endpoints
app.get('/client/projects', auth('client'), async (req, res) => {
  try {
    const r = await pool.query('select id, name, status, eta from projects where client_id=$1 order by id asc', [req.user.id]);
    res.json({ ok: true, projects: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get assigned advisor for client
app.get('/client/advisor', auth('client'), async (req, res) => {
  try {
    const r = await pool.query(
      'select u.id, u.name, u.email, u.phone from advisor_clients ac join users u on ac.advisor_id = u.id where ac.client_id = $1',
      [req.user.id]
    );
    res.json({ ok: true, advisor: r.rowCount > 0 ? r.rows[0] : null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Create schedule request
app.post('/client/schedule-request', auth('client'), async (req, res) => {
  try {
    const { time_slot, meeting_description } = req.body;
    
    if (!time_slot) {
      return res.status(400).json({ ok: false, error: 'Time slot is required' });
    }
    
    // Get assigned advisor
    const advisorResult = await pool.query(
      'select advisor_id from advisor_clients where client_id = $1',
      [req.user.id]
    );
    
    if (advisorResult.rowCount === 0) {
      return res.status(400).json({ ok: false, error: 'No advisor assigned to your account' });
    }
    
    const advisorId = advisorResult.rows[0].advisor_id;
    
    // Create schedule request
    await pool.query(
      'insert into schedule_requests(client_id, advisor_id, time_slot, meeting_description) values($1,$2,$3,$4)',
      [req.user.id, advisorId, time_slot, meeting_description || '']
    );
    
    res.json({ ok: true, message: 'Your client advisor will confirm and send a calendar invite.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Admin: CRUD for webinars and signups view
app.get('/admin/webinars', auth('admin'), async (req, res) => {
  try {
    const r = await pool.query('select * from webinars order by datetime asc');
    res.json({ ok: true, webinars: r.rows });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/admin/webinars', auth('admin'), uploadWebinar.single('image'), async (req, res) => {
  try {
    const { title, description, datetime, duration } = req.body || {};
    if (!title || !datetime) return res.status(400).json({ ok:false, error:'title and datetime are required' });
    let image_url = (req.body && req.body.image_url) || '';
    if (req.file) {
      const rel = path.relative(__dirname, req.file.path).replace(/\\/g,'/');
      image_url = `/uploads/${rel.split('/').slice(-2).join('/')}`; // uploads/<project>/<filename>
    }
    const r = await pool.query(
      'insert into webinars(title, description, datetime, duration, image_url) values($1,$2,$3,$4,$5) returning *',
      [title, description || '', datetime, duration || '', image_url || '']
    );
    res.json({ ok:true, webinar: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.put('/admin/webinars/:id', auth('admin'), uploadWebinar.single('image'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { title, description, datetime, duration } = req.body || {};
    let image_url = (req.body && req.body.image_url) || undefined;
    if (req.file) {
      const rel = path.relative(__dirname, req.file.path).replace(/\\/g,'/');
      image_url = `/uploads/${rel.split('/').slice(-2).join('/')}`;
    }
    const r = await pool.query(
      `update webinars set 
         title = coalesce($2,title),
         description = coalesce($3,description),
         datetime = coalesce($4,datetime),
         duration = coalesce($5,duration),
         image_url = coalesce($6,image_url)
       where id=$1 returning *`,
      [id, title, description, datetime, duration, image_url]
    );
    if (r.rowCount === 0) return res.status(404).json({ ok:false, error:'Not found' });
    res.json({ ok:true, webinar: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.delete('/admin/webinars/:id', auth('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('delete from webinars where id=$1', [id]);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.get('/admin/webinars/:id/signups', auth('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const r = await pool.query(
      `select ws.id, ws.created_at, u.id as client_id, u.name, u.email
       from webinar_signups ws join users u on ws.client_id = u.id
       where ws.webinar_id = $1 order by ws.created_at desc`,
      [id]
    );
    res.json({ ok:true, signups: r.rows });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Client: list webinars and signup
app.get('/client/webinars', auth('client'), async (req, res) => {
  try {
    const r = await pool.query('select * from webinars order by datetime asc');
    res.json({ ok:true, webinars: r.rows });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Admin: Email templates CRUD
app.get('/admin/email/templates', auth('admin'), async (_req, res) => {
  try {
    const r = await pool.query('select * from email_templates order by id asc');
    res.json({ ok:true, templates: r.rows });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/admin/email/templates', auth('admin'), async (req, res) => {
  try {
    const { name, key, subject, body, is_system } = req.body || {};
    if (!name || !subject || !body) return res.status(400).json({ ok:false, error:'name, subject, body required' });
    const r = await pool.query('insert into email_templates(name, key, subject, body, is_system) values($1,$2,$3,$4,$5) returning *', [name, key || null, subject, body, !!is_system]);
    res.json({ ok:true, template: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.put('/admin/email/templates/:id', auth('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, key, subject, body, is_system } = req.body || {};
    const r = await pool.query(
      `update email_templates set 
        name=coalesce($2,name), key=coalesce($3,key), subject=coalesce($4,subject), body=coalesce($5,body), is_system=coalesce($6,is_system), updated_at=now()
       where id=$1 returning *`,
      [id, name, key, subject, body, is_system]
    );
    if (r.rowCount===0) return res.status(404).json({ ok:false, error:'Not found' });
    res.json({ ok:true, template: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.delete('/admin/email/templates/:id', auth('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('delete from email_templates where id=$1 and is_system=false', [id]);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Admin: Sequences CRUD
app.get('/admin/email/sequences', auth('admin'), async (_req, res) => {
  try {
    const seq = await pool.query('select * from email_sequences order by id asc');
    const steps = await pool.query('select * from email_sequence_steps order by sequence_id asc, step_order asc');
    res.json({ ok:true, sequences: seq.rows, steps: steps.rows });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/admin/email/sequences', auth('admin'), async (req, res) => {
  try {
    const { name, description, trigger, is_active } = req.body || {};
    if (!name) return res.status(400).json({ ok:false, error:'name required' });
    const r = await pool.query('insert into email_sequences(name, description, trigger, is_active) values($1,$2,$3,$4) returning *', [name, description||'', trigger||'manual', is_active!==false]);
    res.json({ ok:true, sequence: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.put('/admin/email/sequences/:id', auth('admin'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description, trigger, is_active } = req.body || {};
    const r = await pool.query('update email_sequences set name=coalesce($2,name), description=coalesce($3,description), trigger=coalesce($4,trigger), is_active=coalesce($5,is_active) where id=$1 returning *', [id, name, description, trigger, is_active]);
    if (r.rowCount===0) return res.status(404).json({ ok:false, error:'Not found' });
    res.json({ ok:true, sequence: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.delete('/admin/email/sequences/:id', auth('admin'), async (req, res) => {
  try { await pool.query('delete from email_sequences where id=$1', [Number(req.params.id)]); res.json({ ok:true }); }
  catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Steps CRUD
app.post('/admin/email/sequences/:id/steps', auth('admin'), async (req,res)=>{
  try {
    const id = Number(req.params.id);
    const { step_order, delay_minutes, template_id, notes } = req.body || {};
    const r = await pool.query('insert into email_sequence_steps(sequence_id, step_order, delay_minutes, template_id, notes) values($1,$2,$3,$4,$5) returning *', [id, step_order||1, delay_minutes||0, template_id||null, notes||'']);
    res.json({ ok:true, step: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.put('/admin/email/sequences/:id/steps/:stepId', auth('admin'), async (req,res)=>{
  try {
    const id = Number(req.params.id);
    const stepId = Number(req.params.stepId);
    const { step_order, delay_minutes, template_id, notes } = req.body || {};
    const r = await pool.query('update email_sequence_steps set step_order=coalesce($3,step_order), delay_minutes=coalesce($4,delay_minutes), template_id=coalesce($5,template_id), notes=coalesce($6,notes) where id=$2 and sequence_id=$1 returning *', [id, stepId, step_order, delay_minutes, template_id, notes]);
    if (r.rowCount===0) return res.status(404).json({ ok:false, error:'Not found' });
    res.json({ ok:true, step: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.delete('/admin/email/sequences/:id/steps/:stepId', auth('admin'), async (req,res)=>{
  try { await pool.query('delete from email_sequence_steps where id=$1 and sequence_id=$2', [Number(req.params.stepId), Number(req.params.id)]); res.json({ ok:true }); }
  catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Admin: Outbox queue (list only for now)
app.get('/admin/email/outbox', auth('admin'), async (_req,res)=>{
  try { const r = await pool.query('select * from email_outbox order by created_at desc'); res.json({ ok:true, outbox: r.rows }); }
  catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Admin: Dispatch outbox now (manual trigger)
app.post('/admin/email/dispatch-now', auth('admin'), async (_req,res)=>{
  try {
    if (!dispatchOutbox) return res.status(500).json({ ok:false, error:'Sender not available on this instance' });
    await dispatchOutbox();
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Admin: Send ad hoc email (queues in outbox)
app.post('/admin/email/send', auth('admin'), async (req,res)=>{
  try {
    const { to_user_id, to_email, subject, body, template_id, metadata, scheduled_for } = req.body || {};
    if (!subject || !body || (!to_user_id && !to_email)) return res.status(400).json({ ok:false, error:'Missing recipient or subject/body' });
    const r = await pool.query('insert into email_outbox(to_user_id, to_email, subject, body, template_id, metadata, scheduled_for) values($1,$2,$3,$4,$5,$6,$7) returning *', [to_user_id||null, to_email||null, subject, body, template_id||null, metadata||{}, scheduled_for||null]);
    if (dispatchOutbox) {
      dispatchOutbox().catch(()=>{});
    }
    res.json({ ok:true, email: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Broadcast email to all users by role; supports attachments via metadata.attachments
app.post('/admin/email/send-broadcast', auth('admin'), async (req,res)=>{
  try {
    const { role, subject, body, attachments } = req.body || {};
    if (!role || !subject || !body) return res.status(400).json({ ok:false, error:'role, subject and body required' });
    const users = await pool.query('select id, email from users where role=$1', [role]);
    for (const u of users.rows) {
      await pool.query('insert into email_outbox(to_user_id, to_email, subject, body, template_id, metadata) values($1,$2,$3,$4,$5,$6)', [u.id, u.email, subject, body, null, { attachments: attachments || [] }]);
    }
    // Optionally trigger immediate dispatch if worker is available
    if (dispatchOutbox) {
      dispatchOutbox().catch(()=>{});
    }
    res.json({ ok:true, count: users.rowCount });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Admin: Settings upsert (placeholder, values stored but not used yet)
app.get('/admin/email/settings', auth('admin'), async (_req,res)=>{
  try { const r = await pool.query('select * from email_settings order by id desc limit 1'); res.json({ ok:true, settings: r.rows[0] || null }); }
  catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/admin/email/settings', auth('admin'), async (req,res)=>{
  try {
    const { provider, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure, from_name, from_email } = req.body || {};
    const r = await pool.query('insert into email_settings(provider, smtp_host, smtp_port, smtp_username, smtp_password, smtp_secure, from_name, from_email) values($1,$2,$3,$4,$5,$6,$7,$8) returning *', [provider||'smtp', smtp_host||null, smtp_port||null, smtp_username||null, smtp_password||null, !!smtp_secure, from_name||null, from_email||null]);
    res.json({ ok:true, settings: r.rows[0] });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

app.post('/client/webinars/:id/signup', auth('client'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await pool.query('insert into webinar_signups(webinar_id, client_id) values($1,$2) on conflict (webinar_id, client_id) do nothing', [id, req.user.id]);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// Request password reset (stores in outbox for now; email sending to be wired to SMTP later)
app.post('/public/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok:false, error:'Email required' });
    const u = await pool.query('select id, name from users where email=$1', [email]);
    if (u.rowCount === 0) return res.json({ ok:true }); // do not leak
    const to_user_id = u.rows[0].id;
    const token = Math.random().toString(36).slice(2);
    // Store token with 1 hour expiry
    await pool.query('insert into password_reset_tokens(token, user_id, expires_at) values($1,$2, now() + interval \'1 hour\')', [token, to_user_id]);
    // Enqueue password reset email using template key 'password_reset'
    const tpl = await pool.query("select id, subject, body from email_templates where key='password_reset' limit 1");
    const template = tpl.rowCount > 0 ? tpl.rows[0] : null;
    const subject = template ? template.subject : 'Reset your Hyah! AI password';
    const body = template ? template.body : 'Hi {{name}},\\n\\nUse the link below to reset your password.\\n{{reset_url}}\\n\\nIf you did not request this, you can ignore this email.';
    const baseUrl = req.headers.origin || '';
    const resetUrl = baseUrl ? `${baseUrl}/reset?token=${token}` : `https://x-sourcing-front.onrender.com/reset?token=${token}`;
    await pool.query('insert into email_outbox(to_user_id, to_email, subject, body, template_id, metadata) values($1,$2,$3,$4,$5,$6)', [to_user_id, email, subject, body, template ? template.id : null, { type:'password_reset', token, name: u.rows[0].name || '', reset_url: resetUrl }]);
    if (dispatchOutbox) {
      dispatchOutbox().catch(()=>{});
    }
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

// Profile self endpoints
app.get('/me', auth(), async (req, res) => {
  try {
    const r = await pool.query('select id, role, name, email, username, company_name, website_url, phone from users where id=$1', [req.user.id]);
    res.json({ ok: true, user: r.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put('/me', auth(), async (req, res) => {
  try {
    const { name, email, username, companyName, websiteUrl, phone, password } = req.body || {};
    
    // Check if username is already taken by another user
    if (username && username !== req.user.username) {
      const existing = await pool.query('select id from users where username=$1 and id!=$2', [username, req.user.id]);
      if (existing.rowCount > 0) {
        return res.status(400).json({ ok: false, error: 'Username already taken' });
      }
    }
    
    if (password) {
      // Update with new password (hash it first)
      const hashed = await bcrypt.hash(password, 10);
      await pool.query('update users set name=coalesce($1,name), email=coalesce($2,email), username=coalesce($3,username), password=$4, company_name=coalesce($5,company_name), website_url=coalesce($6,website_url), phone=coalesce($7,phone) where id=$8', [name, email, username, hashed, companyName, websiteUrl, phone, req.user.id]);
    } else {
      // Update without changing password
      await pool.query('update users set name=coalesce($1,name), email=coalesce($2,email), username=coalesce($3,username), company_name=coalesce($4,company_name), website_url=coalesce($5,website_url), phone=coalesce($6,phone) where id=$7', [name, email, username, companyName, websiteUrl, phone, req.user.id]);
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Public ideator system prompt for landing page
const PUBLIC_IDEATOR_SYSTEM_PROMPT = `You are Hyah! AI's friendly AI consultant helping potential clients discover how we can transform their business operations. Your personality is warm, enthusiastic, and focused on showing value.

OPENING CONTEXT:
The user can start by:
1. Telling you about their company type
2. Describing a specific task or challenge
3. Providing their website URL for analysis
4. Just asking what you can do

YOUR MISSION:
- Show them how Hyah! AI can help them save 80-90% on costs while delivering faster
- Demonstrate our capabilities through relevant examples
- Guide them toward creating a free account to explore further
- Be conversational and avoid overwhelming technical details

CONVERSATION FLOW:
1. Understand their business/needs (1-2 messages)
2. Suggest 2-3 specific AI-powered solutions that would help them
3. Share a relevant success story or cost comparison
4. If they show interest, naturally guide toward signup

KEY TALKING POINTS:
- We handle everything from marketing automation to data analysis
- Dedicated advisor + AI team = senior-level work at 90% less cost
- Projects that take months traditionally get done in days
- Examples: automated reporting, content creation, data enrichment, workflow automation, customer service, lead generation

IMPORTANT RULES:
- Keep responses concise (2-3 paragraphs max)
- Use bullet points for clarity
- Always relate back to their specific situation
- Don't be pushy about signup - let interest develop naturally
- If they provide a URL, analyze it and suggest specific improvements

WHEN TO SUGGEST SIGNUP:
- After 3-4 exchanges
- When they express strong interest ("love it", "perfect", "how do we start")
- When they ask about pricing or next steps

SIGNUP PROMPT:
"I can see exactly how Hyah! AI could help [their specific situation]. To create a personalized project scope and show you the full platform, let's set up your free account. It takes just 30 seconds - what email should I use?"

Remember: You're showcasing value, not selling. Be helpful, specific, and enthusiastic about their potential.`;

// Original ideator system prompt with comprehensive instructions
const IDEATOR_SYSTEM_PROMPT = `You are an expert AI Agent Architect helping users design custom AI agents. Your role is to:

1. Guide users through a THOROUGH conversational process to understand their needs
2. Ask multiple rounds of clarifying questions to gather COMPREHENSIVE requirements
3. Suggest modern AI technologies and best practices
4. Generate detailed agent specifications with cost estimates

You should be friendly, professional, and VERY thorough. Think like a senior consultant conducting a discovery session. Always explore:

INITIAL DISCOVERY (Round 1):
- Core problem and pain points
- Target users and stakeholders
- Desired outcomes and success metrics
- Current workflow (if any)
- Platform requirements: Do they have an existing platform/app to integrate with, or do we need to build a complete frontend?

DEEP DIVE (Round 2):
- Specific features and capabilities needed
- Data sources and formats
- Integration requirements (APIs, databases, tools)
- Performance expectations
- Security and compliance needs

TECHNICAL REQUIREMENTS (Round 3):
- Expected volume/scale of operations
- Response time requirements
- Error handling preferences
- Monitoring and reporting needs
- User interface requirements (if frontend needed)

BUSINESS CONTEXT (Round 4):
- Team technical capabilities
- Change management considerations
- Future scalability needs

IMPORTANT GUIDELINES:
- When users say things like "You decide", "I'm not sure", "What do you recommend?", or "You choose what's best", take charge and make expert recommendations based on best practices
- Always explain your recommendations briefly so they understand the reasoning
- Make it clear that specifications can be edited later as requirements become clearer
- Balance thoroughness with user comfort - if they seem overwhelmed, reassure them that you can make expert choices

DEFAULT BUILD BASELINE (apply unless the user explicitly overrides):
- UI/Frontend: Next.js (App Router) + TypeScript + Tailwind CSS. Provide extensive detail on pages, components, routes, state, accessibility, responsiveness, and key UI interactions.
- Model Tier: Use a best-in-class LLM per task. Default to OpenAI GPT-4o, Anthropic Claude Opus, or Google Gemini 2.5 Pro depending on fit; state which and why. If the user has a constraint, honor it.
- Vector Store: Pinecone for embeddings/vector search when retrieval is appropriate. Specify index names, namespaces, dimension, filters, and upsert/query patterns.
- Database: PostgreSQL for transactional data. Provide a complete schema with tables, keys, indices, constraints, and representative queries. Include migration notes and data lifecycle.
- Non-negotiable: All user instructions take precedence. If the user adds extra requirements mid-conversation, incorporate them into the final spec even if not previously prompted.

DELIVERABLE SPEC CONTENTS:
- Summary (problem, outcomes)
- Detailed UI spec (Next.js + Tailwind structure, components, routes)
- Step-by-step workflow and sequence diagrams
- API design (endpoints, auth, request/response, errors)
- Data model (DDL for PostgreSQL, indices)
- Vector/RAG plan (if applicable: chunking, indexing, reranking, evaluation)
- Model selection rationale (GPT-4o / Claude Opus / Gemini 2.5 Pro)
- Security (authN/Z, PII, secrets)
- Observability (logs/metrics/traces, dashboards)
- Deployment (Render), environment variables, scaling, rollback
- Test strategy (unit/integration/e2e)
- Runbook (operations, incident response)

Remember to:
- Ask 2-3 focused questions at a time
- When users defer to your expertise, confidently recommend the best solution
- Provide examples to clarify when helpful
- Validate understanding before moving forward
- Be encouraging and reassuring, especially for non-technical users
- Let users know they can always edit the specification later`;

// Helper function to check if ready for specification
async function checkIfReadyForSpec(genAI, conversation_history) {
  const baseModelOptions = {
    model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    temperature: 0.3
  };
  
  const contents = [];
  for (const m of conversation_history) {
    if (!m || !m.role || !m.content) continue;
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: String(m.content) }] });
  }
  
  const checkPrompt = `Based on the conversation so far, do we have COMPREHENSIVE information to create a detailed agent specification?
  
  We need ALL of the following:
  1. Clear understanding of the problem and desired outcomes
  2. Detailed functionality requirements and user workflows
  3. Technical requirements (integrations, data sources, performance)
  4. Business context (timeline, budget considerations, team capabilities)
  5. At least 3-4 rounds of Q&A have occurred (minimum 3 user-model exchanges)
  6. User has provided specific, detailed answers (not just high-level)
  
  Only respond 'YES' if we have thorough, detailed information in ALL areas. Otherwise respond 'NO' so we will ask more questions.
  Respond with only 'YES' or 'NO'.`;
  
  contents.push({ role: 'user', parts: [{ text: checkPrompt }] });
  
  try {
    const result = await generateWithFallback(genAI, baseModelOptions, { contents });
    const response = result.response.text();
    return response.trim().toUpperCase() === 'YES';
  } catch (e) {
    console.error('Error checking if ready for spec:', e);
    return false;
  }
}

// Agent Ideator chat with Gemini streaming (SSE)
app.post('/agent-ideator/chat', auth(), async (req, res) => {
  try {
    const { message, conversation_history = [] } = req.body || {};
    const maxDetail = (req.query && (String(req.query.maxDetail||'')==='1'));
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing GEMINI_API_KEY' });

    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
    
    // First message - return welcome message
    if (!message && conversation_history.length === 0) {
      const welcomeMessage = `Hey there! 👋 I'm here to help you ideate and create a scope for a new AI agent. 

I'll guide you through the process, and by the end, we'll have a comprehensive specification including the technical stack, workflow, and requirements.

To get started, please tell me about the agent you have in mind. You can share:
- What problem it should solve
- Who will use it
- Any specific functionality you need
- Whether you have an existing platform/app to integrate with

Don't worry about being too technical - just explain it in your own words, and I'll ask clarifying questions as needed. 

If you're unsure about any technical details, just let me know and I'll recommend the best approach based on industry best practices. You can always edit the specification later as your requirements become clearer.`;
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Stream the welcome message word by word
      const words = welcomeMessage.split(' ');
      for (const word of words) {
        res.write(`data: ${JSON.stringify({ content: word + ' ' })}\n\n`);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    }

    // Check if we should generate specification
    const textMessage = String(message || '');
    const isDoneCommand = /\/(done|complete|finalize)\/?/i.test(textMessage);
    const shouldGenerateSpec = isDoneCommand || await checkIfReadyForSpec(genAI, [...conversation_history, { role: 'user', content: textMessage }]);
    
    if (shouldGenerateSpec) {
      // Generate complete specification
      const specModelBase = {
        model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
        temperature: 0.3
      };
      
      const specContents = [];
      for (const m of conversation_history) {
        if (!m || !m.role || !m.content) continue;
        const role = m.role === 'assistant' ? 'model' : 'user';
        specContents.push({ role, parts: [{ text: String(m.content) }] });
      }
      specContents.push({ role: 'user', parts: [{ text: String(message) }] });
      
      // If user used /done/, add a note to work with incomplete information
      const specPrompt = `Based on our conversation, generate a comprehensive agent specification in JSON format${isDoneCommand ? '. The user has requested immediate specification generation, so make intelligent assumptions based on best practices and industry standards for any missing information' : ''}. ${maxDetail ? 'Maximize detail in every section with multi-level headings, examples, tables, and diagrams.' : 'Be thorough but concise.'} Use tables where helpful. with these sections:

{
    "title": "Descriptive agent name",
    "agent_type": "one of: customer_service, data_analysis, content_creation, process_automation, or other",
    "summary": "2-3 sentence overview of the agent's purpose and value",
    "steps": [
        "Clear, action-oriented description with sub-tasks and technical details for the first phase",
        "Next step in the workflow with specific implementation details",
        ...
    ],
    "build_phases": [
        {
            "phase": "Scope",
            "description": "Initial project scoping and requirements gathering",
            "tasks": [
                "Define project goals and objectives",
                "Identify key stakeholders and their requirements",
                "Document technical constraints and dependencies",
                "Establish success criteria and KPIs"
            ],
            "deliverables": [
                "Project scope document",
                "Requirements specification",
                "Initial timeline and budget estimate"
            ],
            "duration": "1-2 weeks"
        },
        {
            "phase": "Discovery",
            "description": "Deep dive into technical architecture and design planning",
            "tasks": [
                "Design system architecture and data flows",
                "Select optimal tech stack and LLM models",
                "Plan integration points and APIs",
                "Create detailed technical specifications",
                "Set up development environment and infrastructure"
            ],
            "deliverables": [
                "Technical architecture document",
                "System design diagrams",
                "Infrastructure setup",
                "Development environment configuration"
            ],
            "duration": "1-2 weeks"
        },
        {
            "phase": "UX/UI",
            "description": "User experience design and interface development",
            "tasks": [
                "Create user journey maps and workflows",
                "Design wireframes and mockups",
                "Develop interactive prototypes",
                "Conduct user testing and gather feedback",
                "Finalize UI components and design system"
            ],
            "deliverables": [
                "UX wireframes and user flows",
                "High-fidelity UI mockups",
                "Interactive prototype",
                "Design system documentation"
            ],
            "duration": "2-3 weeks"
        },
        {
            "phase": "Development",
            "description": "Core development and implementation of features",
            "tasks": [
                "Implement backend services and APIs",
                "Integrate LLM and AI components",
                "Build frontend interfaces",
                "Set up data pipelines and storage",
                "Implement security and authentication",
                "Integrate third-party services and APIs"
            ],
            "deliverables": [
                "Functional backend system",
                "Integrated AI/LLM components",
                "Complete frontend application",
                "API documentation",
                "Security implementation"
            ],
            "duration": "4-6 weeks"
        },
        {
            "phase": "Q/C",
            "description": "Quality assurance and comprehensive testing",
            "tasks": [
                "Perform unit and integration testing",
                "Conduct end-to-end testing scenarios",
                "Test LLM performance and accuracy",
                "Security and vulnerability testing",
                "Performance and load testing",
                "User acceptance testing (UAT)",
                "Bug fixes and optimization"
            ],
            "deliverables": [
                "Test reports and coverage metrics",
                "Bug tracking and resolution log",
                "Performance benchmarks",
                "Security audit report",
                "UAT sign-off"
            ],
            "duration": "2-3 weeks"
        },
        {
            "phase": "Launch",
            "description": "Production deployment and go-live preparation",
            "tasks": [
                "Prepare production environment",
                "Deploy to production infrastructure",
                "Configure monitoring and alerting",
                "Set up logging and analytics",
                "Conduct final smoke tests",
                "Train users and prepare documentation",
                "Execute launch plan and communications"
            ],
            "deliverables": [
                "Production deployment",
                "Monitoring dashboards",
                "User documentation and training materials",
                "Launch announcement and communications",
                "Post-launch support plan"
            ],
            "duration": "1-2 weeks"
        }
    ],
    "agent_stack": {
        "llm_model": {
            "primary_model": {
                "recommendation": "Best primary model based on use case (e.g., Claude 3 Opus for complex reasoning, GPT-4 for general tasks, Gemini 1.5 Pro for long context, Mistral for efficiency)",
                "provider": "Provider name (Anthropic, OpenAI, Google, etc.)",
                "strengths": ["List of specific strengths for this use case"],
                "reasoning": "Detailed explanation of why this model excels for these requirements"
            },
            "specialized_models": {
                "vision": {
                    "model": "Best vision model if images are involved (e.g., GPT-4V, Claude 3 Vision, Gemini Pro Vision)",
                    "use_cases": "When to use this model"
                },
                "code_generation": {
                    "model": "Best for code tasks (e.g., Claude 3 for complex code, GPT-4 for general coding, Codex/Copilot for IDE integration)",
                    "use_cases": "When to use this model"
                },
                "data_analysis": {
                    "model": "Best for data/math (e.g., Code Interpreter GPT-4, Claude 3 with tools, Gemini with Code Execution)",
                    "use_cases": "When to use this model"
                },
                "fast_inference": {
                    "model": "Fast, cost-effective model (e.g., Claude 3 Haiku, GPT-3.5-turbo, Mistral 7B)",
                    "use_cases": "For high-volume, simple tasks"
                }
            },
            "router_configuration": {
                "enabled": "true/false - whether to use LLM routing",
                "routing_strategy": "How to decide which model to use (e.g., task-based, complexity-based, cost-optimized)",
                "router_logic": "Specific routing rules or ML-based router recommendation",
                "fallback_model": "Model to use if router fails"
            },
            "cost_optimization": {
                "strategy": "How to balance performance vs cost",
                "estimated_monthly_cost": "Rough estimate based on expected usage"
            }
        },
        "vector_database": {
            "recommendation": "ALWAYS include (e.g., Pinecone for production, Weaviate for hybrid search, Qdrant for on-premise, ChromaDB for development)",
            "purpose": "Store embeddings for long-term memory, training data, and retrieval",
            "reasoning": "Why this specific vector DB is recommended",
            "configuration": {
                "index_type": "Type of index (e.g., HNSW, IVF)",
                "dimensions": "Based on embedding model",
                "metric": "Distance metric (cosine, euclidean, etc.)"
            }
        },
        "retrieval_system": {
            "recommendation": "Advanced retrieval method (e.g., RAG with reranking, Hybrid RAG+BM25, GraphRAG for connected data)",
            "components": {
                "retriever": "Primary retrieval method",
                "reranker": "Model for reranking (e.g., Cohere Rerank, BGE-reranker)",
                "hybrid_search": "Combining vector + keyword search",
                "query_expansion": "Methods to improve recall"
            },
            "reasoning": "How this enhances the agent's capabilities"
        },
        "embedding_model": {
            "recommendation": "Best embedding model for this use case (e.g., OpenAI ada-002 for general, BGE-large for multilingual, Instructor for task-specific)",
            "dimensions": "Embedding dimensions and why",
            "special_requirements": "Any specific needs (multilingual, domain-specific, etc.)"
        },
        "orchestration": {
            "framework": "Tool for managing workflows (e.g., LangChain for flexibility, AutoGen for multi-agent, CrewAI for team simulation, Custom for specific needs)",
            "reasoning": "Why this framework fits the requirements",
            "agent_architecture": "Single agent, multi-agent, or hierarchical"
        },
        "integrations": [
            {
                "service": "API or service name",
                "purpose": "What it's used for",
                "security": "How credentials are handled"
            }
        ],
        "frontend": {
            "framework": "UI framework if needed",
            "features": "Key UI features and interactions"
        },
        "monitoring": {
            "tools": "Observability and analytics tools (e.g., LangSmith, Helicone, Custom dashboards)",
            "metrics": "Key metrics to track",
            "llm_monitoring": "Specific LLM usage and performance tracking"
        },
        "infrastructure": {
            "hosting": "Recommended hosting solution",
            "scalability": "How the system scales",
            "gpu_requirements": "If needed for local model deployment"
        }
    },
    "security_considerations": {
        "data_handling": {
            "encryption_at_rest": "How data is encrypted when stored",
            "encryption_in_transit": "How data is encrypted during transmission",
            "data_retention": "Policies for data retention and deletion"
        },
        "access_control": {
            "authentication": "Method for user authentication",
            "authorization": "Role-based access control details",
            "api_security": "API key management and rotation"
        },
        "compliance": {
            "standards": ["Relevant compliance standards (GDPR, HIPAA, SOC2, etc.)"],
            "audit_logging": "What actions are logged for audit"
        },
        "advanced_security_options": {
            "private_deployment": "Options for on-premise or VPC deployment",
            "zero_trust": "Zero-trust architecture considerations",
            "secrets_management": "Using services like HashiCorp Vault or AWS Secrets Manager",
            "data_isolation": "Multi-tenant data isolation strategies"
        }
    },
    "client_requirements": [
        "Specific access or resources needed from the client with detailed explanation",
        "API keys or credentials required and how they'll be secured",
        "Data access requirements and compliance needs",
        "Infrastructure requirements if any",
        ...
    ],
    "future_enhancements": [
        {
            "enhancement": "Advanced feature or capability",
            "description": "Detailed description of what this would add",
            "impact": "Business impact and user benefits",
            "implementation_effort": "Estimated effort to implement"
        },
        ... (at least 4-5 innovative enhancement ideas)
    ],
    "implementation_estimate": {
        "traditional_approach": {
            "hours": "Estimated hours for traditional development",
            "breakdown": {
                "planning": "X hours - detailed planning activities",
                "development": "X hours - core development work",
                "testing": "X hours - comprehensive testing",
                "deployment": "X hours - deployment and configuration",
                "documentation": "X hours - user and technical documentation"
            },
            "total_cost": "Estimated cost at $150/hour"
        },
        "ai_powered_approach": {
            "hours": "10% of traditional hours",
            "methodology": "Using AI-driven development with advanced tooling",
            "ai_tools_used": ["List of AI tools that accelerate development"],
            "cost_savings": "90% reduction from traditional approach",
            "total_cost": "10% of traditional cost",
            "additional_benefits": ["Faster iteration", "Built-in best practices", "Continuous improvement"]
        }
    },
    "summary_message": "A friendly message summarizing what we've created and the value proposition",
    "client_requirements": [
        "List of specific requirements gathered from the client",
        "Technical requirements and constraints",
        "Business goals and objectives",
        "Integration requirements",
        "Performance expectations"
    ],
    "security_considerations": [
        "Data encryption at rest and in transit",
        "API authentication and authorization",
        "Role-based access control",
        "Audit logging and monitoring",
        "Compliance with relevant regulations",
        "Regular security updates and patches"
    ]
}

IMPORTANT GUIDELINES FOR LLM SELECTION:
- NEVER default to just GPT-4 for everything
- Consider the specific use case: Claude 3 excels at complex reasoning and code, Gemini 1.5 Pro handles long context best, GPT-4 is versatile
- For vision tasks: Always recommend specialized vision models
- For high-volume tasks: Always include a fast inference option
- Always suggest LLM routing when multiple capabilities are needed
- Consider cost implications and provide optimization strategies
- Include open-source alternatives when appropriate (Llama 3, Mistral, etc.)

OTHER IMPORTANT NOTES: 
- ALWAYS include vector databases for long-term memory and training, even for simple use cases
- ALWAYS include advanced retrieval (RAG/CAG/MCP) to ensure scalability
- Provide detailed explanations for each technical choice
- Include comprehensive security considerations
- Generate innovative future enhancement ideas that extend the core functionality
- Be specific and detailed in all sections`;
      
      specContents.push({ role: 'user', parts: [{ text: specPrompt }] });
      
      try {
        const specResult = await generateWithFallback(genAI, specModelBase, { contents: specContents, generationConfig: { maxOutputTokens: maxDetail ? 8192 : 4096 } });
        const specText = specResult.response.text();
        
        // Extract JSON from response
        let jsonStr = specText;
        if (jsonStr.includes('```json')) {
          jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
        } else if (jsonStr.includes('```')) {
          jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
        }
        
        const specification = JSON.parse(jsonStr);
        
        // Ensure we have a summary message
        if (!specification.summary_message) {
          specification.summary_message = `Great! I've created a comprehensive specification for your "${specification.title}". This includes all the technical details, implementation steps, and requirements we discussed. You can now view the full project scope in your projects list.`;
        }
        
        // Ensure security_considerations is always populated as an array of bullets for UI
        const defaultSecurity = [
          'Data encryption at rest and in transit',
          'API authentication and authorization',
          'Role-based access control',
          'Audit logging and monitoring',
          'Compliance with relevant regulations (GDPR/SOC2 as applicable)'
        ];
        if (!specification.security_considerations) {
          specification.security_considerations = defaultSecurity;
        } else if (!Array.isArray(specification.security_considerations)) {
          try {
            // Flatten object to bullets
            const bullets = [];
            const walk = (v, path=[]) => {
              if (v == null) return;
              if (Array.isArray(v)) v.forEach(x => walk(x, path));
              else if (typeof v === 'object') {
                Object.entries(v).forEach(([k, val]) => {
                  if (val != null && typeof val !== 'object') bullets.push(`${[...path, k].join(' / ')}: ${String(val)}`);
                  else walk(val, [...path, k]);
                });
              } else bullets.push(String(v));
            };
            walk(specification.security_considerations);
            specification.security_considerations = bullets.length ? bullets : defaultSecurity;
          } catch {
            specification.security_considerations = defaultSecurity;
          }
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.json({
          response: specification.summary_message,
          complete: true,
          specification: specification
        });
      } catch (e) {
        console.error('Error generating specification:', e);
        // Fall back to regular response
        const modelBase = {
          model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
          systemInstruction: IDEATOR_SYSTEM_PROMPT,
        };
        
        const contents = [];
        for (const m of conversation_history) {
          if (!m || !m.role || !m.content) continue;
          const role = m.role === 'assistant' ? 'model' : 'user';
          contents.push({ role, parts: [{ text: String(m.content) }] });
        }
        contents.push({ role: 'user', parts: [{ text: String(message) }] });
        
        // Force non-stream generateContent for consistency; simulate SSE chunking
        const fallback = await generateWithFallback(genAI, modelBase, { contents });
        const text = fallback.response.text() || '';
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const parts = text.split(/(\s+)/);
        for (const p of parts) { if (p) res.write(`data: ${JSON.stringify({ content: p })}\n\n`); }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      }
    } else {
      // Regular conversation - continue gathering information
      const modelBase = {
        model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
        systemInstruction: IDEATOR_SYSTEM_PROMPT,
      };

      // Build contents from history
      const contents = [];
      for (const m of conversation_history) {
        if (!m || !m.role || !m.content) continue;
        const role = m.role === 'assistant' ? 'model' : 'user';
        contents.push({ role, parts: [{ text: String(m.content) }] });
      }
      
      if (message) contents.push({ role: 'user', parts: [{ text: String(message) }] });

      // Force non-stream generateContent for consistency; simulate SSE chunking
      try {
      const fallback = await generateWithFallback(genAI, modelBase, { contents });
        const text = fallback.response.text() || '';
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        const parts = text.split(/(\s+)/);
        for (const p of parts) { if (p) res.write(`data: ${JSON.stringify({ content: p })}\n\n`); }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (e) {
        console.error('Error in agent-ideator/chat:', e);
        try {
          res.writeHead(200, { 'Content-Type': 'text/event-stream' });
          res.write(`data: ${JSON.stringify({ error: e.message || 'stream error' })}\n\n`);
          res.end();
        } catch {
          res.status(500).json({ ok: false, error: e.message });
        }
      }
    }
  } catch (e) {
    console.error('Error in /agent-ideator/chat (outer):', e);
    try {
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ error: (e && e.message) ? e.message : 'error' })}\n\n`);
      return res.end();
    } catch (err2) {
      return res.status(500).json({ ok: false, error: (e && e.message) ? e.message : 'error' });
    }
  }
});

// Save draft project with chat history
app.post('/projects/draft', auth(), async (req, res) => {
  try {
    const { title, conversation_history = [], clientId } = req.body || {};
    
    // Determine the client_id
    let targetClientId = req.user.id;
    
    if (req.user.role === 'advisor') {
      // Advisors must specify a clientId
      if (!clientId) {
        return res.status(400).json({ ok: false, error: 'Advisors must specify clientId' });
      }
      // Verify advisor has access to this client
      const access = await pool.query(
        'select 1 from advisor_clients where advisor_id=$1 and client_id=$2',
        [req.user.id, Number(clientId)]
      );
      if (access.rowCount === 0) {
        return res.status(403).json({ ok: false, error: 'Access denied to this client' });
      }
      targetClientId = Number(clientId);
    }
    
    // Create a draft project
    const pr = await pool.query(
      'insert into projects(client_id, name, status, eta, chat_history) values($1,$2,$3,$4,$5) returning id',
      [targetClientId, title || 'Draft Project', 'Draft', null, JSON.stringify(conversation_history)]
    );
    
    res.json({ ok: true, projectId: pr.rows[0].id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update draft project chat history
app.put('/projects/:id/draft', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { title, conversation_history = [] } = req.body || {};
    
    // Verify ownership or advisor access
    let pr;
    if (req.user.role === 'client') {
      pr = await pool.query('select id from projects where id=$1 and client_id=$2 and status=$3', [projectId, req.user.id, 'Draft']);
    } else if (req.user.role === 'advisor') {
      // Verify advisor has access to the client who owns this project
      pr = await pool.query(
        `select p.id from projects p 
         join advisor_clients ac on p.client_id = ac.client_id 
         where p.id = $1 and ac.advisor_id = $2 and p.status = 'Draft'`,
        [projectId, req.user.id]
      );
    } else {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: 'Draft project not found' });
    
    // Update the draft
    await pool.query(
      'update projects set name=$1, chat_history=$2 where id=$3',
      [title, JSON.stringify(conversation_history), projectId]
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get draft project with chat history
app.get('/projects/:id/draft', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    
    let r;
    if (req.user.role === 'client') {
      r = await pool.query(
        'select id, name, status, chat_history from projects where id=$1 and client_id=$2 and status=$3',
        [projectId, req.user.id, 'Draft']
      );
    } else if (req.user.role === 'advisor') {
      // Verify advisor has access to the client who owns this project
      r = await pool.query(
        `select p.id, p.name, p.status, p.chat_history 
         from projects p 
         join advisor_clients ac on p.client_id = ac.client_id 
         where p.id = $1 and ac.advisor_id = $2 and p.status = 'Draft'`,
        [projectId, req.user.id]
      );
    } else {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'Draft project not found' });
    
    const project = r.rows[0];
    res.json({
      ok: true,
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        conversation_history: project.chat_history || []
      }
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete draft project
app.delete('/projects/:id/draft', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    
    // Verify ownership or advisor access, then delete
    let pr;
    if (req.user.role === 'client') {
      pr = await pool.query('delete from projects where id=$1 and client_id=$2 and status=$3 returning id', [projectId, req.user.id, 'Draft']);
    } else if (req.user.role === 'advisor') {
      // For advisors, first verify access then delete
      const access = await pool.query(
        `select p.id from projects p 
         join advisor_clients ac on p.client_id = ac.client_id 
         where p.id = $1 and ac.advisor_id = $2 and p.status = 'Draft'`,
        [projectId, req.user.id]
      );
      if (access.rowCount > 0) {
        pr = await pool.query('delete from projects where id=$1 and status=$2 returning id', [projectId, 'Draft']);
      } else {
        pr = { rowCount: 0 };
      }
    } else {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: 'Draft project not found' });
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Persist an agent idea and also create a project for the client
app.post('/agent-ideas', auth(), async (req, res) => {
  try {
    const id = String(Date.now());
    const { title, summary, steps = [], agent_stack = {}, client_requirements = [], implementation_estimate = null, security_considerations = null, future_enhancements = null, build_phases = null, projectId = null, assignClientId = null, nodeId = null, mode = 'project' } = req.body || {};
    
    let finalProjectId = projectId;
    let ownerClientId = req.user.role === 'client' ? req.user.id : null;
    if (req.user.role === 'advisor' && assignClientId) {
      // Verify advisor manages this client
      const access = await pool.query('select 1 from advisor_clients where advisor_id=$1 and client_id=$2', [req.user.id, assignClientId]);
      if (access.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied for client' });
      ownerClientId = Number(assignClientId);
    }
    
    // If projectId is provided (from draft), update the existing project
    if (mode === 'idea') {
      // Store as an idea only (no project yet). ownerClientId must be set for advisors; for clients use req.user.id
      const ideaUserId = ownerClientId || req.user.id;
      await pool.query(
        'insert into agent_ideas(id, title, summary, steps, agent_stack, client_requirements, implementation_estimate, security_considerations, future_enhancements, build_phases, user_id, project_id, status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
        [id, title, summary, JSON.stringify(steps), JSON.stringify(agent_stack), JSON.stringify(client_requirements), JSON.stringify(implementation_estimate), JSON.stringify(security_considerations), JSON.stringify(future_enhancements), JSON.stringify(build_phases), ideaUserId, null, 'idea']
      );
      return res.json({ ok: true, id, projectId: null });
    }

    if (projectId) {
      await pool.query(
        'update projects set status=$1, name=$4 where id=$2 and client_id=$3',
        ['Pending Advisor', projectId, ownerClientId || req.user.id, title || 'New Project']
      );
    } else {
      // Create a new project as Pending Advisor until advisor approves
      const pr = await pool.query('insert into projects(client_id, name, status, eta) values($1,$2,$3,$4) returning id', [ownerClientId || req.user.id, title || 'New Project', 'Pending Advisor', null]);
      finalProjectId = pr.rows[0].id;
    }
    
    await pool.query(
      'insert into agent_ideas(id, title, summary, steps, agent_stack, client_requirements, implementation_estimate, security_considerations, future_enhancements, build_phases, user_id, project_id) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',
      [id, title, summary, JSON.stringify(steps), JSON.stringify(agent_stack), JSON.stringify(client_requirements), JSON.stringify(implementation_estimate), JSON.stringify(security_considerations), JSON.stringify(future_enhancements), JSON.stringify(build_phases), req.user.id, finalProjectId]
    );
    
    // Link the project back to the roadmap node if nodeId was provided
    if (nodeId && finalProjectId) {
      await pool.query(
        'update roadmap_nodes set project_id = $1, status = $2 where id = $3',
        [finalProjectId, 'in-progress', Number(nodeId)]
      );
      console.log(`Linked project ${finalProjectId} to roadmap node ${nodeId}`);
    }
    
    res.json({ ok: true, id, projectId: finalProjectId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// List ideas for logged-in client (ideas not yet converted)
app.get('/client/ideas', auth('client'), async (req, res) => {
  try {
    const r = await pool.query(
      `select id, title, summary, implementation_estimate, created_at from agent_ideas 
       where user_id=$1 and (project_id is null) and coalesce(status,'idea') in ('idea','draft')
       order by created_at desc limit 50`,
      [req.user.id]
    );
    const ideas = r.rows.map(row => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      implementation_estimate: row.implementation_estimate || null,
      created_at: row.created_at
    }))
    res.json({ ok: true, ideas });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Convert a client idea into a project
app.post('/client/ideas/:id/convert', auth('client'), async (req, res) => {
  try {
    const ideaId = String(req.params.id);
    const r = await pool.query('select id, title from agent_ideas where id=$1 and user_id=$2 and project_id is null', [ideaId, req.user.id]);
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'Idea not found' });
    const title = r.rows[0].title || 'New Project';
    const pr = await pool.query('insert into projects(client_id, name, status, eta) values($1,$2,$3,$4) returning id', [req.user.id, title, 'Pending Advisor', null]);
    const projectId = pr.rows[0].id;
    await pool.query('update agent_ideas set project_id=$1, status=$2 where id=$3', [projectId, 'Pending Advisor', ideaId]);
    res.json({ ok: true, projectId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// List advisor's own pre-built ideas (not yet assigned to a project)
app.get('/advisor/ideas', auth('advisor'), async (req, res) => {
  try {
    const r = await pool.query(
      `select id, title, summary, implementation_estimate, created_at from agent_ideas 
       where user_id=$1 and project_id is null and coalesce(status,'idea') in ('idea','draft')
       order by created_at desc limit 100`,
      [req.user.id]
    );
    res.json({ ok: true, ideas: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Generic idea detail by id (RBAC: owner advisor/client or admin)
app.get('/ideas/:id', auth(), async (req, res) => {
  try {
    const ideaId = String(req.params.id);
    let q = 'select * from agent_ideas where id=$1';
    const params = [ideaId];
    if (req.user.role === 'advisor') {
      q += ' and user_id=$2';
      params.push(req.user.id);
    } else if (req.user.role === 'client') {
      q += ' and user_id=$2';
      params.push(req.user.id);
    }
    const r = await pool.query(q, params);
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'Idea not found' });
    const row = r.rows[0];
    const parseJSONMaybe = (v, fallback) => {
      if (v == null) return fallback;
      if (typeof v === 'string') {
        try { return JSON.parse(v); } catch { return fallback; }
      }
      return v;
    };
    let idea = {
      id: row.id,
      title: row.title,
      summary: row.summary,
      steps: parseJSONMaybe(row.steps, []),
      agent_stack: parseJSONMaybe(row.agent_stack, {}),
      client_requirements: parseJSONMaybe(row.client_requirements, []),
      implementation_estimate: parseJSONMaybe(row.implementation_estimate, null),
      security_considerations: parseJSONMaybe(row.security_considerations, []),
      future_enhancements: parseJSONMaybe(row.future_enhancements, []),
      status: row.status,
      project_id: row.project_id,
      created_at: row.created_at
    };
    // If this client's idea is thin (older assignment that lacked full fields), enrich from their advisor's prebuilt with the same title
    const isEmpty = (v) => v == null || (Array.isArray(v) && v.length === 0) || (typeof v === 'object' && !Array.isArray(v) && Object.keys(v || {}).length === 0);
    const thin = isEmpty(idea.steps) && isEmpty(idea.agent_stack) && isEmpty(idea.client_requirements) && isEmpty(idea.security_considerations) && isEmpty(idea.future_enhancements);
    if (thin && req.user.role === 'client') {
      try {
        const ac = await pool.query('select advisor_id from advisor_clients where client_id=$1 limit 1', [req.user.id]);
        if (ac.rowCount > 0) {
          const advisorId = ac.rows[0].advisor_id;
          const fill = await pool.query(
            `select * from agent_ideas where user_id=$1 and project_id is null and title=$2 order by created_at desc limit 1`,
            [advisorId, idea.title]
          );
          if (fill.rowCount > 0) {
            const src = fill.rows[0];
            idea = {
              ...idea,
              steps: parseJSONMaybe(src.steps, idea.steps),
              agent_stack: parseJSONMaybe(src.agent_stack, idea.agent_stack),
              client_requirements: parseJSONMaybe(src.client_requirements, idea.client_requirements),
              implementation_estimate: parseJSONMaybe(src.implementation_estimate, idea.implementation_estimate),
              security_considerations: parseJSONMaybe(src.security_considerations, idea.security_considerations),
              future_enhancements: parseJSONMaybe(src.future_enhancements, idea.future_enhancements),
            };
          }
        }
        // If still thin, fall back to any latest prebuilt with the same title (cross-owner) to populate fields
        const stillThin = isEmpty(idea.steps) && isEmpty(idea.agent_stack) && isEmpty(idea.client_requirements) && isEmpty(idea.security_considerations) && isEmpty(idea.future_enhancements);
        if (stillThin) {
          // First try exact title anywhere
          let anyFill = await pool.query(
            `select * from agent_ideas where project_id is null and coalesce(status,'idea') in ('idea','draft') and title=$1 order by created_at desc limit 1`,
            [idea.title]
          );
          // If not found, try fuzzy match using a prefix of the title
          if (anyFill.rowCount === 0) {
            const frag = (idea.title || '').slice(0, 24);
            if (frag) {
              anyFill = await pool.query(
                `select * from agent_ideas where project_id is null and coalesce(status,'idea') in ('idea','draft') and title ilike $1 order by created_at desc limit 1`,
                [`%${frag}%`]
              );
            }
          }
          if (anyFill.rowCount > 0) {
            const src = anyFill.rows[0];
            idea = {
              ...idea,
              steps: parseJSONMaybe(src.steps, idea.steps),
              agent_stack: parseJSONMaybe(src.agent_stack, idea.agent_stack),
              client_requirements: parseJSONMaybe(src.client_requirements, idea.client_requirements),
              implementation_estimate: parseJSONMaybe(src.implementation_estimate, idea.implementation_estimate),
              security_considerations: parseJSONMaybe(src.security_considerations, idea.security_considerations),
              future_enhancements: parseJSONMaybe(src.future_enhancements, idea.future_enhancements),
            };
          }
        }
      } catch {}
    }
    res.json({ ok: true, idea });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update an idea (advisor owner or admin)
app.put('/ideas/:id', auth(), async (req, res) => {
  try {
    if (!(req.user.role === 'advisor' || req.user.role === 'admin')) return res.status(403).json({ ok: false, error: 'Forbidden' });
    const ideaId = String(req.params.id);
    // Ensure ownership for advisors
    if (req.user.role === 'advisor') {
      const own = await pool.query('select 1 from agent_ideas where id=$1 and user_id=$2', [ideaId, req.user.id]);
      if (own.rowCount === 0) return res.status(403).json({ ok: false, error: 'Not owner' });
    }
    const allowed = ['title','summary','steps','agent_stack','client_requirements','implementation_estimate','security_considerations','future_enhancements','build_phases','status'];
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key of allowed) {
      if (key in req.body) {
        if (['steps','agent_stack','client_requirements','implementation_estimate','security_considerations','future_enhancements','build_phases'].includes(key)) {
          sets.push(`${key} = $${idx++}`);
          params.push(JSON.stringify(req.body[key]));
        } else {
          sets.push(`${key} = $${idx++}`);
          params.push(req.body[key]);
        }
      }
    }
    if (sets.length === 0) return res.json({ ok: true });
    params.push(ideaId);
    await pool.query(`update agent_ideas set ${sets.join(', ')}, updated_at = now() where id=$${idx}`, params);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete a client idea (only if not yet converted)
app.delete('/client/ideas/:id', auth('client'), async (req, res) => {
  try {
    const ideaId = String(req.params.id);
    const r = await pool.query('delete from agent_ideas where id=$1 and user_id=$2 and project_id is null', [ideaId, req.user.id]);
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'Idea not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get latest agent idea by project id
app.get('/agent-ideas/by-project/:projectId', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) return res.status(400).json({ ok: false, error: 'Invalid projectId' });
    
    // Permission check based on role
    if (req.user.role === 'client') {
      // Clients can only access their own projects
      const pr = await pool.query('select id from projects where id=$1 and client_id=$2', [projectId, req.user.id]);
      if (pr.rowCount === 0) return res.status(404).json({ ok: false, error: 'Project not found' });
    } else if (req.user.role === 'advisor') {
      // Advisors can access projects of their assigned clients
      const access = await pool.query(
        `select 1 from projects p 
         join advisor_clients ac on p.client_id = ac.client_id 
         where p.id = $1 and ac.advisor_id = $2`,
        [projectId, req.user.id]
      );
      if (access.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    // Admins have access to all projects
    const r = await pool.query(
      `select ai.*, p.name as project_name from agent_ideas ai join projects p on ai.project_id=p.id
       where ai.project_id=$1 order by ai.created_at desc limit 1`,
      [projectId]
    );
    if (r.rowCount === 0) return res.json({ ok: true, idea: null });
    const row = r.rows[0];
    // Parse JSON fields if needed
    const idea = {
      id: row.id,
      title: row.title,
      summary: row.summary,
      steps: row.steps || [],
      agent_stack: row.agent_stack || {},
      client_requirements: row.client_requirements || [],
      implementation_estimate: row.implementation_estimate || null,
      security_considerations: row.security_considerations || [],
      future_enhancements: row.future_enhancements || [],
      build_phases: row.build_phases || [],
      status: row.status,
      agent_type: row.agent_type,
      project_id: row.project_id,
      project_name: row.project_name,
    };
    res.json({ ok: true, idea });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update agent idea by id (partial update)
app.put('/agent-ideas/:id', auth(), async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['title','summary','steps','agent_stack','client_requirements','implementation_estimate','security_considerations','future_enhancements','build_phases','status','agent_type'];
    const body = req.body || {};
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        sets.push(`${key}=$${i++}`);
        const v = ['steps','agent_stack','client_requirements','implementation_estimate','security_considerations','future_enhancements','build_phases'].includes(key) && body[key] != null ? JSON.stringify(body[key]) : body[key];
        values.push(v);
      }
    }
    if (sets.length === 0) return res.status(400).json({ ok: false, error: 'No fields to update' });
    values.push(id);
    const sql = `update agent_ideas set ${sets.join(', ')}, updated_at=now() where id=$${values.length}`;
    await pool.query(sql, values);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Project communications endpoints
app.get('/projects/:id/messages', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ ok: false, error: 'Invalid project id' });
    // Access control: client must own project, advisor must be assigned
    if (req.user.role === 'client') {
      const pr = await pool.query('select 1 from projects where id=$1 and client_id=$2', [projectId, req.user.id]);
      if (pr.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    if (req.user.role === 'advisor') {
      const access = await pool.query(
        `select 1 from projects p join advisor_clients ac on p.client_id=ac.client_id where p.id=$1 and ac.advisor_id=$2`,
        [projectId, req.user.id]
      );
      if (access.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    // Admin can read all
    const r = await pool.query(
      `select m.id, m.content, m.created_at, u.name as author_name, u.role as author_role
       from project_messages m left join users u on m.user_id=u.id
       where m.project_id=$1 order by m.created_at asc`,
      [projectId]
    );
    res.json({ ok: true, messages: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/projects/:id/messages', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const { content } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ ok: false, error: 'Message content required' });
    // Access checks same as GET
    if (req.user.role === 'client') {
      const pr = await pool.query('select 1 from projects where id=$1 and client_id=$2', [projectId, req.user.id]);
      if (pr.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    if (req.user.role === 'advisor') {
      const access = await pool.query(
        `select 1 from projects p join advisor_clients ac on p.client_id=ac.client_id where p.id=$1 and ac.advisor_id=$2`,
        [projectId, req.user.id]
      );
      if (access.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    await pool.query('insert into project_messages(project_id, user_id, content) values($1,$2,$3)', [projectId, req.user.id, content]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Client aggregated communications (messages across all owned projects)
app.get('/client/messages', auth('client'), async (req, res) => {
  try {
    const r = await pool.query(
      `select 
         m.id,
         m.project_id,
         m.user_id,
         m.content,
         m.created_at,
         p.name as project_name,
         u.name as author_name,
         u.role as author_role
       from project_messages m
       join projects p on m.project_id = p.id and p.client_id = $1
       left join users u on m.user_id = u.id
       order by m.created_at desc
       limit 500`,
      [req.user.id]
    );
    res.json({ ok: true, messages: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Client send message to a specific project
app.post('/client/messages', auth('client'), async (req, res) => {
  try {
    const { projectId, content } = req.body || {};
    const project_id = Number(projectId);
    if (!project_id || !content || !content.trim()) return res.status(400).json({ ok: false, error: 'projectId and content required' });
    if (!(await ensureClientOwns(project_id, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    await pool.query('insert into project_messages(project_id, user_id, content) values($1,$2,$3)', [project_id, req.user.id, content]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Credentials endpoints
app.get('/credentials', auth('client'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, type, value, file_name, is_predefined, created_at FROM credentials WHERE user_id = $1 ORDER BY is_predefined DESC, name ASC',
      [req.user.id]
    );
    res.json({ ok: true, credentials: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/credentials', auth('client'), async (req, res) => {
  try {
    const { name, type, value, file_data, file_name } = req.body;
    
    if (!name || !type || (type !== 'text' && type !== 'file')) {
      return res.status(400).json({ ok: false, error: 'Invalid credential data' });
    }
    
    if (type === 'text' && !value) {
      return res.status(400).json({ ok: false, error: 'Text value is required' });
    }
    
    if (type === 'file' && (!file_data || !file_name)) {
      return res.status(400).json({ ok: false, error: 'File data and name are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO credentials (user_id, name, type, value, file_data, file_name) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [req.user.id, name, type, type === 'text' ? value : null, type === 'file' ? Buffer.from(file_data, 'base64') : null, file_name]
    );
    
    res.json({ ok: true, credentialId: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.put('/credentials/:id', auth('client'), async (req, res) => {
  try {
    const credentialId = Number(req.params.id);
    const { name, type, value, file_data, file_name } = req.body;
    
    // Verify ownership
    const owner = await pool.query('SELECT user_id FROM credentials WHERE id = $1', [credentialId]);
    if (owner.rowCount === 0 || owner.rows[0].user_id !== req.user.id) {
      return res.status(404).json({ ok: false, error: 'Credential not found' });
    }
    
    // Update the credential
    const updates = ['updated_at = NOW()'];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    
    if (type === 'text' && value !== undefined) {
      updates.push(`value = $${paramCount++}, file_data = NULL, file_name = NULL`);
      values.push(value);
    }
    
    if (type === 'file' && file_data !== undefined && file_name !== undefined) {
      updates.push(`file_data = $${paramCount++}, file_name = $${paramCount++}, value = NULL`);
      values.push(Buffer.from(file_data, 'base64'), file_name);
    }
    
    values.push(credentialId);
    
    await pool.query(
      `UPDATE credentials SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/credentials/:id', auth('client'), async (req, res) => {
  try {
    const credentialId = Number(req.params.id);
    
    // Delete only if owned by user and not predefined
    const result = await pool.query(
      'DELETE FROM credentials WHERE id = $1 AND user_id = $2 AND is_predefined = FALSE RETURNING id',
      [credentialId, req.user.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Credential not found or cannot be deleted' });
    }
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Download credential file
app.get('/credentials/:id/download', auth('client'), async (req, res) => {
  try {
    const credentialId = Number(req.params.id);
    
    // Get credential file data
    const result = await pool.query(
      'SELECT file_data, file_name FROM credentials WHERE id = $1 AND user_id = $2 AND type = $3',
      [credentialId, req.user.id, 'file']
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }
    
    const { file_data, file_name } = result.rows[0];
    
    if (!file_data) {
      return res.status(404).json({ ok: false, error: 'No file data available' });
    }
    
    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${file_name || 'credential-file'}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send the file data
    res.send(file_data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Project credentials endpoints
// Get credentials linked to a project
app.get('/projects/:projectId/credentials', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    
    // Verify access to project
    if (req.user.role === 'client') {
      const access = await pool.query('select 1 from projects where id=$1 and client_id=$2', [projectId, req.user.id]);
      if (access.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    } else if (req.user.role === 'advisor') {
      const access = await pool.query(
        'select 1 from projects p join advisor_clients ac on p.client_id=ac.client_id where p.id=$1 and ac.advisor_id=$2',
        [projectId, req.user.id]
      );
      if (access.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Get linked credentials
    const result = await pool.query(`
      select c.id, c.name, c.type, c.file_name, c.is_predefined, pc.created_at as linked_at
      from project_credentials pc
      join credentials c on pc.credential_id = c.id
      where pc.project_id = $1
      order by pc.created_at desc
    `, [projectId]);
    
    res.json({ ok: true, credentials: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Link a credential to a project
app.post('/projects/:projectId/credentials', auth('client'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const { credential_id } = req.body;
    
    // Verify project ownership
    const projectCheck = await pool.query('select 1 from projects where id=$1 and client_id=$2', [projectId, req.user.id]);
    if (projectCheck.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    
    // Verify credential ownership
    const credCheck = await pool.query('select 1 from credentials where id=$1 and user_id=$2', [credential_id, req.user.id]);
    if (credCheck.rowCount === 0) return res.status(404).json({ ok: false, error: 'Credential not found' });
    
    // Link credential to project
    await pool.query(
      'insert into project_credentials(project_id, credential_id) values($1, $2) on conflict do nothing',
      [projectId, credential_id]
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Unlink a credential from a project
app.delete('/projects/:projectId/credentials/:credentialId', auth('client'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const credentialId = Number(req.params.credentialId);
    
    // Verify project ownership
    const projectCheck = await pool.query('select 1 from projects where id=$1 and client_id=$2', [projectId, req.user.id]);
    if (projectCheck.rowCount === 0) return res.status(403).json({ ok: false, error: 'Access denied' });
    
    // Unlink credential
    await pool.query('delete from project_credentials where project_id=$1 and credential_id=$2', [projectId, credentialId]);
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Helper function to detect website type
function detectWebsiteType(html) {
  if (html.includes('e-commerce') || html.includes('cart') || html.includes('shop')) return 'e-commerce';
  if (html.includes('blog') || html.includes('article')) return 'blog/content';
  if (html.includes('saas') || html.includes('software')) return 'SaaS';
  if (html.includes('portfolio') || html.includes('gallery')) return 'portfolio';
  return 'business';
}

// Public ideation start endpoint (get initial message)
app.get('/public-ideator/start', async (req, res) => {
  try {
    const welcomeMessage = "Let's see how Hyah! AI can help you. You can start with something like telling me the type of company you are, or you can tell me a specific task or give me your URL and I will crawl it and come up with some ideas....";
    
    res.json({ 
      ok: true, 
      message: welcomeMessage 
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Public ideation chat endpoint (no auth required)
app.post('/public-ideator/chat', async (req, res) => {
  try {
    const { message, conversation_history = [] } = req.body;
    
    // Set appropriate headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Check if message contains a URL to crawl
    // Updated regex to match various URL formats
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:\/[^\s]*)?)/gi;
    const urlMatch = message.match(urlRegex);
    let websiteContext = '';
    
    if (urlMatch) {
      try {
        // Fetch and analyze the website
        let url = urlMatch[0];
        
        // Ensure URL has protocol
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = 'https://' + url;
        }
        
        console.log('Attempting to fetch URL:', url);
        
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; HyahAIBot/1.0)'
            },
            timeout: 10000, // 10 second timeout
            maxRedirects: 5
          });
          
          const html = response.data;
          // Extract text content and meta information
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
          const h1Matches = html.match(/<h1[^>]*>([^<]+)<\/h1>/gi) || [];
          
          websiteContext = `\n\nWebsite Analysis for ${url}:
- Title: ${titleMatch ? titleMatch[1] : 'Not found'}
- Description: ${descMatch ? descMatch[1] : 'Not found'}
- Main headings: ${h1Matches.slice(0, 3).map(h => h.replace(/<[^>]+>/g, '')).join(', ')}
- This appears to be a ${detectWebsiteType(html)} website.`;
        } catch (axiosError) {
          console.error('Axios error fetching URL:', url, axiosError.message);
          console.error('Error details:', {
            code: axiosError.code,
            response: axiosError.response?.status,
            message: axiosError.message
          });
          
          if (axiosError.response) {
            websiteContext = `\n\n(Unable to fetch website details - received status ${axiosError.response.status}, but I can still help based on what you tell me!)`;
          } else if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
            websiteContext = `\n\n(The website appears to be unavailable or the URL may be incorrect. But no worries, I can still help based on what you tell me about your business!)`;
          } else if (axiosError.code === 'ETIMEDOUT' || axiosError.code === 'ECONNABORTED') {
            websiteContext = `\n\n(The website took too long to respond, but I can still help based on what you tell me!)`;
          } else {
            websiteContext = `\n\n(Unable to access the website at this time, but I can still help based on what you tell me!)`;
          }
        }
      } catch (e) {
        console.error('Error processing URL:', e);
        websiteContext = '\n\n(Unable to process the URL, but I can still help based on what you tell me!)';
      }
    }
    
    // Prepare prior history for Gemini chat API.
    // Requirements: first item must be a 'user' message and assistant messages
    // should be mapped to 'model'. We also exclude any leading assistant-only
    // messages (e.g., initial welcome messages) from history.
    const priorHistory = Array.isArray(conversation_history) ? conversation_history : [];
    const sanitizedHistory = [];
    let seenFirstUser = false;
    for (const h of priorHistory) {
      const mappedRole = h.role === 'assistant' ? 'model' : h.role;
      if (!seenFirstUser && mappedRole !== 'user') {
        // Skip leading non-user messages
        continue;
      }
      if (mappedRole === 'user') seenFirstUser = true;
      sanitizedHistory.push({ role: mappedRole, parts: [{ text: h.content }] });
    }

    // Generate response using the public ideation prompt
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, { apiVersion: 'v1' });
    const model = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
      systemInstruction: PUBLIC_IDEATOR_SYSTEM_PROMPT
    });
    
    const chat = model.startChat({ history: sanitizedHistory });

    const prompt = message + (websiteContext || '');
    const result = await chat.sendMessageStream(prompt);
    
    let fullResponse = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }
    
    // Check if we should prompt for signup (use prior history + this user message)
    const historyForDecision = [...priorHistory, { role: 'user', content: prompt }];
    const shouldPromptSignup = checkIfReadyForSignup(historyForDecision, fullResponse);
    
    res.write(`data: ${JSON.stringify({ 
      complete: true, 
      shouldPromptSignup,
      response: fullResponse 
    })}\n\n`);
    
    res.end();
  } catch (e) {
    console.error('Public ideator error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});


// Check if conversation is ready for signup prompt
function checkIfReadyForSignup(history, latestResponse) {
  const messageCount = history.filter(m => m.role === 'user').length;
  
  // Check if user has expressed strong interest or we've had enough back-and-forth
  const interestKeywords = ['love it', 'perfect', 'exactly', 'let\'s do it', 'how do we start', 'what\'s next', 'sounds great'];
  const hasInterest = interestKeywords.some(keyword => 
    latestResponse.toLowerCase().includes(keyword) || 
    history[history.length - 1]?.content?.toLowerCase().includes(keyword)
  );
  
  return messageCount >= 3 || hasInterest;
}

// Public advisor request endpoint (captures leads)
app.post('/public/advisor-request', async (req, res) => {
  try {
    const { name, email, company_url, time_slot } = req.body;
    
    if (!name || !email || !time_slot) {
      return res.status(400).json({ ok: false, error: 'Name, email, and time slot are required' });
    }
    
    // Save the request
    await pool.query(
      'insert into advisor_requests(name, email, company_url, time_slot) values($1,$2,$3,$4)',
      [name, email, company_url, time_slot]
    );
    
    res.json({ 
      ok: true, 
      message: 'Thanks! An advisor will reach out to confirm your selected time.' 
    });
  } catch (e) {
    console.error('Advisor request error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Public signup endpoint (creates account from ideation chat)
app.post('/public-ideator/signup', async (req, res) => {
  try {
    const { email, name, conversation_history = [] } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ ok: false, error: 'Email and name are required' });
    }
    
    // Check if user already exists
    const existing = await pool.query('select id from users where email=$1 or username=$1', [email]);
    if (existing.rowCount > 0) {
      return res.status(400).json({ ok: false, error: 'An account with this email already exists. Please login instead.' });
    }
    
    // Create user with default password
    const defaultPassword = 'Welcome123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const userResult = await pool.query(
      'insert into users(name, email, username, password, role) values($1,$2,$3,$4,$5) returning id',
      [name, email, email, hashedPassword, 'client']
    );
    
    const userId = userResult.rows[0].id;
    
    // Seed default credentials for the new user
    await seedUserCredentials(userId);
    
    // Create a draft project with their ideation conversation
    if (conversation_history.length > 0) {
      const projectName = 'AI Project Ideation - ' + new Date().toLocaleDateString();
      await pool.query(
        'insert into projects(client_id, name, status, chat_history) values($1,$2,$3,$4)',
        [userId, projectName, 'Draft', JSON.stringify(conversation_history)]
      );
    }
    
    // Generate JWT token to auto-login
    const token = jwt.sign(
      { id: userId, role: 'client', email: email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({ 
      ok: true, 
      token,
      message: 'Welcome to Hyah! AI! Your account has been created.',
      defaultPassword: 'You can change your password in your profile settings.'
    });
  } catch (e) {
    console.error('Signup error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Public standalone signup (from pricing dialog)
app.post('/public/signup', async (req, res) => {
  try {
    const { name, email, username, password, companyName, websiteUrl, phone, plan, time_slot } = req.body || {};
    if (!name || !email || !username || !password || !time_slot) {
      return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }
    const exists = await pool.query('select id from users where email=$1 or username=$2', [email, username]);
    if (exists.rowCount > 0) {
      return res.status(400).json({ ok: false, error: 'An account with this email/username already exists' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const r = await pool.query(
      'insert into users(role,name,email,username,password,company_name,website_url,phone) values($1,$2,$3,$4,$5,$6,$7,$8) returning id',
      ['client', name, email, username, hashed, companyName || null, websiteUrl || null, phone || null]
    );
    const userId = r.rows[0].id;
    await seedUserCredentials(userId);

    // record desired onboarding time
    // If there is an assigned default advisor logic elsewhere, we could place a null advisor. For now, store request with advisor_id = 0.
    await pool.query(
      'insert into schedule_requests(client_id, advisor_id, time_slot, meeting_description, status) values($1,$2,$3,$4,$5)',
      [userId, 0, time_slot, `Requested during signup. Plan: ${plan || 'N/A'}`, 'pending']
    ).catch(()=>{});

    const token = jwt.sign({ id: userId, role: 'client', email }, JWT_SECRET, { expiresIn: '30d' });
    // Queue Welcome email (uses email_templates key 'signup_welcome' via outbox metadata)
    try {
      const tpl = await pool.query("select id, subject, body from email_templates where key='signup_welcome' limit 1");
      const template = tpl.rowCount > 0 ? tpl.rows[0] : null;
      const baseUrl = req.headers.origin || '';
      const loginUrl = baseUrl ? `${baseUrl}/login` : '/login';
      const subject = template ? template.subject : 'Welcome to Hyah! AI – your account details';
      const body = template ? template.body : `Hi {{name}},\n\nWelcome to Hyah! AI. Your account is ready.\n\nUsername: {{username}}\nPassword: {{password}}\nLogin: {{login_url}}\n\n— Hyah! AI Team`;
      await pool.query(
        'insert into email_outbox(to_user_id, to_email, subject, body, template_id, metadata) values($1,$2,$3,$4,$5,$6)',
        [userId, email, subject, body, template ? template.id : null, { name, username, login_url: loginUrl }]
      );
      if (dispatchOutbox) {
        dispatchOutbox().catch(()=>{});
      }
    } catch (_) { /* non-fatal */ }

    res.json({ ok: true, token });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Download credential file for advisor
app.get('/advisor/credentials/:clientId/:credId/download', auth('advisor'), async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const credentialId = Number(req.params.credId);
    
    // Verify advisor has access to this client
    const access = await pool.query(
      'select 1 from advisor_clients where advisor_id=$1 and client_id=$2',
      [req.user.id, clientId]
    );
    
    if (access.rowCount === 0) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Get credential file data
    const result = await pool.query(
      'SELECT file_data, file_name FROM credentials WHERE id = $1 AND user_id = $2 AND type = $3',
      [credentialId, clientId, 'file']
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'File not found' });
    }
    
    const { file_data, file_name } = result.rows[0];
    
    if (!file_data) {
      return res.status(404).json({ ok: false, error: 'No file data available' });
    }
    
    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${file_name || 'credential-file'}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    
    // Send the file data
    res.send(file_data);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const port = process.env.PORT || 8080;
// Ensure schema on boot, then start listening
ensureSchema()
  .catch((e) => console.error('ensureSchema failed at boot:', e))
  .finally(() => {
    app.listen(port, async () => {
      console.log(`Backend listening on ${port}`);
      try { await probeStreamingSupport(); } catch {}
    });
  });

app.delete('/client/projects/:id', auth('client'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const r = await pool.query('delete from projects where id=$1 and client_id=$2 returning id', [projectId, req.user.id]);
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'Project not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Advisor delete project (must have access to client's project)
app.delete('/advisor/projects/:id', auth('advisor'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    const access = await pool.query(
      `delete from projects p using advisor_clients ac
       where p.id=$1 and ac.client_id=p.client_id and ac.advisor_id=$2 returning p.id`,
      [projectId, req.user.id]
    );
    if (access.rowCount === 0) return res.status(404).json({ ok: false, error: 'Project not found or access denied' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Storage config for multer (local disk MVP)
const uploadRoot = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot);
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = String(req.params.id || req.params.projectId || 'general');
    const dir = path.join(uploadRoot, projectId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const stamp = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, `${stamp}__${safe}`);
  }
});
const upload = multer({ storage });
// Serve uploaded assets (e.g., webinar images)
app.use('/uploads', express.static(uploadRoot));

// ====================
// Stage Change Approval Endpoints (must be after upload middleware is defined)
// ====================

// Create a stage change request (advisor only)
app.post('/advisor/projects/:projectId/stage-change-request', auth('advisor'), upload.single('attachment'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const { from_stage, to_stage, message } = req.body || {};
    
    if (!from_stage || !to_stage) {
      return res.status(400).json({ ok: false, error: 'from_stage and to_stage are required' });
    }
    
    // Verify advisor has access to this project
    if (!(await ensureAdvisorAccess(projectId, req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    let attachmentFileId = null;
    
    // Handle file upload if present
    if (req.file) {
      const fileResult = await pool.query(
        `insert into project_files(project_id, user_id, filename, originalname, mimetype, size, advisor_only) 
         values($1, $2, $3, $4, $5, $6, false) returning id`,
        [projectId, req.user.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size]
      );
      attachmentFileId = fileResult.rows[0].id;
    }
    
    // Create the stage change request
    const result = await pool.query(
      `insert into stage_change_approvals(project_id, advisor_id, from_stage, to_stage, message, attachment_file_id, status)
       values($1, $2, $3, $4, $5, $6, 'pending') returning id`,
      [projectId, req.user.id, from_stage, to_stage, message || '', attachmentFileId]
    );
    
    const approvalId = result.rows[0].id;
    
    // Add a message to the project communication thread
    const notificationMsg = `Stage Change Request: ${from_stage} → ${to_stage}\n\n${message || 'Please review and approve this stage change.'}\n\n[Approval Required]`;
    await pool.query(
      'insert into project_messages(project_id, user_id, content) values($1, $2, $3)',
      [projectId, req.user.id, notificationMsg]
    );
    
    res.json({ ok: true, approvalId });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get pending stage change requests for a project
app.get('/projects/:projectId/stage-change-requests', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    
    // Verify access
    if (req.user.role === 'advisor') {
      if (!(await ensureAdvisorAccess(projectId, req.user.id))) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
    } else if (req.user.role === 'client') {
      if (!(await ensureClientOwns(projectId, req.user.id))) {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
    }
    
    const result = await pool.query(
      `select sca.*, u.name as advisor_name, pf.originalname as attachment_name, pf.id as attachment_id
       from stage_change_approvals sca
       join users u on sca.advisor_id = u.id
       left join project_files pf on sca.attachment_file_id = pf.id
       where sca.project_id = $1 and sca.status = 'pending'
       order by sca.created_at desc`,
      [projectId]
    );
    
    res.json({ ok: true, requests: result.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Approve a stage change request (client only)
app.post('/client/projects/:projectId/stage-change-requests/:approvalId/approve', auth('client'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const approvalId = Number(req.params.approvalId);
    
    // Verify client owns this project
    if (!(await ensureClientOwns(projectId, req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Get the approval request
    const approval = await pool.query(
      `select * from stage_change_approvals where id = $1 and project_id = $2 and status = 'pending'`,
      [approvalId, projectId]
    );
    
    if (approval.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Approval request not found or already processed' });
    }
    
    const { to_stage } = approval.rows[0];
    
    // Update the approval status
    await pool.query(
      `update stage_change_approvals set status = 'approved', approved_at = now() where id = $1`,
      [approvalId]
    );
    
    // Update the project stage
    await pool.query(
      `update projects set project_stage = $1 where id = $2`,
      [to_stage, projectId]
    );
    
    // Add a confirmation message
    await pool.query(
      'insert into project_messages(project_id, user_id, content) values($1, $2, $3)',
      [projectId, req.user.id, `Stage change approved. Project is now in ${to_stage} phase.`]
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Reject a stage change request (client only)
app.post('/client/projects/:projectId/stage-change-requests/:approvalId/reject', auth('client'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const approvalId = Number(req.params.approvalId);
    const { reason } = req.body || {};
    
    // Verify client owns this project
    if (!(await ensureClientOwns(projectId, req.user.id))) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Update the approval status
    const result = await pool.query(
      `update stage_change_approvals set status = 'rejected', rejected_at = now() 
       where id = $1 and project_id = $2 and status = 'pending' returning *`,
      [approvalId, projectId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Approval request not found or already processed' });
    }
    
    // Add a message
    const msg = reason ? `Stage change rejected. Reason: ${reason}` : 'Stage change rejected.';
    await pool.query(
      'insert into project_messages(project_id, user_id, content) values($1, $2, $3)',
      [projectId, req.user.id, msg]
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ====================
// End Stage Change Approval Endpoints
// ====================

// Access guard helpers
async function ensureAdvisorAccess(projectId, advisorId) {
  const access = await pool.query(
    `select 1 from projects p join advisor_clients ac on p.client_id=ac.client_id where p.id=$1 and ac.advisor_id=$2`,
    [projectId, advisorId]
  );
  return access.rowCount > 0;
}
async function ensureClientOwns(projectId, clientId) {
  const r = await pool.query('select 1 from projects where id=$1 and client_id=$2', [projectId, clientId]);
  return r.rowCount > 0;
}

// Helper: Summarize project docs for model context (text-like files only, truncated)
function loadProjectDocSummaries(projectId, maxBytes = 40000) {
  const dir = path.join(uploadRoot, String(projectId));
  const summaries = [];
  if (!fs.existsSync(dir)) return summaries;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const filePath = path.join(dir, ent.name);
    const ext = (ent.name.split('.').pop() || '').toLowerCase();
    const textLike = ['txt','md','markdown','json','csv','ts','tsx','js','jsx','yml','yaml','ini','xml','html'];
    if (!textLike.includes(ext)) {
      summaries.push({ filename: ent.name, note: 'Binary or non-text file, included in package but not analyzed.' });
      continue;
    }
    try {
      const buf = fs.readFileSync(filePath);
      const slice = buf.slice(0, maxBytes).toString('utf8');
      summaries.push({ filename: ent.name, sample: slice });
    } catch {
      summaries.push({ filename: ent.name, note: 'Failed to read file contents.' });
    }
  }
  return summaries;
}

// Helper: Build prompt for Dev Package generation
function buildDevPackagePrompt(idea, docsSummaries) {
  const { title, summary, steps, agent_stack, client_requirements, security_considerations, future_enhancements } = idea || {};
  const docsSection = docsSummaries && docsSummaries.length
    ? `PROJECT DOCS (samples/truncated):\n${docsSummaries.map(d => `- ${d.filename}: ${d.sample ? d.sample.substring(0, 2000) : d.note || ''}`).join('\n')}`
    : 'No project documents uploaded yet.';
  return `You are an elite Staff Engineer. Generate a complete, production-grade, "Cursor-ready" development package as a ZIP composed ONLY of project-unique Markdown files derived from the specification and summarized docs below. Do NOT include any example/baseline templates or raw uploaded documents in the package — generate project-specific content only.

STRICT OUTPUT FORMAT:
Return ONLY a JSON object (no prose) with the shape:
{
  "files": [
    { "path": "README.md", "content": "..." },
    { "path": "ARCHITECTURE.md", "content": "..." },
    { "path": "SYSTEM_OVERVIEW.md", "content": "..." },
    { "path": "IMPLEMENTATION_PLAN.md", "content": "..." },
    { "path": "API_SPEC.md", "content": "..." },
    { "path": "DATA_MODEL.md", "content": "..." },
    { "path": "MIGRATIONS.md", "content": "..." },
    { "path": "SECURITY.md", "content": "..." },
    { "path": "OBSERVABILITY.md", "content": "..." },
    { "path": "DEPLOYMENT.md", "content": "..." },
    { "path": "RUNBOOK.md", "content": "..." },
    { "path": "TEST_STRATEGY.md", "content": "..." },
    { "path": "CONFIGURATION.md", "content": "..." },
    { "path": "CURSOR_OPENING_PROMPT.md", "content": "..." }
  ]
}

DEPTH AND TECHNICALITY REQUIREMENTS:
- Expand beyond UI-visible details. Infer and elaborate realistic, detailed architecture from the specification.
- Include textual component and sequence diagrams (use Mermaid where useful) that explain data and control flow between services/components.
- API_SPEC: list endpoints with method, path, auth, request/response JSON schemas, error codes, idempotency, and pagination.
- DATA_MODEL: provide normalized relational schema with keys, indexes, and example DDL.
- MIGRATIONS: ordered plan for evolving the schema from current to target, with safe rollout notes.
- SECURITY: RBAC, authN/Z, secrets, least-privilege, data retention, PII handling.
- OBSERVABILITY: logging, metrics, traces; critical SLOs, dashboards, and alerts.
- DEPLOYMENT: step-by-step Render setup (services, env vars, build/start), and rollbacks.
- RUNBOOK: operational procedures, common incidents, investigation steps, and on-call tips.
- CONFIGURATION: explicit environment variable matrix (name, purpose, default, required), and config validation strategy.

CONSTRAINTS:
- The package MUST NOT embed raw user documents or generic templates. Only project-specific, uniquely generated files.
- Use the stack Express + Next.js + PostgreSQL + JWT as the default integration context unless the spec overrides.
- Write in clear, skimmable sections with headings, lists, and tables.

PROJECT SPECIFICATION:
Title: ${title || ''}
Executive Summary: ${summary || ''}
Implementation Steps: ${(steps || []).join(' | ')}
Technical Stack (agent_stack JSON): ${JSON.stringify(agent_stack || {}, null, 2)}
Client Requirements: ${(client_requirements || []).join(' | ')}
Security Considerations: ${Array.isArray(security_considerations) ? security_considerations.join(' | ') : JSON.stringify(security_considerations || {})}
Enhancements: ${Array.isArray(future_enhancements) ? future_enhancements.join(' | ') : JSON.stringify(future_enhancements || {})}

${docsSection}`;
}

// Fallback: build a high-quality dev package if model output isn't strict JSON
function buildFallbackFiles(idea, docSummaries) {
  const title = (idea && idea.title) || 'Project'
  const summary = (idea && idea.summary) || ''
  const steps = Array.isArray(idea?.steps) ? idea.steps : []
  const stack = idea?.agent_stack || {}
  const reqs = Array.isArray(idea?.client_requirements) ? idea.client_requirements : []
  const security = Array.isArray(idea?.security_considerations) ? idea.security_considerations : []
  const enh = Array.isArray(idea?.future_enhancements) ? idea.future_enhancements : []

  const md = (s) => (typeof s === 'string' ? s : JSON.stringify(s, null, 2))
  const bullets = (arr) => (arr || []).map(x => `- ${typeof x === 'string' ? x : md(x)}`).join('\n')

  const README = `# ${title} – Development Package\n\n${summary}\n\nThis package contains project-specific technical documentation to accelerate implementation. Start with ARCHITECTURE.md and IMPLEMENTATION_PLAN.md.\n`

  const ARCHITECTURE = `# Architecture\n\n## System Context\n- Frontend: Next.js (App Router)\n- Backend: Express.js\n- Database: PostgreSQL\n- Auth: JWT (RBAC: admin, advisor, client)\n\n## Components\n- API Server: request handling, RBAC middleware, feature modules (ideas, projects, files).\n- Web App: advisor dashboard, client portal, authentication.\n- Database: normalized relational schema, migrations.\n\n## Sequence (High-Level)\n~~~mermaid\nsequenceDiagram\n  participant Web as Web (Next.js)\n  participant API as API (Express)\n  participant DB as Postgres\n  Web->>API: Authenticated request (Bearer JWT)\n  API->>API: RBAC check (role + ownership)\n  API->>DB: Parameterized SQL query\n  DB-->>API: Rows\n  API-->>Web: JSON response\n~~~\n`

  const IMPLEMENTATION_PLAN = `# Implementation Plan\n\n## Overview\n${summary}\n\n## Steps\n${steps.map((s, i) => `### ${i + 1}. ${typeof s === 'string' ? s : md(s)}`).join('\n')}\n\n## Technical Stack\n${md(stack)}\n\n## Client Requirements\n${bullets(reqs)}\n`

  const API_SPEC = `# API Spec\n\n- Auth: Bearer JWT (Authorization: Bearer <token>)\n- Content-Type: application/json\n\n## Endpoints (examples)\n- GET /me – returns user profile\n- GET /projects/:id/files – list files (RBAC-aware)\n- POST /advisor/projects/:projectId/dev-package – generate package (advisor)\n\nFor each endpoint: include request parameters, response schema, and error codes.\n`

  const DATA_MODEL = `# Data Model\n\n## Entities\n- users(id PK, role, name, email, username, password, company_name, website_url, phone)\n- advisor_clients(advisor_id FK->users, client_id FK->users, PK(advisor_id, client_id))\n- projects(id PK, client_id FK->users, name, status, eta, chat_history)\n- agent_ideas(id PK, project_id FK->projects, title, summary, steps jsonb, agent_stack jsonb, ...)\n- project_messages(id PK, project_id FK->projects, user_id FK->users, content, created_at)\n- project_files(id PK, project_id FK->projects, user_id FK->users, filename, originalname, mimetype, size, advisor_only, created_at)\n\n## Example DDL (excerpt)\n~~~sql\ncreate table if not exists projects(\n  id serial primary key,\n  client_id int not null references users(id) on delete cascade,\n  name text not null,\n  status text not null,\n  eta text,\n  created_at timestamptz default now()\n);\n~~~\n`

  const MIGRATIONS = `# Migrations\n\n1. Add advisor_only to project_files (if missing)\n2. Add chat_history to projects (if missing)\n3. Create indexes on projects(status), credentials(user_id)\n\nEach migration should be idempotent and backward compatible.\n`

  const SECURITY = `# Security\n\n${bullets(security.length ? security : [
    'TLS in transit; managed encryption at rest.',
    'JWT-based auth with strict RBAC (admin/advisor/client).',
    'Parameterized SQL queries; no dynamic SQL.',
    'Rotate secrets; store only via environment variables.',
  ])}\n`

  const OBSERVABILITY = `# Observability\n\n## Metrics\n- Request rate, error rate, latency (p50/p95)\n- DB query timings\n\n## Logs\n- Structured JSON logs with request id\n\n## Tracing\n- Trace API handlers and DB calls\n`

  const DEPLOYMENT = `# Deployment (Render)\n\n- Backend: Node.js service, build: npm ci; start: node server.js\n- Frontend: Next.js static or SSR service\n- Env Vars: see CONFIGURATION.md\n- Healthcheck: GET /health\n`

  const RUNBOOK = `# Runbook\n\n## Common Incidents\n- 401/403: verify JWT and role mapping\n- DB connection errors: check DATABASE_URL and SSL flags\n\n## Operational Tasks\n- Rotate JWT_SECRET quarterly\n- Review indices monthly\n`

  const TEST_STRATEGY = `# Test Strategy\n\n- Unit: RBAC middleware, validators\n- Integration: endpoints with seeded DB\n- E2E: advisor and client critical flows\n`

  const CONFIGURATION = `# Configuration\n\n| Name | Description | Required | Default |\n|------|-------------|----------|---------|\n| JWT_SECRET | JWT signing secret | yes | |\n| DATABASE_URL | Postgres connection string | yes | |\n| DATABASE_SSL | Enable SSL (true/false) | no | false |\n| GEMINI_API_KEY | Model API key | yes | |\n| GEMINI_MODEL | Model name | no | gemini-2.5-pro |\n`

  const CURSOR_PROMPT = `# Cursor Opening Prompt\n\nYou are working on ${title}. Follow IMPLEMENTATION_PLAN.md, consult ARCHITECTURE.md, and use API_SPEC.md and DATA_MODEL.md to build endpoints and schema.\n`

  return [
    { path: 'README.md', content: README },
    { path: 'ARCHITECTURE.md', content: ARCHITECTURE },
    { path: 'SYSTEM_OVERVIEW.md', content: ARCHITECTURE },
    { path: 'IMPLEMENTATION_PLAN.md', content: IMPLEMENTATION_PLAN },
    { path: 'API_SPEC.md', content: API_SPEC },
    { path: 'DATA_MODEL.md', content: DATA_MODEL },
    { path: 'MIGRATIONS.md', content: MIGRATIONS },
    { path: 'SECURITY.md', content: SECURITY },
    { path: 'OBSERVABILITY.md', content: OBSERVABILITY },
    { path: 'DEPLOYMENT.md', content: DEPLOYMENT },
    { path: 'RUNBOOK.md', content: RUNBOOK },
    { path: 'TEST_STRATEGY.md', content: TEST_STRATEGY },
    { path: 'CONFIGURATION.md', content: CONFIGURATION },
    { path: 'CURSOR_OPENING_PROMPT.md', content: CURSOR_PROMPT },
  ]
}

// Advisor-only: Generate Dev Package ZIP and attach as advisor-only project file
app.post('/advisor/projects/:projectId/dev-package', auth('advisor'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    if (!projectId) return res.status(400).json({ ok: false, error: 'Invalid project id' });
    // Access check
    if (!(await ensureAdvisorAccess(projectId, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });

    await ensureSchema();

    // Load latest idea for the project
    const ir = await pool.query(
      `select * from agent_ideas where project_id=$1 order by created_at desc limit 1`,
      [projectId]
    );
    const idea = ir.rowCount > 0 ? {
      title: ir.rows[0].title,
      summary: ir.rows[0].summary,
      steps: ir.rows[0].steps || [],
      agent_stack: ir.rows[0].agent_stack || {},
      client_requirements: ir.rows[0].client_requirements || [],
      security_considerations: ir.rows[0].security_considerations || [],
      future_enhancements: ir.rows[0].future_enhancements || []
    } : null;

    // Summarize any uploaded docs
    const docSummaries = loadProjectDocSummaries(projectId);

    // Build prompt and call Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ ok: false, error: 'Missing GEMINI_API_KEY' });
    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' });
    const prompt = buildDevPackagePrompt(idea, docSummaries);
    const strict = String(process.env.GEMINI_STRICT || '').toLowerCase() === 'true' || String(process.env.GEMINI_STRICT || '') === '1';
    const primary = process.env.GEMINI_MODEL || 'gemini-1.5-pro-latest';
    let jsonText = '';
    let lastErr = null;
    if (strict) {
      try {
        const mdl = genAI.getGenerativeModel({ model: primary, temperature: 0.2 });
        const result = await generateContentWithRetries(mdl, { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 8192 } });
        jsonText = result.response.text();
      } catch (e) {
        lastErr = e;
        console.error('Dev package generation failed (strict mode)', e && (e.message || e));
      }
    } else {
      const candidates = [primary, 'gemini-1.5-flash', 'gemini-1.0-pro', 'gemini-2.0-flash-exp'];
      for (const m of candidates) {
        try {
          const mdl = genAI.getGenerativeModel({ model: m, temperature: 0.2 });
          const result = await generateContentWithRetries(mdl, { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 8192 } });
          jsonText = result.response.text();
          if (jsonText) break;
        } catch (e) {
          lastErr = e;
          // try next model
        }
      }
      if (!jsonText) {
        console.error('Dev package model generation failed; falling back', lastErr && (lastErr.message || lastErr));
      }
    }
    if (jsonText.includes('```json')) {
      jsonText = jsonText.split('```json')[1].split('```')[0].trim();
    } else if (jsonText.includes('```')) {
      jsonText = jsonText.split('```')[1].split('```')[0].trim();
    }
    let files;
    try {
      const parsed = JSON.parse(jsonText);
      files = Array.isArray(parsed.files) ? parsed.files : [];
    } catch (e) {
      // Fallback: construct files locally so we still deliver a package
      files = buildFallbackFiles(idea, docSummaries);
    }

    // Do not include any baseline templates; only the uniquely generated files

    // Create ZIP in uploads/{projectId}
    const projectDir = path.join(uploadRoot, String(projectId));
    fs.mkdirSync(projectDir, { recursive: true });
    const stamp = Date.now();
    const zipName = `dev-package-${stamp}.zip`;
    const zipPath = path.join(projectDir, zipName);

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      output.on('close', resolve);
      archive.on('error', reject);
      archive.pipe(output);
      // Add generated files
      for (const f of files) {
        const p = f.path || 'FILE.md';
        const c = typeof f.content === 'string' ? f.content : JSON.stringify(f.content, null, 2);
        archive.append(c, { name: p });
      }
      // Do NOT bundle raw uploaded documents; package must contain only generated files
      archive.finalize();
    });

    const stats = fs.statSync(zipPath);
    // Record in DB as advisor_only
    const ins = await pool.query(
      'insert into project_files(project_id, user_id, filename, originalname, mimetype, size, advisor_only) values($1,$2,$3,$4,$5,$6,$7) returning id',
      [projectId, req.user.id, zipName, zipName, 'application/zip', stats.size, true]
    );

    res.json({ ok: true, fileId: ins.rows[0].id, filename: zipName });
  } catch (e) {
    console.error('Dev package error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Advisor-only: Delete a previously generated Dev Package ZIP (advisor must have access)
app.delete('/advisor/projects/:projectId/dev-package/:fileId', auth('advisor'), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const fileId = Number(req.params.fileId);
    if (!projectId || !fileId) return res.status(400).json({ ok:false, error:'Invalid ids' });
    if (!(await ensureAdvisorAccess(projectId, req.user.id))) return res.status(403).json({ ok:false, error:'Access denied' });

    // Load file metadata and ensure it is advisor_only and belongs to this project
    const r = await pool.query('select id, filename, advisor_only from project_files where id=$1 and project_id=$2', [fileId, projectId]);
    if (r.rowCount === 0) return res.status(404).json({ ok:false, error:'File not found' });
    const row = r.rows[0];
    if (!row.advisor_only) return res.status(400).json({ ok:false, error:'Only advisor-only dev packages can be deleted' });

    // Delete from disk
    const filePath = path.join(uploadRoot, String(projectId), row.filename);
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

    // Delete DB record
    await pool.query('delete from project_files where id=$1 and project_id=$2', [fileId, projectId]);
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

// List project files (client or advisor)
app.get('/projects/:id/files', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ ok: false, error: 'Invalid project id' });
    if (req.user.role === 'client' && !(await ensureClientOwns(projectId, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (req.user.role === 'advisor' && !(await ensureAdvisorAccess(projectId, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    const r = await pool.query(
      req.user.role === 'client'
        ? 'select id, filename, originalname, mimetype, size, created_at from project_files where project_id=$1 and (advisor_only=false or advisor_only is null) order by created_at desc'
        : 'select id, filename, originalname, mimetype, size, created_at, advisor_only from project_files where project_id=$1 order by created_at desc',
      [projectId]
    );
    res.json({ ok: true, files: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Upload project file (client or advisor)
app.post('/projects/:id/files', auth(), upload.single('file'), async (req, res) => {
  try {
    const projectId = Number(req.params.id);
    if (!projectId) return res.status(400).json({ ok: false, error: 'Invalid project id' });
    if (req.user.role === 'client' && !(await ensureClientOwns(projectId, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (req.user.role === 'advisor' && !(await ensureAdvisorAccess(projectId, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (!req.file) return res.status(400).json({ ok: false, error: 'Missing file' });
    const { filename, originalname, mimetype, size } = req.file;
    const advisorOnly = req.body && (req.body.advisor_only === 'true' || req.body.advisor_only === true);
    await pool.query(
      'insert into project_files(project_id, user_id, filename, originalname, mimetype, size, advisor_only) values($1,$2,$3,$4,$5,$6,$7)',
      [projectId, req.user.id, filename, originalname, mimetype, size, advisorOnly]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Download a file
app.get('/projects/:projectId/files/:fileId', auth(), async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const fileId = Number(req.params.fileId);
    if (req.user.role === 'client' && !(await ensureClientOwns(projectId, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    if (req.user.role === 'advisor' && !(await ensureAdvisorAccess(projectId, req.user.id))) return res.status(403).json({ ok: false, error: 'Access denied' });
    const r = await pool.query('select filename, originalname, mimetype from project_files where id=$1 and project_id=$2', [fileId, projectId]);
    if (r.rowCount === 0) return res.status(404).json({ ok: false, error: 'File not found' });
    const row = r.rows[0];
    const filePath = path.join(uploadRoot, String(projectId), row.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ ok: false, error: 'File missing' });
    res.setHeader('Content-Type', row.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${row.originalname}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/public/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ ok:false, error:'token and password required' });
    const t = await pool.query('select user_id from password_reset_tokens where token=$1 and expires_at > now()', [token]);
    if (t.rowCount === 0) return res.status(400).json({ ok:false, error:'Invalid or expired token' });
    const userId = t.rows[0].user_id;
    const hashed = await bcrypt.hash(password, 10);
    await pool.query('update users set password=$2 where id=$1', [userId, hashed]);
    await pool.query('delete from password_reset_tokens where token=$1', [token]);
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

// ===========================
// AI ADOPTION ROADMAP ENDPOINTS
// ===========================

// Get or create roadmap for current user
app.get('/roadmap', auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user has a roadmap config
    let config = await pool.query(
      'SELECT * FROM ai_roadmap_configs WHERE user_id = $1 AND is_default = true ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    
    // If no config exists, create one and auto-import projects/ideas
    if (config.rowCount === 0) {
      const newConfig = await pool.query(
        'INSERT INTO ai_roadmap_configs (user_id, name, is_default) VALUES ($1, $2, true) RETURNING *',
        [userId, 'My AI Roadmap']
      );
      config = newConfig;
      
      const configId = newConfig.rows[0].id;
      
      // Create default category nodes with "The Brain" in center, categories on left/right, projects beyond
      const defaultCategories = [
        { name: 'The Brain', x: 600, y: 350, description: 'Central AI strategy hub' },
        // Left side categories
        { name: 'Sales', x: 350, y: 200, description: 'Sales AI initiatives' },
        { name: 'Marketing', x: 350, y: 350, description: 'Marketing AI initiatives' },
        { name: 'HR', x: 350, y: 500, description: 'HR AI initiatives' },
        // Right side categories
        { name: 'Operations', x: 850, y: 200, description: 'Operations AI initiatives' },
        { name: 'Finance', x: 850, y: 350, description: 'Finance AI initiatives' },
        { name: 'Other', x: 850, y: 500, description: 'Other AI initiatives' },
      ];
      
      for (const cat of defaultCategories) {
        await pool.query(
          `INSERT INTO roadmap_nodes (roadmap_config_id, node_type, title, description, position_x, position_y, category, is_predefined_category)
           VALUES ($1, 'category', $2, $3, $4, $5, $2, true)`,
          [configId, cat.name, cat.description, cat.x, cat.y]
        );
      }
      
      // Auto-import projects as nodes (positioned on left and right beyond categories)
      const projects = await pool.query(
        'SELECT p.id, p.name, p.status FROM projects p WHERE p.client_id = $1',
        [userId]
      );
      
      let leftY = 150;
      let rightY = 150;
      for (let i = 0; i < projects.rows.length; i++) {
        const project = projects.rows[i];
        // Alternate between left (100px) and right (1100px)
        const xPos = i % 2 === 0 ? 100 : 1100;
        const yPos = i % 2 === 0 ? leftY : rightY;
        
        await pool.query(
          `INSERT INTO roadmap_nodes (roadmap_config_id, node_type, project_id, title, description, status, position_x, position_y)
           VALUES ($1, 'project', $2, $3, $4, $5, $6, $7)`,
          [configId, project.id, project.name, `Status: ${project.status}`, project.status.toLowerCase(), xPos, yPos]
        );
        
        if (i % 2 === 0) leftY += 170;
        else rightY += 170;
      }
      
      // Auto-import ideas as nodes (positioned on far left and far right)
      const ideas = await pool.query(
        'SELECT id, title, summary, status FROM agent_ideas WHERE user_id = $1',
        [userId]
      );
      
      leftY = 150;
      rightY = 150;
      for (let i = 0; i < ideas.rows.length; i++) {
        const idea = ideas.rows[i];
        // Alternate between far left (50px) and far right (1150px)
        const xPos = i % 2 === 0 ? 50 : 1150;
        const yPos = i % 2 === 0 ? leftY : rightY;
        
        await pool.query(
          `INSERT INTO roadmap_nodes (roadmap_config_id, node_type, idea_id, title, description, status, position_x, position_y)
           VALUES ($1, 'idea', $2, $3, $4, 'ideation', $5, $6)`,
          [configId, idea.id, idea.title, idea.summary || '', xPos, yPos]
        );
        
        if (i % 2 === 0) leftY += 100;
        else rightY += 100;
      }
    }
    
    const configData = config.rows[0];
    
    // Get all nodes for this roadmap
    const nodes = await pool.query(
      'SELECT * FROM roadmap_nodes WHERE roadmap_config_id = $1 ORDER BY created_at',
      [configData.id]
    );
    
    // Get all edges
    const edges = await pool.query(
      'SELECT * FROM roadmap_edges WHERE roadmap_config_id = $1',
      [configData.id]
    );
    
    // Get all departments
    const departments = await pool.query(
      'SELECT * FROM roadmap_departments WHERE roadmap_config_id = $1',
      [configData.id]
    );
    
    res.json({
      ok: true,
      roadmap: {
        config: configData,
        nodes: nodes.rows,
        edges: edges.rows,
        departments: departments.rows
      }
    });
  } catch (e) {
    console.error('Roadmap fetch error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Add a new node
app.post('/roadmap/nodes', auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { nodeType, title, description, status, priority, positionX, positionY, projectId, ideaId, departmentId, parentNodeId, category, customData } = req.body;
    
    // Get user's roadmap config
    const config = await pool.query(
      'SELECT id FROM ai_roadmap_configs WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId]
    );
    
    if (config.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'No roadmap found' });
    }
    
    const configId = config.rows[0].id;
    
    const result = await pool.query(
      `INSERT INTO roadmap_nodes 
       (roadmap_config_id, node_type, title, description, status, priority, position_x, position_y, project_id, idea_id, department_id, parent_node_id, category, custom_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [configId, nodeType, title, description || '', status || 'planned', priority || 'medium', positionX || 0, positionY || 0, projectId || null, ideaId || null, departmentId || null, parentNodeId || null, category || null, customData || '{}']
    );
    
    res.json({ ok: true, node: result.rows[0] });
  } catch (e) {
    console.error('Add node error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update a node
app.put('/roadmap/nodes/:nodeId', auth(), async (req, res) => {
  try {
    const nodeId = Number(req.params.nodeId);
    const { title, description, status, priority, positionX, positionY, estimatedRoi, estimatedTimeline, customData } = req.body;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (title !== undefined) { updates.push(`title = $${paramCount++}`); values.push(title); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
    if (status !== undefined) { updates.push(`status = $${paramCount++}`); values.push(status); }
    if (priority !== undefined) { updates.push(`priority = $${paramCount++}`); values.push(priority); }
    if (positionX !== undefined) { updates.push(`position_x = $${paramCount++}`); values.push(positionX); }
    if (positionY !== undefined) { updates.push(`position_y = $${paramCount++}`); values.push(positionY); }
    if (estimatedRoi !== undefined) { updates.push(`estimated_roi = $${paramCount++}`); values.push(estimatedRoi); }
    if (estimatedTimeline !== undefined) { updates.push(`estimated_timeline = $${paramCount++}`); values.push(estimatedTimeline); }
    if (customData !== undefined) { updates.push(`custom_data = $${paramCount++}`); values.push(customData); }
    
    updates.push(`updated_at = NOW()`);
    values.push(nodeId);
    
    const query = `UPDATE roadmap_nodes SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Node not found' });
    }
    
    res.json({ ok: true, node: result.rows[0] });
  } catch (e) {
    console.error('Update node error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete a node
app.delete('/roadmap/nodes/:nodeId', auth(), async (req, res) => {
  try {
    const nodeId = Number(req.params.nodeId);
    
    await pool.query('DELETE FROM roadmap_nodes WHERE id = $1', [nodeId]);
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete node error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Add an edge (connection between nodes)
app.post('/roadmap/edges', auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { sourceNodeId, targetNodeId, edgeType, label, isCritical } = req.body;
    
    // Get user's roadmap config
    const config = await pool.query(
      'SELECT id FROM ai_roadmap_configs WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId]
    );
    
    if (config.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'No roadmap found' });
    }
    
    const configId = config.rows[0].id;
    
    const result = await pool.query(
      `INSERT INTO roadmap_edges (roadmap_config_id, source_node_id, target_node_id, edge_type, label, is_critical)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [configId, sourceNodeId, targetNodeId, edgeType || 'dependency', label || '', isCritical || false]
    );
    
    res.json({ ok: true, edge: result.rows[0] });
  } catch (e) {
    console.error('Add edge error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Delete an edge
app.delete('/roadmap/edges/:edgeId', auth(), async (req, res) => {
  try {
    const edgeId = Number(req.params.edgeId);
    
    await pool.query('DELETE FROM roadmap_edges WHERE id = $1', [edgeId]);
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete edge error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Add a department
app.post('/roadmap/departments', auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color, description, positionX, positionY } = req.body;
    
    // Get user's roadmap config
    const config = await pool.query(
      'SELECT id FROM ai_roadmap_configs WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId]
    );
    
    if (config.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'No roadmap found' });
    }
    
    const configId = config.rows[0].id;
    
    const result = await pool.query(
      `INSERT INTO roadmap_departments (roadmap_config_id, name, color, description, position_x, position_y)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [configId, name, color || '#3B82F6', description || '', positionX || 0, positionY || 0]
    );
    
    res.json({ ok: true, department: result.rows[0] });
  } catch (e) {
    console.error('Add department error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update department
app.put('/roadmap/departments/:deptId', auth(), async (req, res) => {
  try {
    const deptId = Number(req.params.deptId);
    const { name, color, description, positionX, positionY, aiAdoptionScore } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name !== undefined) { updates.push(`name = $${paramCount++}`); values.push(name); }
    if (color !== undefined) { updates.push(`color = $${paramCount++}`); values.push(color); }
    if (description !== undefined) { updates.push(`description = $${paramCount++}`); values.push(description); }
    if (positionX !== undefined) { updates.push(`position_x = $${paramCount++}`); values.push(positionX); }
    if (positionY !== undefined) { updates.push(`position_y = $${paramCount++}`); values.push(positionY); }
    if (aiAdoptionScore !== undefined) { updates.push(`ai_adoption_score = $${paramCount++}`); values.push(aiAdoptionScore); }
    
    values.push(deptId);
    
    const query = `UPDATE roadmap_departments SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Department not found' });
    }
    
    res.json({ ok: true, department: result.rows[0] });
  } catch (e) {
    console.error('Update department error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Bulk update node positions (for drag-and-drop)
app.post('/roadmap/bulk-update-positions', auth(), async (req, res) => {
  try {
    const { nodes } = req.body;
    
    if (!Array.isArray(nodes)) {
      return res.status(400).json({ ok: false, error: 'nodes must be an array' });
    }
    
    // Update all nodes in a transaction
    for (const node of nodes) {
      if (node.id && node.positionX !== undefined && node.positionY !== undefined) {
        await pool.query(
          'UPDATE roadmap_nodes SET position_x = $1, position_y = $2, updated_at = NOW() WHERE id = $3',
          [node.positionX, node.positionY, node.id]
        );
      }
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Bulk update error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Create a snapshot
app.post('/roadmap/snapshots', auth(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { notes } = req.body;
    
    // Get user's roadmap config
    const config = await pool.query(
      'SELECT id FROM ai_roadmap_configs WHERE user_id = $1 AND is_default = true LIMIT 1',
      [userId]
    );
    
    if (config.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'No roadmap found' });
    }
    
    const configId = config.rows[0].id;
    
    // Get current state
    const nodes = await pool.query('SELECT * FROM roadmap_nodes WHERE roadmap_config_id = $1', [configId]);
    const edges = await pool.query('SELECT * FROM roadmap_edges WHERE roadmap_config_id = $1', [configId]);
    const departments = await pool.query('SELECT * FROM roadmap_departments WHERE roadmap_config_id = $1', [configId]);
    
    const snapshotData = {
      nodes: nodes.rows,
      edges: edges.rows,
      departments: departments.rows,
      timestamp: new Date().toISOString()
    };
    
    const result = await pool.query(
      'INSERT INTO roadmap_snapshots (roadmap_config_id, snapshot_data, created_by, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [configId, JSON.stringify(snapshotData), userId, notes || '']
    );
    
    res.json({ ok: true, snapshot: result.rows[0] });
  } catch (e) {
    console.error('Snapshot creation error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get roadmap for advisor viewing a client's roadmap
app.get('/advisor/clients/:clientId/roadmap', auth('advisor'), async (req, res) => {
  try {
    const clientId = req.params.clientId;
    
    // Check if advisor has access to this client
    const access = await pool.query(
      'SELECT c.id FROM clients c WHERE c.id = $1 AND c.advisor_id = $2',
      [clientId, req.user.id]
    );
    
    if (access.rowCount === 0) {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }
    
    // Get client's roadmap
    const config = await pool.query(
      'SELECT * FROM ai_roadmap_configs WHERE user_id = $1 AND is_default = true LIMIT 1',
      [clientId]
    );
    
    if (config.rowCount === 0) {
      return res.json({ ok: true, roadmap: null });
    }
    
    const configData = config.rows[0];
    const nodes = await pool.query('SELECT * FROM roadmap_nodes WHERE roadmap_config_id = $1', [configData.id]);
    const edges = await pool.query('SELECT * FROM roadmap_edges WHERE roadmap_config_id = $1', [configData.id]);
    const departments = await pool.query('SELECT * FROM roadmap_departments WHERE roadmap_config_id = $1', [configData.id]);
    
    res.json({
      ok: true,
      roadmap: {
        config: configData,
        nodes: nodes.rows,
        edges: edges.rows,
        departments: departments.rows
      }
    });
  } catch (e) {
    console.error('Advisor roadmap fetch error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// AI-generate description for roadmap node
app.post('/roadmap/ai-description', auth(), async (req, res) => {
  try {
    const { title, nodeType } = req.body;
    
    if (!title) {
      return res.status(400).json({ ok: false, error: 'Title required' });
    }
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ ok: false, error: 'AI service not configured' });
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp' });
    
    const typeContext = nodeType === 'project' ? 'AI project' : nodeType === 'subcategory' ? 'business sub-category' : 'initiative';
    const prompt = `Generate a professional 3-4 sentence description for this ${typeContext} titled "${title}". The description should explain what this ${typeContext} involves and its potential business value. Keep it concise and strategic.`;
    
    const result = await model.generateContent(prompt);
    const description = result.response.text().trim();
    
    res.json({ ok: true, description });
  } catch (e) {
    console.error('AI description error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// One-time migration endpoint (admin only)
app.post('/admin/run-roadmap-migration', auth('admin'), async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const migrationFile = path.join(__dirname, 'migrations', 'create_ai_roadmap_tables.sql');
    
    if (!fs.existsSync(migrationFile)) {
      return res.status(404).json({ ok: false, error: 'Migration file not found' });
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute migration
    await pool.query(sql);
    
    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE 'roadmap%' OR table_name LIKE 'ai_roadmap%')
      ORDER BY table_name
    `);
    
    res.json({ 
      ok: true, 
      message: 'Migration completed successfully',
      tablesCreated: result.rows.map(r => r.table_name)
    });
  } catch (e) {
    console.error('Migration error:', e);
    res.status(500).json({ ok: false, error: e.message, details: e.stack });
  }
});


