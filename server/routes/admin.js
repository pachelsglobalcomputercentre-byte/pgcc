const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Settings = require('../models/Settings');
const { requireAuth, requireRole } = require('../middleware/auth');
const { generatePasskey } = require('../utils/passkey');
const upload = require('../middleware/upload');

const router = express.Router();

/* GET /api/admin/stats — powers the Overview dashboard cards, all real data */
router.get('/stats', requireAuth, requireRole('admin'), async (req, res) => {
  const [totalStudents, totalInstructors, pendingApplications, recentPayments, allPayments] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'instructor' }),
    Application.countDocuments({ status: 'pending' }),
    Payment.find().sort({ date: -1 }).limit(6),
    Payment.find()
  ]);
  const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  res.json({ totalStudents, totalInstructors, pendingApplications, recentPayments, totalRevenue, totalPayments: allPayments.length });
});

/* GET /api/admin/analytics — real, computed metrics only. Anything this
   school doesn't have a way to actually track yet (completion rate,
   satisfaction) is intentionally left out rather than faked. */
router.get('/analytics', requireAuth, requireRole('admin'), async (req, res) => {
  const [totalStudents, totalInstructors, totalCourses, applications, payments, courses] = await Promise.all([
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'instructor' }),
    Course.countDocuments(),
    Application.find({ status: { $in: ['approved', 'enrolled'] } }),
    Payment.find(),
    Course.find().select('title category deliveryMode')
  ]);

  const enrollmentByCourse = {};
  applications.forEach(a => { enrollmentByCourse[a.course] = (enrollmentByCourse[a.course] || 0) + 1; });

  // Real category breakdown — joins each application's course to its actual
  // admin-managed category, rather than a placeholder list.
  const courseToCategory = {};
  courses.forEach(c => { courseToCategory[c.title] = c.category || 'Uncategorized'; });
  const enrollmentByCategory = {};
  applications.forEach(a => {
    const cat = courseToCategory[a.course] || 'Uncategorized';
    enrollmentByCategory[cat] = (enrollmentByCategory[cat] || 0) + 1;
  });

  const enrollmentByDeliveryMode = { online: 0, physical: 0 };
  const courseToMode = {};
  courses.forEach(c => { courseToMode[c.title] = c.deliveryMode || 'online'; });
  applications.forEach(a => { enrollmentByDeliveryMode[courseToMode[a.course] || 'online']++; });

  const revenueByMonth = {};
  payments.forEach(p => {
    const key = new Date(p.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    revenueByMonth[key] = (revenueByMonth[key] || 0) + p.amount;
  });

  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const cashTotal = payments.filter(p => p.method === 'cash').reduce((s, p) => s + p.amount, 0);
  const onlineTotal = payments.filter(p => p.method === 'flutterwave').reduce((s, p) => s + p.amount, 0);

  res.json({
    totalStudents, totalInstructors, totalCourses, totalRevenue,
    enrollmentByCourse, enrollmentByCategory, enrollmentByDeliveryMode,
    revenueByMonth, cashTotal, onlineTotal
  });
});

/* GET /api/admin/students — real, registered students only, with computed
   payment history (cost/paid/balance) and enrollment timing. */
router.get('/students', requireAuth, requireRole('admin'), async (req, res) => {
  const [students, payments, courses] = await Promise.all([
    User.find({ role: 'student' }).populate('applicationId').sort({ createdAt: -1 }),
    Payment.find(),
    Course.find().select('title duration category')
  ]);

  const enriched = students.map(s => {
    const app = s.applicationId;
    const studentPayments = payments.filter(p => app && String(p.applicationId) === String(app._id));
    const paid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    const cost = app?.courseCost || 0;
    const course = courses.find(c => c.title === app?.course);
    return {
      _id: s._id, name: s.name, email: s.email, profileImage: s.profileImage, createdAt: s.createdAt,
      course: app?.course || '—', courseCategory: course?.category || 'Uncategorized', courseDuration: course?.duration || '', deliveryMode: app?.deliveryMode || 'online', enrollmentType: app?.enrollmentType || 'new', currentStage: app?.currentStage || '',
      enrolledAt: app?.approvedAt || app?.paidAt || s.createdAt,
      passportPhotoUrl: app?.passportPhotoUrl || '', phone: app?.phone || '', nin: app?.nin || '', address: app?.address || '',
      courseCost: cost, amountPaid: paid, balanceDue: Math.max(0, cost - paid),
      payments: studentPayments.map(p => ({ amount: p.amount, method: p.method, date: p.date }))
    };
  });

  res.json(enriched);
});

/* GET/PUT /api/admin/profile */
router.get('/profile', requireAuth, requireRole('admin'), async (req, res) => {
  const admin = await User.findById(req.user.uid).select('-passwordHash');
  if (!admin) return res.status(404).json({ error: 'Account not found.' });
  res.json(admin);
});

