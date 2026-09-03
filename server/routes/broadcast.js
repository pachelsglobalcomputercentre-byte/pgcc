const express = require('express');
const User = require('../models/User');
const Application = require('../models/Application');
const Course = require('../models/Course');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sendBroadcastEmail } = require('../utils/mailer');

const router = express.Router();

async function resolveRecipients(recipientType, category, userIds) {
  if (recipientType === 'individual') {
    return User.find({ _id: { $in: userIds || [] }, role: 'student' });
  }
  if (recipientType === 'category') {
    const courses = await Course.find({ category }).select('title');
    const titles = courses.map(c => c.title);
    const apps = await Application.find({ course: { $in: titles } }).select('_id');
    const appIds = apps.map(a => a._id);
    return User.find({ role: 'student', applicationId: { $in: appIds } });
  }
  // 'all'
  return User.find({ role: 'student' });
}

/* GET /api/admin/broadcast/categories — distinct course categories with student counts */
router.get('/categories', requireAuth, requireRole('admin'), async (req, res) => {
  const courses = await Course.find().select('title category');
  const byCategory = {};
  courses.forEach(c => { (byCategory[c.category || 'Uncategorized'] = byCategory[c.category || 'Uncategorized'] || []).push(c.title); });

  const results = [];
  for (const [category, titles] of Object.entries(byCategory)) {
    const apps = await Application.find({ course: { $in: titles } }).select('_id');
    const count = await User.countDocuments({ role: 'student', applicationId: { $in: apps.map(a => a._id) } });
    results.push({ category, studentCount: count });
  }
  res.json(results);
});

/* POST /api/admin/broadcast — compose and send */
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, bodyHtml, channel, recipientType, category, userIds } = req.body;
  if (!title || !bodyHtml) return res.status(400).json({ error: 'Title and message content are required.' });
  if (!['email', 'notification', 'both'].includes(channel)) return res.status(400).json({ error: 'Invalid channel.' });

  const recipients = await resolveRecipients(recipientType, category, userIds);
  if (!recipients.length) return res.status(400).json({ error: 'No matching students found for that audience.' });

  let emailsSent = 0, emailsFailed = 0;
  if (channel === 'email' || channel === 'both') {
    for (const r of recipients) {
      try {
        await sendBroadcastEmail(r.email, title, bodyHtml);
        emailsSent++;
      } catch (err) {
        console.error(`Broadcast email failed for ${r.email}:`, err.message);
        emailsFailed++;
      }
    }
  }

  const notification = await Notification.create({
    title, bodyHtml, channel, recipientType, category,
    recipientUserIds: recipients.map(r => r._id),
    sentByName: req.user.name, emailsSent, emailsFailed
  });

  res.status(201).json({ success: true, recipientCount: recipients.length, emailsSent, emailsFailed, notificationId: notification._id });
});

/* GET /api/admin/broadcast/history */
router.get('/history', requireAuth, requireRole('admin'), async (req, res) => {
  const notes = await Notification.find().sort({ createdAt: -1 }).limit(50);
  res.json(notes.map(n => ({
    _id: n._id, title: n.title, channel: n.channel, recipientType: n.recipientType,
    category: n.category, recipientCount: n.recipientUserIds.length,
    emailsSent: n.emailsSent, emailsFailed: n.emailsFailed,
    sentByName: n.sentByName, createdAt: n.createdAt
  })));
});

module.exports = router;
