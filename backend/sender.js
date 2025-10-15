const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const { marked } = require('marked');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL ? { rejectUnauthorized: false } : false });

async function loadSmtpSettings() {
  const r = await pool.query('select * from email_settings order by id desc limit 1');
  if (r.rowCount === 0) throw new Error('No SMTP settings configured');
  const s = r.rows[0];
  if ((s.provider || 'smtp') !== 'smtp') throw new Error('Only SMTP provider is supported in this worker');
  if (!s.smtp_host || !s.smtp_port || !s.smtp_username || !s.smtp_password || !s.from_email) {
    throw new Error('SMTP settings incomplete');
  }
  const transporter = nodemailer.createTransport({
    host: s.smtp_host,
    port: s.smtp_port,
    secure: !!s.smtp_secure,
    auth: { user: s.smtp_username, pass: s.smtp_password }
  });
  const from = s.from_name ? `${s.from_name} <${s.from_email}>` : s.from_email;
  console.log('[sender] SMTP configured', {
    host: s.smtp_host,
    port: s.smtp_port,
    secure: !!s.smtp_secure,
    from
  });
  return { transporter, from };
}

function applyMerge(template, metadata) {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
    const v = metadata && Object.prototype.hasOwnProperty.call(metadata, key) ? metadata[key] : '';
    return v == null ? '' : String(v);
  });
}

async function fetchTemplate(templateId) {
  if (!templateId) return null;
  const r = await pool.query('select id, subject, body from email_templates where id=$1', [templateId]);
  return r.rowCount > 0 ? r.rows[0] : null;
}

async function sendOne(row, mailer) {
  const { transporter, from } = mailer;
  const template = await fetchTemplate(row.template_id);
  const metadata = row.metadata || {};
  const subject = template ? applyMerge(template.subject, metadata) : row.subject;
  const body = template ? applyMerge(template.body, metadata) : row.body;
  const html = /<[^>]+>/.test(body) ? body : marked.parse(body);
  const to = row.to_email || (await (async () => {
    if (!row.to_user_id) return null;
    const u = await pool.query('select email from users where id=$1', [row.to_user_id]);
    return u.rowCount > 0 ? u.rows[0].email : null;
  })());
  if (!to) throw new Error('No recipient email');

  const attachments = (metadata.attachments || []).map((a) => ({ filename: a.filename, path: a.path, content: a.content }));
  const mask = (email) => {
    try { const [l, d] = String(email).split('@'); return `${l?.[0] || ''}***@${d || ''}`; } catch { return '***'; }
  };
  console.log('[sender] sending', { id: row.id, to: mask(to), subject });
  await transporter.sendMail({ from, to, subject, text: body, html, attachments });
  console.log('[sender] sent', { id: row.id, to: mask(to) });
}

async function runOnce(limit = 10) {
  console.log('[sender] runOnce start');
  const client = await pool.connect();
  try {
    const mailer = await loadSmtpSettings();
    await client.query('BEGIN');
    const { rows } = await client.query(
      "select * from email_outbox where status in ('queued','retry') and (scheduled_for is null or scheduled_for <= now()) order by created_at asc limit $1 for update skip locked",
      [limit]
    );
    console.log('[sender] picked', rows.length, 'emails');
    for (const row of rows) {
      try {
        await client.query('update email_outbox set status=\'sending\', updated_at=now() where id=$1', [row.id]);
        await sendOne(row, mailer);
        await client.query('update email_outbox set status=\'sent\', sent_at=now(), updated_at=now() where id=$1', [row.id]);
      } catch (e) {
        console.error('[sender] error', { id: row.id, error: e && e.message });
        const attempts = (row.attempts || 0) + 1;
        const nextAt = new Date(Date.now() + Math.min(60, attempts * 5) * 1000);
        await client.query('update email_outbox set status=\'retry\', attempts=$2, last_error=$3, scheduled_for=$4, updated_at=now() where id=$1', [row.id, attempts, e.message, nextAt]);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    console.error('[sender] fatal', e && e.message);
    throw e;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runOnce().then(() => {
    console.log('Outbox processed.');
    process.exit(0);
  }).catch((e) => {
    console.error('Sender failed:', e);
    process.exit(1);
  });
}

module.exports = { runOnce };