router.put('/profile', requireAuth, requireRole('admin'), upload.single('image'), async (req, res) => {
  const update = {};
  if (req.body.name) update.name = req.body.name;
  if (req.file) update.profileImage = `/uploads/${req.file.filename}`;

  const admin = await User.findByIdAndUpdate(req.user.uid, update, { new: true }).select('-passwordHash');
  if (!admin) return res.status(404).json({ error: 'Account not found.' });
  res.json(admin);
});

/* GET/PUT /api/admin/settings — a single shared settings document */
router.get('/settings', requireAuth, requireRole('admin'), async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  res.json(settings);
});

router.put('/settings', requireAuth, requireRole('admin'), upload.single('logo'), async (req, res) => {
  const b = req.body;
  const update = {
    schoolName: b.schoolName, shortName: b.shortName, address: b.address,
    phone: b.phone, email: b.email, primaryColor: b.primaryColor,
    emailNotifications: b.emailNotifications === 'true' || b.emailNotifications === 'on',
    smsAlerts: b.smsAlerts === 'true' || b.smsAlerts === 'on',
    weeklyDigest: b.weeklyDigest === 'true' || b.weeklyDigest === 'on',
    twoFactorRequired: b.twoFactorRequired === 'true' || b.twoFactorRequired === 'on',
    autoLogoutMinutes: b.autoLogoutMinutes ? Number(b.autoLogoutMinutes) : undefined,
    updatedAt: new Date()
  };
  if (req.file) update.logoUrl = `/uploads/${req.file.filename}`;
  Object.keys(update).forEach(k => update[k] === undefined && delete update[k]);

  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create(update);
  else { Object.assign(settings, update); await settings.save(); }
  res.json(settings);
});

/* POST /api/admin/students/manual — register a walk-in / cash-paying student,
   with full parity to the online application form plus financial tracking. */
router.post('/students/manual', requireAuth, requireRole('admin'), upload.single('passportPhoto'), async (req, res) => {
  const b = req.body;
  if (!b.fullName || !b.email || !b.course) {
    return res.status(400).json({ error: 'Full name, email, and course are required.' });
  }

  const existing = await User.findOne({ email: b.email.toLowerCase().trim() });
  if (existing) return res.status(409).json({ error: 'A student with that email already exists.' });

  const isOld = b.enrollmentType === 'old';
  const finalPasskey = b.passkey && b.passkey.length >= 8 ? b.passkey : generatePasskey();
  const passwordHash = await bcrypt.hash(finalPasskey, 10);

  const courseCost = Number(b.courseCost) || 0;
  const amountPaid = Number(b.amountPaid) || 0;

  const application = await Application.create({
    fullName: b.fullName, email: b.email, phone: b.phone, dob: b.dob, gender: b.gender,
    nationality: b.nationality, state: b.state, lga: b.lga, address: b.address, nin: b.nin,
    qualification: b.qualification, goal: b.goal, course: b.course,
    deliveryMode: b.deliveryMode === 'physical' ? 'physical' : 'online',
    passportPhotoName: req.file ? req.file.originalname : '',
    passportPhotoUrl: req.file ? `/uploads/${req.file.filename}` : '',
    status: 'enrolled', source: 'manual', enrollmentType: isOld ? 'old' : 'new',
    currentStage: isOld ? (b.currentStage || '') : '',
    courseCost,
    officialEmail: b.email, passkey: finalPasskey, approvedAt: new Date(), paidAt: new Date()
  });

  const user = await User.create({
    email: b.email.toLowerCase().trim(), passwordHash, role: 'student',
    name: b.fullName, applicationId: application._id
  });
  application.userId = user._id;
  await application.save();

  if (amountPaid > 0) {
    await Payment.create({
      studentName: b.fullName, studentEmail: b.email, course: b.course,
      amount: amountPaid, method: 'cash',
      applicationId: application._id, recordedByAdminName: req.user.name
    });
  }

  res.status(201).json({ success: true, officialEmail: b.email, passkey: finalPasskey });
});

/* ---------- Instructors (minimal real version — mirrors student manual reg) ---------- */
router.get('/instructors', requireAuth, requireRole('admin'), async (req, res) => {
  const instructors = await User.find({ role: 'instructor' }).sort({ createdAt: -1 });
  res.json(instructors);
});

router.post('/instructors', requireAuth, requireRole('admin'), async (req, res) => {
  const b = req.body;
  if (!b.name || !b.email) return res.status(400).json({ error: 'Name and email are required.' });

  const existing = await User.findOne({ email: b.email.toLowerCase().trim() });
  if (existing) return res.status(409).json({ error: 'An account with that email already exists.' });

  const finalPasskey = b.passkey && b.passkey.length >= 8 ? b.passkey : generatePasskey();
  const passwordHash = await bcrypt.hash(finalPasskey, 10);
  const user = await User.create({ email: b.email.toLowerCase().trim(), passwordHash, role: 'instructor', name: b.name });

  res.status(201).json({ success: true, officialEmail: user.email, passkey: finalPasskey });
});

module.exports = router;
