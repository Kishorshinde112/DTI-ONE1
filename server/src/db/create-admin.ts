import * as readline from 'readline';
import * as argon2 from 'argon2';
import { pool } from './index.js';
import { config } from '../config/index.js';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s]).{8,}$/;

// Non-interactive mode: set ADMIN_EMAIL + ADMIN_PASSWORD (and optionally the
// rest) as environment variables. Needed on hosts with no SSH/TTY, where the
// interactive prompts below cannot run.
const ENV_KEYS = ['ADMIN_EMAIL', 'ADMIN_PASSWORD'] as const;
const nonInteractive = ENV_KEYS.every((k) => !!process.env[k]);

async function collectInteractively() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q: string): Promise<string> => new Promise((r) => rl.question(q, r));

  console.log('\n=== DTI Pulse - Create Admin Account ===\n');
  const data = {
    firstName: await ask('First Name: '),
    lastName: await ask('Last Name: '),
    email: await ask('Email: '),
    username: await ask('Username: '),
    phone: await ask('Phone: '),
    password: await ask('Password (min 8 chars, 1 upper, 1 lower, 1 number, 1 special): '),
  };
  rl.close();
  return data;
}

function collectFromEnv() {
  console.log('\n=== DTI Pulse - Create Admin Account (non-interactive) ===\n');
  return {
    firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
    lastName: process.env.ADMIN_LAST_NAME || 'User',
    email: process.env.ADMIN_EMAIL!,
    username: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL!.split('@')[0]!,
    phone: process.env.ADMIN_PHONE || '',
    password: process.env.ADMIN_PASSWORD!,
  };
}

async function createAdmin() {
  const data = nonInteractive ? collectFromEnv() : await collectInteractively();

  if (!data.email || !data.email.includes('@')) {
    console.error('A valid email is required.');
    await pool.end();
    process.exit(1);
  }

  if (!PASSWORD_REGEX.test(data.password) || /\s/.test(data.password)) {
    console.error(
      'Password does not meet requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special, no spaces.'
    );
    await pool.end();
    process.exit(1);
  }

  const connection = await pool.getConnection();
  let failed = false;
  try {
    const [existingEmail] = await connection.query('SELECT id FROM users WHERE email = ?', [data.email]);
    if (Array.isArray(existingEmail) && (existingEmail as any[]).length > 0) {
      console.error(`An account with email ${data.email} already exists.`);
      failed = true;
      return;
    }

    const [existingUsername] = await connection.query('SELECT id FROM users WHERE username = ?', [data.username]);
    if (Array.isArray(existingUsername) && (existingUsername as any[]).length > 0) {
      console.error(`The username "${data.username}" is already taken.`);
      failed = true;
      return;
    }

    const [maxId] = await connection.query('SELECT MAX(id) as maxId FROM users');
    const nextNum = ((maxId as any[])[0]?.maxId || 0) + 1;
    const employeeId = `${config.employeeIdPrefix}-${String(nextNum).padStart(4, '0')}`;

    const passwordHash = await argon2.hash(data.password, { type: argon2.argon2id });

    await connection.query(
      `INSERT INTO users (email, username, password_hash, first_name, last_name, phone, employee_id, role, employment_status, account_status, email_verified, joining_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'admin', 'active', 'active', TRUE, CURDATE())`,
      [data.email, data.username, passwordHash, data.firstName, data.lastName, data.phone, employeeId]
    );

    console.log(`\n✓ Admin account created successfully!`);
    console.log(`  Employee ID: ${employeeId}`);
    console.log(`  Email: ${data.email}`);
    console.log(`  Username: ${data.username}\n`);
  } catch (error) {
    console.error('Failed to create admin:', error instanceof Error ? error.message : error);
    failed = true;
  } finally {
    connection.release();
    await pool.end();
    if (failed) process.exit(1);
  }
}

createAdmin().catch((e) => {
  console.error('Failed to create admin:', e instanceof Error ? e.message : e);
  process.exit(1);
});
