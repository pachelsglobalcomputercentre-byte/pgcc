/* =========================================================
   PGCC INSTITUTE — CREATE / UPDATE THE ADMIN ACCOUNT
   The admin email and passkey are no longer stored in this file.
   Pass them in the environment when you run it:

   Windows (PowerShell):
     $env:SEED_ADMIN_EMAIL="you@example.com"; $env:SEED_ADMIN_PASSKEY="a-long-new-passkey"; npm run seed-admin
   Mac/Linux:
     SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSKEY='a-long-new-passkey' npm run seed-admin

   Safe to run more than once — it updates the existing admin
   instead of duplicating it (so it can also be used to rotate the passkey).
   ========================================================= */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');

const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_PASSKEY = process.env.SEED_ADMIN_PASSKEY || '';

async function seed() {
  if (!ADMIN_EMAIL || ADMIN_PASSKEY.length < 12) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSKEY (at least 12 characters) before running this script.');
    process.exit(1);
  }

  await connectDB();
  const passwordHash = await bcrypt.hash(ADMIN_PASSKEY, 10);

  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { email: ADMIN_EMAIL, passwordHash, role: 'admin', name: 'PGCC Institute Admin' },
    { upsert: true, new: true }
  );

  console.log('✓ Admin account ready:', admin.email);
  console.log('  Log in at login.html?role=admin with this email + the passkey you just set.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Failed to seed admin:', err.message);
  process.exit(1);
});
