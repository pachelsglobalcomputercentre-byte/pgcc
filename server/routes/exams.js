const express = require('express');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/* GET /api/exams — admin only, every exam with course + question count */
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const exams = await Exam.find().sort({ course: 1, updatedAt: -1 });
  res.json(exams.map(e => ({
    _id: e._id, title: e.title, course: e.course, durationMinutes: e.durationMinutes,
    requiredModulesCompleted: e.requiredModulesCompleted || 0,
    questionCount: e.questions.length, updatedAt: e.updatedAt
  })));
});

/* GET /api/exams/:id — full detail including answer keys, for editing */
router.get('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  res.json(exam);
});

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, course, durationMinutes, requiredModulesCompleted, questions } = req.body;
  if (!title || !course) return res.status(400).json({ error: 'Title and course are required.' });
  if (!Array.isArray(questions) || !questions.length) return res.status(400).json({ error: 'At least one question is required.' });

  for (const q of questions) {
    if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4 || q.correctIndex === undefined) {
      return res.status(400).json({ error: 'Every question needs text, exactly 4 options, and a correct answer.' });
    }
  }

  const exam = await Exam.create({ title, course, durationMinutes: durationMinutes || 30, requiredModulesCompleted: requiredModulesCompleted || 0, questions });
  res.status(201).json(exam);
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { title, course, durationMinutes, requiredModulesCompleted, questions } = req.body;
  const update = {};
  if (title) update.title = title;
  if (course) update.course = course;
  if (durationMinutes) update.durationMinutes = durationMinutes;
  if (requiredModulesCompleted !== undefined) update.requiredModulesCompleted = Number(requiredModulesCompleted) || 0;
  if (Array.isArray(questions)) {
    for (const q of questions) {
      if (!q.questionText || !Array.isArray(q.options) || q.options.length !== 4 || q.correctIndex === undefined) {
        return res.status(400).json({ error: 'Every question needs text, exactly 4 options, and a correct answer.' });
      }
    }
    update.questions = questions;
  }

  const exam = await Exam.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  res.json(exam);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const exam = await Exam.findByIdAndDelete(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  await ExamAttempt.deleteMany({ examId: req.params.id });
  res.json({ success: true });
});

/* GET /api/exams/:id/results — admin view of every student's attempts */
router.get('/:id/results', requireAuth, requireRole('admin'), async (req, res) => {
  const attempts = await ExamAttempt.find({ examId: req.params.id, submittedAt: { $ne: null } })
    .populate('userId', 'name email')
    .sort({ score: -1 });
  res.json(attempts.map(a => ({
    student: a.userId?.name || 'Unknown', email: a.userId?.email || '',
    score: a.score, correctCount: a.correctCount, totalQuestions: a.totalQuestions,
    submittedAt: a.submittedAt, timeExpired: a.timeExpired
  })));
});

module.exports = router;
