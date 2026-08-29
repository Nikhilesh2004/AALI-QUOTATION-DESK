// ============================================================================
// Creates the Aali Quotation Desk logins.
//
// Run with: npm run create-users
// Requires .env.seed (gitignored, never committed) with:
//   SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
//
// Who gets created is read from scripts/users.json (also gitignored). Copy
// scripts/users.example.json and edit it. Format:
//   [
//     { "email": "you@aali.co", "full_name": "Your Name",
//       "role": "super_admin", "password": "optional" }
//   ]
//
// Safe to re-run: an email that already exists is not recreated, its role is
// reconciled instead. Passwords are only ever printed here, once, at creation
// -- they are not stored anywhere by this script.
// ============================================================================

import { existsSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

if (existsSync('.env.seed')) {
  for (const line of readFileSync('.env.seed', 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m) process.env[m[1]] = process.env[m[1]] ?? m[2].trim();
  }
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Put them in .env.seed (see .env.seed.example).');
  process.exit(1);
}

const USERS_FILE = 'scripts/users.json';
if (!existsSync(USERS_FILE)) {
  console.error(`Missing ${USERS_FILE}. Copy scripts/users.example.json to it and edit the entries.`);
  process.exit(1);
}

let users;
try {
  users = JSON.parse(readFileSync(USERS_FILE, 'utf8'));
} catch (err) {
  console.error(`${USERS_FILE} is not valid JSON: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(users) || users.length === 0) {
  console.error(`${USERS_FILE} must be a non-empty array of users.`);
  process.exit(1);
}

const VALID_ROLES = new Set(['staff', 'super_admin']);
for (const u of users) {
  if (!u.email || !u.full_name) {
    console.error(`Every user needs an "email" and a "full_name". Bad entry: ${JSON.stringify(u)}`);
    process.exit(1);
  }
  if (u.role && !VALID_ROLES.has(u.role)) {
    console.error(`Unknown role "${u.role}" for ${u.email}. Use "staff" or "super_admin".`);
    process.exit(1);
  }
}

// Readable but not guessable: no ambiguous characters, 16 chars of real entropy.
function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = randomBytes(16);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

const db = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const created = [];

for (const u of users) {
  const email = u.email.trim().toLowerCase();
  const role = u.role || 'staff';
  const password = u.password || generatePassword();

  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no invite mail round-trip; these are internal staff logins
    user_metadata: { full_name: u.full_name, role },
  });

  if (error) {
    const exists = /already been registered|already exists/i.test(error.message);
    if (!exists) {
      console.error(`✗ ${email}: ${error.message}`);
      continue;
    }

    // Already there -- make sure the profile row carries the intended role.
    const { data: found } = await db.from('profiles').select('id, role').eq('email', email).maybeSingle();
    if (!found) {
      console.error(`✗ ${email}: the auth user exists but has no profile row. Run supabase/schema.sql first.`);
      continue;
    }
    if (found.role !== role) {
      const { error: upErr } = await db.from('profiles').update({ role }).eq('id', found.id);
      if (upErr) console.error(`✗ ${email}: could not set role — ${upErr.message}`);
      else console.log(`↻ ${email} already existed — role set to ${role}`);
    } else {
      console.log(`· ${email} already exists as ${role} — nothing to do`);
    }
    continue;
  }

  // The handle_new_user trigger writes the profile row. Reconcile the role
  // anyway: if the trigger was not installed when this user was made, the
  // metadata role would otherwise be silently ignored.
  const { error: roleErr } = await db.from('profiles')
    .upsert({ id: data.user.id, email, full_name: u.full_name, role }, { onConflict: 'id' });
  if (roleErr) console.error(`  (warning) could not confirm profile row for ${email}: ${roleErr.message}`);

  created.push({ email, role, password, generated: !u.password });
  console.log(`✓ ${email} created as ${role}`);
}

if (created.length) {
  console.log('\n────────────────────────────────────────────────────────────');
  console.log('Logins. Generated passwords are shown ONCE — copy them now,');
  console.log('hand them over privately, and have each person change theirs.');
  console.log('────────────────────────────────────────────────────────────');
  for (const c of created) {
    console.log(`${c.email.padEnd(34)} ${c.role.padEnd(12)} ${c.password}${c.generated ? '' : '  (from users.json)'}`);
  }
  console.log('');
}

console.log('Done.');
