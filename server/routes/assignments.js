const express = require('express');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Notification = require('../models/Notification');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

/* GET /api/assignments — admin only, every assignment with submission counts */
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const assignments = await Assignment.find().sort({ course: 1, dueDate: 1 });
  const counts = await AssignmentSubmission.aggregate([
    { $group: { _id: '$assignmentId', total: { $sum: 1 }, graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } } } }
  ]);
  const countMap = {};
  counts.forEach(c => { countMap[String(c._id)] = c; });

  res.json(assignments.map(a => ({
    _id: a._id, title: a.title, course: a.course, instructions: a.instructions,
    dueDate: a.dueDate, maxScore: a.maxScore, attachmentUrl: a.attachmentUrl, attachmentName: a.attachmentName,
    submittedCount: countMap[String(a._id)]?.total || 0,
    gradedCount: countMap[String(a._id)]?.graded || 0,
    updatedAt: a.updatedAt
  })));
});

router.get('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
  res.json(assignment);
});

router.post('/', requireAuth, requireRole('admin'), upload.single('attachment'), async (req, res) => {
  const { title, course, instructions, dueDate, maxScore } = req.body;
  if (!title || !course) return res.status(400).json({ error: 'Title and course are required.' });

  const assignment = await Assignment.create({
    title, course, instructions: instructions || '', dueDate: dueDate || null, maxScore: Number(maxScore) || 100,
    attachmentUrl: req.file ? `/uploads/${req.file.filename}` : '',
    attachmentName: req.file ? req.file.originalname : ''
  });
  res.status(201).json(assignment);
});

router.put('/:id', requireAuth, requireRole('admin'), upload.single('attachment'), async (req, res) => {
  const { title, course, instructions, dueDate, maxScore } = req.body;
  const update = {};
  if (title) update.title = title;
  if (course) update.course = course;
  if (instructions !== undefined) update.instructions = instructions;
  if (dueDate !== undefined) update.dueDate = dueDate || null;
  if (maxScore !== undefined) update.maxScore = Number(maxScore) || 100;
  if (req.file) { update.attachmentUrl = `/uploads/${req.file.filename}`; update.attachmentName = req.file.originalname; }

  const assignment = await Assignment.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
  res.json(assignment);
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const assignment = await Assignment.findByIdAndDelete(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
  await AssignmentSubmission.deleteMany({ assignmentId: req.params.id });
  res.json({ success: true });
});

/* GET /api/assignments/:id/submissions — every student's submission, for grading */
router.get('/:id/submissions', requireAuth, requireRole('admin'), async (req, res) => {
  const subs = await AssignmentSubmission.find({ assignmentId: req.params.id })
    .populate('userId', 'name email')
    .sort({ submittedAt: -1 });
  res.json(subs.map(s => ({
    _id: s._id, student: s.userId?.name || 'Unknown', email: s.userId?.email || '',
    fileUrl: s.fileUrl, fileName: s.fileName, textAnswer: s.textAnswer,
    submittedAt: s.submittedAt, status: s.status, score: s.score, feedback: s.feedback
  })));
});

/* PUT /api/assignments/submissions/:submissionId/grade */
router.put('/submissions/:submissionId/grade', requireAuth, requireRole('admin'), async (req, res) => {
  const { score, feedback } = req.body;
  if (score === undefined || score === null || isNaN(Number(score))) {
    return res.status(400).json({ error: 'A numeric score is required.' });
  }
  const sub = await AssignmentSubmission.findByIdAndUpdate(
    req.params.submissionId,
    { score: Number(score), feedback: feedback || '', status: 'graded', gradedAt: new Date() },
    { new: true }
  );
  if (!sub) return res.status(404).json({ error: 'Submission not found.' });

  const assignment = await Assignment.findById(sub.assignmentId);
  await Notification.create({
    title: 'Assignment graded',
    bodyHtml: `<p>Your submission for <b>${assignment?.title || 'an assignment'}</b> has been graded: <b>${score}/${assignment?.maxScore || 100}</b>.${feedback ? ` Feedback: ${feedback}` : ''}</p>`,
    channel: 'both',
    recipientType: 'individual',
    recipientUserIds: [sub.userId],
    sentByName: req.user.name || 'Admin'
  });

  res.json(sub);
});

module.exports = router;
