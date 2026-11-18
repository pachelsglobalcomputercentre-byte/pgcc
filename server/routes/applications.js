const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const Application = require('../models/Application');
const User = require('../models/User');
const Course = require('../models/Course');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generatePasskey } = require('../utils/passkey');
const { sendApprovalEmail, sendApplicationReceivedEmail } = require('../utils/mailer');
const upload = require('../middleware/upload');

const router = express.Router();

// Applying is public (no login required), so it's the easiest endpoint on
// the whole site to spam. This still allows a genuine applicant to retry
// after a typo without any trouble.
const applyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many applications submitted from this connection — please try again later.' }
});

/* POST /api/applications — public, anyone can apply.
   Re-validates the important fields server-side too — never trust
   only what the browser already checked. Accepts the passport photo
   as a real uploaded file (multipart), not just a filename string. */
router.post('/', applyLimiter, upload.single('passportPhoto'), async (req, res) => {
  const b = req.body || {};
  const problems = [];
  if (!b.fullName) problems.push('Full name is required.');
  if (!b.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) problems.push('A valid email is required.');
  if (!b.nin || !/^\d{11}$/.test(b.nin)) problems.push('NIN must be exactly 11 digits.');
  if (!b.course) problems.push('Please select a course.');
  if (problems.length) return res.status(400).json({ error: problems[0] });

  try {
    const course = await Course.findOne({ title: b.course });

    // The training mode must match the course's own mode, so online and
    // physical tracks can't be mixed even if someone bypasses the form.
    const requestedMode = b.deliveryMode === 'physical' ? 'physical' : 'online';
    if (course && (course.deliveryMode || 'online') !== requestedMode) {
      return res.status(400).json({ error: `"${course.title}" is a ${course.deliveryMode || 'online'} course — please choose the matching training mode.` });
    }

    const courseCost = course ? parseInt(String(course.price).replace(/[^\d]/g, ''), 10) || 0 : 0;

    const application = await Application.create({
      fullName: b.fullName, dob: b.dob, gender: b.gender, nationality: b.nationality,
      state: b.state, lga: b.lga, address: b.address, phone: b.phone, email: b.email,
      nin: b.nin, deliveryMode: requestedMode,
      passportPhotoName: req.file ? req.file.originalname : (b.passportPhotoName || ''),
      passportPhotoUrl: req.file ? `/uploads/${req.file.filename}` : '',
      course: b.course, qualification: b.qualification, goal: b.goal, courseCost
    });

    try {
      await sendApplicationReceivedEmail(application);
    } catch (err) {
      console.error('Confirmation email failed to send:', err.message);
      // Application is still saved — this is a non-critical follow-up email.
    }

    res.status(201).json({ id: application._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save application. Please try again.' });
  }
});

/* GET /api/applications/:id/public — safe for the payment page to call
   without being logged in. Only returns what's needed to run checkout,
   never NIN/address/passkey/etc. */
router.get('/:id/public', async (req, res) => {
  const application = await Application.findById(req.params.id).select('fullName email course status officialEmail courseCost');
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  res.json({
    fullName: application.fullName,
    email: application.email,
    course: application.course,
    status: application.status,
    courseCost: application.courseCost
  });
});

/* PUT /api/applications/:id — admin edits applicant details, before or after approval */
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const editableFields = ['fullName', 'dob', 'gender', 'nationality', 'state', 'lga', 'address', 'phone', 'email', 'nin', 'course', 'deliveryMode', 'qualification', 'goal', 'courseCost', 'currentStage'];
  const update = {};
  editableFields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
  if (update.deliveryMode !== undefined) update.deliveryMode = update.deliveryMode === 'physical' ? 'physical' : 'online';

  const application = await Application.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  res.json(application);
});

/* GET /api/applications — admin only */
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const applications = await Application.find().sort({ submittedAt: -1 });
  res.json(applications);
});

/* GET /api/applications/:id — admin only */
router.get('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  res.json(application);
});

/* POST /api/applications/:id/approve — admin only.
   Assigns login credentials, creates the account, emails the payment link. */
router.post('/:id/approve', requireAuth, requireRole('admin'), async (req, res) => {
  const { officialEmail, passkey, course } = req.body;
  if (!officialEmail) return res.status(400).json({ error: 'An official email is required.' });

  const application = await Application.findById(req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found.' });

  // Admin explicitly assigns the course at approval — defaults to whatever
  // the applicant originally requested, but the admin has the final say.
  if (course && course !== application.course) {
    application.course = course;
    application.courseCost = 0; // will be re-derived below against the newly assigned course
  }

  const existing = await User.findOne({ email: officialEmail.toLowerCase().trim() });
  if (existing) return res.status(409).json({ error: 'That official email is already assigned to another account.' });

  const finalPasskey = passkey && passkey.length >= 8 ? passkey : generatePasskey();
  const passwordHash = await bcrypt.hash(finalPasskey, 10);

  const user = await User.create({
    email: officialEmail.toLowerCase().trim(),
    passwordHash,
    role: 'student',
    name: application.fullName,
    applicationId: application._id
  });

  application.status = 'approved';
  application.officialEmail = officialEmail;
  application.passkey = finalPasskey; // kept for the one-time on-screen/email reveal — see model comment
  application.userId = user._id;
  application.approvedAt = new Date();
  if (!application.courseCost) {
    const course = await Course.findOne({ title: application.course });
    if (course) application.courseCost = parseInt(String(course.price).replace(/[^\d]/g, ''), 10) || 0;
  }
  await application.save();

  try {
    await sendApprovalEmail(application);
  } catch (err) {
    console.error('Approval email failed to send:', err.message);
    // Application is still approved — admin can resend or share the link manually.
  }

  res.json({ success: true, officialEmail, passkey: finalPasskey });
});

/* POST /api/applications/:id/reject — admin only */
router.post('/:id/reject', requireAuth, requireRole('admin'), async (req, res) => {
  const application = await Application.findByIdAndUpdate(req.params.id, { status: 'rejected' }, { new: true });
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  res.json({ success: true });
});

module.exports = router;
