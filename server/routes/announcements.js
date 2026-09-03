const express = require('express');
const Announcement = require('../models/Announcement');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/', async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });
  res.json(announcements);
});

router.get('/:id', async (req, res) => {
  const a = await Announcement.findById(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found.' });
  res.json(a);
});

router.post('/', requireAuth, requireRole('admin'), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'attachment', maxCount: 1 }]), async (req, res) => {
  const b = req.body;
  if (!b.title) return res.status(400).json({ error: 'Title is required.' });

  const attachments = [];
  if (req.files?.attachment?.[0]) {
    const f = req.files.attachment[0];
    attachments.push({ name: f.originalname, url: `/uploads/${f.filename}` });
  }

  const announcement = await Announcement.create({
    title: b.title,
    excerpt: b.excerpt || '',
    bodyHtml: b.bodyHtml || '',
    category: b.category || 'Notice',
    image: req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : '',
    attachments
  });
  res.status(201).json(announcement);
});

router.put('/:id', requireAuth, requireRole('admin'), upload.fields([{ name: 'image', maxCount: 1 }, { name: 'attachment', maxCount: 1 }]), async (req, res) => {
  const b = req.body;
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Not found.' });

  if (b.title) announcement.title = b.title;
  if (b.excerpt !== undefined) announcement.excerpt = b.excerpt;
  if (b.bodyHtml !== undefined) announcement.bodyHtml = b.bodyHtml;
  if (b.category) announcement.category = b.category;
  if (req.files?.image?.[0]) announcement.image = `/uploads/${req.files.image[0].filename}`;
  if (req.files?.attachment?.[0]) {
    const f = req.files.attachment[0];
    announcement.attachments.push({ name: f.originalname, url: `/uploads/${f.filename}` });
  }

  await announcement.save();
  res.json(announcement);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);
  if (!announcement) return res.status(404).json({ error: 'Not found.' });
  res.json({ success: true });
});

module.exports = router;
