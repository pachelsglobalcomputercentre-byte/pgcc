/* =========================================================
   PGCC INSTITUTE — CREATE THE ADMIN ACCOUNT (run once)
   Usage:  cd server  →  npm install  →  npm run seed-admin
   Safe to run more than once — it updates the existing admin
   instead of duplicating it.
   ========================================================= */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');

const ADMIN_EMAIL = 'universalosasgoody@gmail.com';
const ADMIN_PASSKEY = '53-286-FGk-211-2UUq';

async function seed() {
  await connectDB();
  const passwordHash = await bcrypt.hash(ADMIN_PASSKEY, 10);

  const admin = await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    { email: ADMIN_EMAIL, passwordHash, role: 'admin', name: 'PGCC Institute Admin' },
    { upsert: true, new: true }
  );

  console.log('✓ Admin account ready:', admin.email);
  console.log('  Log in at login.html?role=admin with this email + the passkey.');
  console.log('  Consider rotating the passkey afterward, since it was shared in plain text earlier.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Failed to seed admin:', err.message);
  process.exit(1);
});
