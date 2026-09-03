const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { sendTwoFactorCode } = require('../utils/mailer');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Slows down brute-force / credential-stuffing attempts against login and
// the 2FA code check. Generous enough that a real user mistyping their
// passkey a few times never gets blocked.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please wait a few minutes and try again.' }
});

/* GET /api/auth/me — the logged-in user's own current profile, including photo.
   Used to refresh the sidebar/topbar avatar and the My Profile page reliably,
   instead of trusting whatever was cached in localStorage at login time. */
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.uid).select('-passwordHash');
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  res.json(user);
});

// Short-lived 2FA codes, kept in memory (fine at this scale — a single
// small server). Cleared automatically after use or 10 minutes.
const pendingCodes = new Map();

function signToken(user) {
  return jwt.sign(
    { uid: user._id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

/* POST /api/auth/login — email + passkey.
   Students/instructors get a token immediately.
   Admins get a 2FA code emailed instead, and must call /verify-2fa next. */
router.post('/login', authLimiter, async (req, res) => {
  const { email, passkey } = req.body;
  if (!email || !passkey) return res.status(400).json({ error: 'Email and passkey are required.' });

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Same generic error either way — don't reveal whether the email exists.
  if (!user) return res.status(401).json({ error: 'Invalid email or passkey.' });

  const match = await bcrypt.compare(passkey, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid email or passkey.' });

  if (user.role === 'admin') {
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    pendingCodes.set(String(user._id), { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    try {
      await sendTwoFactorCode(user.email, code);
    } catch (err) {
      console.error('Failed to send 2FA email:', err.message);
      return res.status(500).json({ error: 'Could not send verification code. Try again shortly.' });
    }
    return res.json({ requiresTwoFactor: true, uid: user._id });
  }

  res.json({ token: signToken(user), role: user.role, name: user.name, email: user.email, profileImage: user.profileImage });
});

/* POST /api/auth/verify-2fa — admin only, second step of login */
router.post('/verify-2fa', authLimiter, async (req, res) => {
  const { uid, code } = req.body;
  const pending = pendingCodes.get(String(uid));

  if (!pending || pending.expiresAt < Date.now()) {
    return res.status(401).json({ error: 'Code expired — please log in again.' });
  }
  if (pending.code !== String(code)) {
    return res.status(401).json({ error: 'Incorrect code.' });
  }

  pendingCodes.delete(String(uid));
  const user = await User.findById(uid);
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  res.json({ token: signToken(user), role: user.role, name: user.name, email: user.email, profileImage: user.profileImage });
});

module.exports = router;
