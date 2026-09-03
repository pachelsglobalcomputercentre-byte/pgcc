const express = require('express');
const Course = require('../models/Course');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

/* ---------- Public: only PUBLISHED courses (marketing site + admission form) ---------- */
router.get('/', async (req, res) => {
  const filter = { status: 'published' };
  if (req.query.deliveryMode === 'online' || req.query.deliveryMode === 'physical') filter.deliveryMode = req.query.deliveryMode;
  const courses = await Course.find(filter).sort({ createdAt: -1 });
  res.json(courses);
});

/* ---------- Admin: every course regardless of status, with a clear badge in the UI ---------- */
router.get('/admin/all', requireAuth, requireRole('admin'), async (req, res) => {
  const courses = await Course.find().sort({ updatedAt: -1 });
  res.json(courses);
});

router.get('/:id', async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  res.json(course);
});

/* ---------- Admin: create / edit / delete ----------
   Every create or edit reverts status to 'draft' — nothing reaches
   students or the public site until the admin explicitly publishes it. */
router.post('/', requireAuth, requireRole('admin'), upload.single('image'), async (req, res) => {
  const b = req.body;
  if (!b.title) return res.status(400).json({ error: 'Course title is required.' });
  const course = await Course.create({
    title: b.title, category: b.category, level: b.level, duration: b.duration,
    price: b.price, description: b.description, deliveryMode: b.deliveryMode === 'physical' ? 'physical' : 'online',
    image: req.file ? `/uploads/${req.file.filename}` : (b.image || ''),
    status: 'draft'
  });
  res.status(201).json(course);
});

router.put('/:id', requireAuth, requireRole('admin'), upload.single('image'), async (req, res) => {
  const b = req.body;
  const update = {
    title: b.title, category: b.category, level: b.level, duration: b.duration,
    price: b.price, description: b.description, status: 'draft'
  };
  if (b.deliveryMode) update.deliveryMode = b.deliveryMode === 'physical' ? 'physical' : 'online';
  if (b.moduleWeight !== undefined) update.moduleWeight = Number(b.moduleWeight);
  if (b.examWeight !== undefined) update.examWeight = Number(b.examWeight);
  if (req.file) update.image = `/uploads/${req.file.filename}`;
  else if (b.image) update.image = b.image;

  const course = await Course.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  res.json(course);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  res.json({ success: true });
});

/* POST /:id/publish — the explicit approval step. Only this makes a
   course (and any pending edits to it) visible to students/the public. */
router.post('/:id/publish', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, { status: 'published' }, { new: true });
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  res.json(course);
});

router.post('/:id/unpublish', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, { status: 'draft' }, { new: true });
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  res.json(course);
});

/* ---------- Admin: modules (also revert the course to draft) ---------- */
router.post('/:id/modules', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  course.modules.push({
    title: req.body.title || 'Untitled Module',
    order: course.modules.length,
    unlockWeek: Number(req.body.unlockWeek) || 1
  });
  course.status = 'draft';
  await course.save();
  res.status(201).json(course);
});

router.put('/:id/modules/:moduleId', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found.' });
  if (req.body.title) mod.title = req.body.title;
  if (req.body.unlockWeek !== undefined) mod.unlockWeek = Number(req.body.unlockWeek) || 1;
  course.status = 'draft';
  await course.save();
  res.json(course);
});

router.delete('/:id/modules/:moduleId', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  course.modules.id(req.params.moduleId)?.deleteOne();
  course.status = 'draft';
  await course.save();
  res.json(course);
});

/* ---------- Admin: module quiz (question pool, shuffled per attempt) ---------- */
router.get('/:id/modules/:moduleId/quiz', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found.' });
  res.json(mod.quiz || { enabled: false, questionPool: [], questionsPerAttempt: 10, passScore: 80 });
});

router.put('/:id/modules/:moduleId/quiz', requireAuth, requireRole('admin'), async (req, res) => {
  const { enabled, questionPool, questionsPerAttempt, passScore } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found.' });

  if (Array.isArray(questionPool)) {
    for (const q of questionPool) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4 || q.correctIndex === undefined) {
        return res.status(400).json({ error: 'Every quiz question needs text, exactly 4 options, and a correct answer.' });
      }
    }
  }

  mod.quiz = {
    enabled: !!enabled,
    questionPool: Array.isArray(questionPool) ? questionPool : (mod.quiz?.questionPool || []),
    questionsPerAttempt: questionsPerAttempt ? Number(questionsPerAttempt) : (mod.quiz?.questionsPerAttempt || 10),
    passScore: passScore ? Number(passScore) : (mod.quiz?.passScore || 80)
  };
  course.status = 'draft';
  await course.save();
  res.json(mod.quiz);
});

/* ---------- Admin: lessons (accepts an optional file upload for pdf/zip/ppt types) ---------- */
router.post('/:id/modules/:moduleId/lessons', requireAuth, requireRole('admin'), upload.single('file'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found.' });

  const b = req.body;
  mod.lessons.push({
    title: b.title || 'Untitled Lesson',
    order: mod.lessons.length,
    contentType: b.contentType || 'text',
    richTextHtml: b.richTextHtml || '',
    videoUrl: b.videoUrl || '',
    fileUrl: req.file ? `/uploads/${req.file.filename}` : '',
    fileName: req.file ? req.file.originalname : ''
  });
  course.status = 'draft';
  await course.save();
  res.status(201).json(course);
});

router.put('/:id/modules/:moduleId/lessons/:lessonId', requireAuth, requireRole('admin'), upload.single('file'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found.' });
  const lesson = mod.lessons.id(req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });

  const b = req.body;
  if (b.title) lesson.title = b.title;
  if (b.contentType) lesson.contentType = b.contentType;
  if (b.richTextHtml !== undefined) lesson.richTextHtml = b.richTextHtml;
  if (b.videoUrl !== undefined) lesson.videoUrl = b.videoUrl;
  if (req.file) { lesson.fileUrl = `/uploads/${req.file.filename}`; lesson.fileName = req.file.originalname; }

  course.status = 'draft';
  await course.save();
  res.json(course);
});

router.delete('/:id/modules/:moduleId/lessons/:lessonId', requireAuth, requireRole('admin'), async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const mod = course.modules.id(req.params.moduleId);
  if (!mod) return res.status(404).json({ error: 'Module not found.' });
  mod.lessons.id(req.params.lessonId)?.deleteOne();
  course.status = 'draft';
  await course.save();
  res.json(course);
});

module.exports = router;
