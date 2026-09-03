const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Application = require('../models/Application');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const QuizAttempt = require('../models/QuizAttempt');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

/* Updates the login streak: +1 if last active was exactly yesterday,
   reset to 1 on a gap or first-ever visit, unchanged if already
   counted today. Runs every time a student loads their dashboard. */
async function touchStreak(user) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (last) last.setHours(0, 0, 0, 0);

  if (!last) {
    user.streakCount = 1;
  } else {
    const diffDays = Math.round((today - last) / 86400000);
    if (diffDays === 0) { /* already counted today, no change */ }
    else if (diffDays === 1) user.streakCount += 1;
    else user.streakCount = 1;
  }
  user.lastActiveDate = new Date();
  await user.save();
  return user.streakCount;
}

/* Progress is tracked per MODULE. A module only counts as complete once:
     1) every lesson inside it is marked done, AND
     2) its quiz (if it has one) has been passed — a student can never
        self-mark a module "read" past a quiz they haven't passed.
   A module is LOCKED if either:
     a) the previous module isn't complete yet (sequential access), OR
     b) it's scheduled to unlock in a later course week (drip content).
   The very first module ignores (a) but still respects (b). */
async function computeModuleProgress(course, app) {
  const completed = new Set(app.completedLessonIds.map(String));
  const passedQuizModuleIds = new Set(
    (await QuizAttempt.find({ applicationId: app._id, passed: true })).map(a => a.moduleId)
  );

  const enrolledAt = app.approvedAt || app.paidAt || app.submittedAt;
  const weeksSinceEnroll = enrolledAt ? Math.floor((Date.now() - new Date(enrolledAt)) / (7 * 86400000)) + 1 : 999;

  let unlockedSoFar = true;
  const moduleStates = course.modules.map(m => {
    const lessonIds = m.lessons.map(l => String(l._id));
    const allLessonsDone = lessonIds.length > 0 && lessonIds.every(id => completed.has(id));
    const quizRequired = !!(m.quiz?.enabled && m.quiz.questionPool?.length);
    const quizPassed = !quizRequired || passedQuizModuleIds.has(String(m._id));
    const moduleComplete = allLessonsDone && quizPassed;

    const sequentialLocked = !unlockedSoFar;
    const dripLocked = weeksSinceEnroll < (m.unlockWeek || 1);
    const locked = sequentialLocked || dripLocked;

    if (!moduleComplete) unlockedSoFar = false;
    return {
      moduleId: String(m._id), complete: moduleComplete, locked,
      allLessonsDone, quizRequired, quizPassed, dripLocked,
      unlockWeek: m.unlockWeek || 1
    };
  });

  const totalModules = course.modules.length;
  const completedModules = moduleStates.filter(m => m.complete).length;
  const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;
  return { moduleStates, totalModules, completedModules, progressPercent, weeksSinceEnroll };
}

/* Overall grade = module completion % weighted by course.moduleWeight,
   plus the student's exam score (one attempt only) weighted by
   course.examWeight. Assignments aren't included yet — no real
   assignment system exists to pull real numbers from. */
async function computeOverallGrade(course, app, userId) {
  const { progressPercent } = await computeModuleProgress(course, app);
  const exam = await Exam.findOne({ course: course.title });
  let examScore = null;
  if (exam) {
    const attempt = await ExamAttempt.findOne({ examId: exam._id, userId, submittedAt: { $ne: null } });
    if (attempt) examScore = attempt.score;
  }
  const moduleWeight = course.moduleWeight ?? 40;
  const examWeight = course.examWeight ?? 60;
  const gradedExamWeight = examScore === null ? 0 : examWeight;
  const usedWeight = moduleWeight + gradedExamWeight;
  const overall = usedWeight > 0
    ? Math.round(((progressPercent * moduleWeight) + ((examScore || 0) * gradedExamWeight)) / usedWeight)
    : 0;
  return { overall, progressPercent, examScore };
}

/* GET /api/student/me — real profile + progress + updates the streak */
router.get('/me', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid).populate('applicationId');
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  const streakCount = await touchStreak(user);
  const app = user.applicationId;

  let progress = 0, totalModules = 0, completedModules = 0, overallGrade = 0, examScore = null;
  if (app) {
    const course = await Course.findOne({ title: app.course, status: 'published' });
    if (course) {
      const mod = await computeModuleProgress(course, app);
      progress = mod.progressPercent; totalModules = mod.totalModules; completedModules = mod.completedModules;
      const grade = await computeOverallGrade(course, app, user._id);
      overallGrade = grade.overall; examScore = grade.examScore;
    }
  }

  res.json({
    name: user.name, email: user.email, profileImage: user.profileImage, streakCount,
    joinDate: app?.approvedAt || app?.paidAt || user.createdAt,
    course: app?.course || '', courseCost: app?.courseCost || 0, deliveryMode: app?.deliveryMode || 'online',
    phone: app?.phone || '', address: app?.address || '', nationality: app?.nationality || '',
    state: app?.state || '', lga: app?.lga || '', gender: app?.gender || '', dob: app?.dob || '',
    nin: app?.nin || '', qualification: app?.qualification || '', currentStage: app?.currentStage || '',
    enrolledCoursesCount: app?.course ? 1 : 0,
    progress, totalModules, completedModules, overallGrade, examScore
  });
});

/* PUT /api/student/profile-photo — photo ONLY. Any other fields sent
   are deliberately ignored server-side, not just hidden in the UI,
   so this restriction actually holds even if someone calls the API directly. */
router.put('/profile-photo', requireAuth, requireRole('student'), upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });
  const user = await User.findByIdAndUpdate(req.user.uid, { profileImage: `/uploads/${req.file.filename}` }, { new: true }).select('-passwordHash');
  res.json(user);
});

/* GET /api/student/course — the real, PUBLISHED course this student is
   enrolled in, with per-lesson completion and per-module lock/quiz state. */
router.get('/course', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid).populate('applicationId');
  const app = user.applicationId;
  if (!app || !app.course) return res.json(null);

  const course = await Course.findOne({ title: app.course, status: 'published' });
  if (!course) return res.json(null);

  const { moduleStates } = await computeModuleProgress(course, app);
  const completed = new Set(app.completedLessonIds.map(String));
  const courseObj = course.toObject();
  courseObj.modules.forEach(m => {
    const state = moduleStates.find(s => s.moduleId === String(m._id));
    m.locked = state.locked;
    m.complete = state.complete;
    m.allLessonsDone = state.allLessonsDone;
    m.quizRequired = state.quizRequired;
    m.quizPassed = state.quizPassed;
    m.dripLocked = state.dripLocked;
    m.lessons.forEach(l => { l.completed = completed.has(String(l._id)); });
    if (m.quiz) { delete m.quiz.questionPool; } // never leak correct answers or full pool
  });

  res.json(courseObj);
});

/* POST /api/student/lessons/:lessonId/complete — toggle a lesson done/not
   done. Rejects if the lesson's module is still locked. */
router.post('/lessons/:lessonId/complete', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid);
  const app = await Application.findById(user.applicationId);
  if (!app) return res.status(404).json({ error: 'No enrollment found.' });

  const course = await Course.findOne({ title: app.course, status: 'published' });
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const owningModule = course.modules.find(m => m.lessons.some(l => String(l._id) === req.params.lessonId));
  if (!owningModule) return res.status(404).json({ error: 'Lesson not found.' });

  const { moduleStates } = await computeModuleProgress(course, app);
  const state = moduleStates.find(s => s.moduleId === String(owningModule._id));
  if (state.locked) return res.status(403).json({ error: state.dripLocked ? `This module unlocks in course week ${state.unlockWeek}.` : 'Complete the previous module first — this one is still locked.' });

  const id = req.params.lessonId;
  const already = app.completedLessonIds.includes(id);
  if (already) app.completedLessonIds = app.completedLessonIds.filter(x => x !== id);
  else app.completedLessonIds.push(id);
  await app.save();

  res.json({ completed: !already, completedLessonIds: app.completedLessonIds });
});

/* ---------- Module Quizzes ---------- */

/* GET /api/student/modules/:moduleId/quiz — a random subset of the pool,
   without correct answers. Requires all lessons in the module to be done. */
router.get('/modules/:moduleId/quiz', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid);
  const app = await Application.findById(user.applicationId);
  if (!app) return res.status(404).json({ error: 'No enrollment found.' });

  const course = await Course.findOne({ title: app.course, status: 'published' });
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const mod = course.modules.id(req.params.moduleId);
  if (!mod || !mod.quiz?.enabled) return res.status(404).json({ error: 'No quiz for this module.' });

  const { moduleStates } = await computeModuleProgress(course, app);
  const state = moduleStates.find(s => s.moduleId === req.params.moduleId);
  if (state.locked) return res.status(403).json({ error: 'This module is still locked.' });
  if (!state.allLessonsDone) return res.status(403).json({ error: 'Finish every lesson in this module before taking its quiz.' });

  const pool = [...mod.quiz.questionPool];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]; }
  const chosen = pool.slice(0, Math.min(mod.quiz.questionsPerAttempt || 10, pool.length));

  res.json({
    moduleTitle: mod.title,
    passScore: mod.quiz.passScore || 80,
    questions: chosen.map(q => ({ _id: q._id, questionText: q.questionText, options: q.options }))
  });
});

/* POST /api/student/modules/:moduleId/quiz/submit */
router.post('/modules/:moduleId/quiz/submit', requireAuth, requireRole('student'), async (req, res) => {
  const { questionIds, answers } = req.body;
  const user = await User.findById(req.user.uid);
  const app = await Application.findById(user.applicationId);
  if (!app) return res.status(404).json({ error: 'No enrollment found.' });

  const course = await Course.findOne({ title: app.course, status: 'published' });
  const mod = course?.modules.id(req.params.moduleId);
  if (!mod || !mod.quiz?.enabled) return res.status(404).json({ error: 'No quiz for this module.' });

  const total = questionIds.length;
  let correctCount = 0;
  const review = questionIds.map((qid, i) => {
    const q = mod.quiz.questionPool.id(qid);
    const selected = answers[i] !== undefined ? answers[i] : -1;
    const isCorrect = !!q && selected === q.correctIndex;
    if (isCorrect) correctCount++;
    return q ? { questionText: q.questionText, options: q.options, selectedIndex: selected, correctIndex: q.correctIndex, isCorrect } : null;
  }).filter(Boolean);

  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passScore = mod.quiz.passScore || 80;
  const passed = score >= passScore;

  await QuizAttempt.create({
    applicationId: app._id, courseId: course._id, moduleId: req.params.moduleId,
    questionIds, answers, score, passed
  });

  res.json({ score, passed, passScore, correctCount, totalQuestions: total, review });
});

/* GET /api/student/attendance — real records; empty/0% until an
   instructor actually marks attendance. */
router.get('/attendance', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid);
  if (!user.applicationId) return res.json({ percent: 0, recent: [] });

  const records = await Attendance.find({ applicationId: user.applicationId }).sort({ date: -1 });
  const percent = records.length ? Math.round((records.filter(r => r.status === 'present').length / records.length) * 100) : 0;

  res.json({
    percent,
    recent: records.slice(0, 10).map(r => ({ date: r.date, status: r.status }))
  });
});

/* ---------- Notifications ---------- */
router.get('/notifications', requireAuth, requireRole('student'), async (req, res) => {
  const uid = new mongoose.Types.ObjectId(req.user.uid);
  const notes = await Notification.find({
    channel: { $in: ['notification', 'both'] },
    recipientUserIds: uid
  }).sort({ createdAt: -1 }).limit(30);

  res.json(notes.map(n => ({
    _id: n._id, title: n.title, bodyHtml: n.bodyHtml, createdAt: n.createdAt,
    read: n.readBy.some(id => String(id) === String(req.user.uid))
  })));
});

router.post('/notifications/:id/read', requireAuth, requireRole('student'), async (req, res) => {
  const note = await Notification.findById(req.params.id);
  if (!note) return res.status(404).json({ error: 'Not found.' });
  if (!note.readBy.some(id => String(id) === String(req.user.uid))) {
    note.readBy.push(req.user.uid);
    await note.save();
  }
  res.json({ success: true });
});

/* ---------- Assignments — real coursework set by the admin, one submission each (resubmitting replaces it) ---------- */
router.get('/assignments', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid).populate('applicationId');
  const app = user.applicationId;
  if (!app || !app.course) return res.json([]);

  const assignments = await Assignment.find({ course: app.course }).sort({ dueDate: 1 });
  const submissions = await AssignmentSubmission.find({ applicationId: app._id });

  res.json(assignments.map(a => {
    const sub = submissions.find(s => String(s.assignmentId) === String(a._id));
    return {
      _id: a._id, title: a.title, course: a.course, instructions: a.instructions,
      dueDate: a.dueDate, maxScore: a.maxScore,
      attachmentUrl: a.attachmentUrl, attachmentName: a.attachmentName,
      submitted: !!sub, status: sub?.status || 'pending', score: sub?.score ?? null,
      feedback: sub?.feedback || '', submittedAt: sub?.submittedAt || null,
      fileName: sub?.fileName || '', textAnswer: sub?.textAnswer || ''
    };
  }));
});

router.post('/assignments/:id/submit', requireAuth, requireRole('student'), upload.single('file'), async (req, res) => {
  const user = await User.findById(req.user.uid).populate('applicationId');
  const app = user.applicationId;
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found.' });
  if (!app || app.course !== assignment.course) return res.status(403).json({ error: 'This assignment is not part of your course.' });

  const { textAnswer } = req.body;
  if (!req.file && !textAnswer?.trim()) {
    return res.status(400).json({ error: 'Attach a file or write an answer before submitting.' });
  }

  const update = {
    applicationId: app._id, userId: user._id, submittedAt: new Date(),
    status: 'submitted', score: null, feedback: '', gradedAt: null,
    textAnswer: textAnswer || ''
  };
  if (req.file) { update.fileUrl = `/uploads/${req.file.filename}`; update.fileName = req.file.originalname; }

  // upsert — resubmitting replaces the previous attempt rather than
  // creating a second row (the schema also enforces this with a unique index)
  const sub = await AssignmentSubmission.findOneAndUpdate(
    { assignmentId: assignment._id, applicationId: app._id },
    update,
    { new: true, upsert: true }
  );
  res.json(sub);
});

/* ---------- Exams — locked until enough modules are done, one attempt only ---------- */
router.get('/exams', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid).populate('applicationId');
  const app = user.applicationId;
  if (!app || !app.course) return res.json([]);

  const course = await Course.findOne({ title: app.course, status: 'published' });
  const completedModules = course ? (await computeModuleProgress(course, app)).completedModules : 0;

  const exams = await Exam.find({ course: app.course }).select('-questions.correctIndex');
  const attempts = await ExamAttempt.find({ userId: user._id, submittedAt: { $ne: null } });

  res.json(exams.map(e => {
    const attempt = attempts.find(a => String(a.examId) === String(e._id));
    const locked = completedModules < (e.requiredModulesCompleted || 0);
    return {
      _id: e._id, title: e.title, course: e.course, durationMinutes: e.durationMinutes,
      questionCount: e.questions.length, requiredModulesCompleted: e.requiredModulesCompleted || 0,
      locked, score: attempt ? attempt.score : null, attempted: !!attempt
    };
  }));
});

router.get('/exams/:id/start', requireAuth, requireRole('student'), async (req, res) => {
  const user = await User.findById(req.user.uid).populate('applicationId');
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const existing = await ExamAttempt.findOne({ examId: exam._id, userId: req.user.uid, submittedAt: { $ne: null } });
  if (existing) return res.status(403).json({ error: 'This exam has already been taken and cannot be retaken.' });

  const app = user.applicationId;
  const course = app ? await Course.findOne({ title: app.course, status: 'published' }) : null;
  const completedModules = course ? (await computeModuleProgress(course, app)).completedModules : 0;
  if (completedModules < (exam.requiredModulesCompleted || 0)) {
    return res.status(403).json({ error: `Complete ${exam.requiredModulesCompleted} module(s) before this exam unlocks.` });
  }

  const attempt = await ExamAttempt.create({ examId: exam._id, userId: req.user.uid, startedAt: new Date() });

  res.json({
    attemptId: attempt._id,
    title: exam.title,
    durationMinutes: exam.durationMinutes,
    questions: exam.questions.map(q => ({ _id: q._id, questionText: q.questionText, options: q.options, imageUrl: q.imageUrl }))
  });
});

router.post('/exams/:id/submit', requireAuth, requireRole('student'), async (req, res) => {
  const { attemptId, answers, timeExpired } = req.body;
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  const attempt = await ExamAttempt.findById(attemptId);
  if (!attempt || String(attempt.userId) !== String(req.user.uid)) return res.status(404).json({ error: 'Attempt not found.' });
  if (attempt.submittedAt) return res.status(403).json({ error: 'This attempt was already submitted.' });

  const total = exam.questions.length;
  let correctCount = 0;
  const review = exam.questions.map((q, i) => {
    const selected = Array.isArray(answers) && answers[i] !== undefined ? answers[i] : -1;
    const isCorrect = selected === q.correctIndex;
    if (isCorrect) correctCount++;
    return { questionText: q.questionText, options: q.options, selectedIndex: selected, correctIndex: q.correctIndex, isCorrect };
  });
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  attempt.answers = answers || [];
  attempt.score = score;
  attempt.correctCount = correctCount;
  attempt.totalQuestions = total;
  attempt.timeExpired = !!timeExpired;
  attempt.submittedAt = new Date();
  await attempt.save();

  res.json({ score, correctCount, totalQuestions: total, review });
});

router.get('/exams/:id/attempt', requireAuth, requireRole('student'), async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  const attempt = await ExamAttempt.findOne({ examId: exam._id, userId: req.user.uid, submittedAt: { $ne: null } });
  if (!attempt) return res.status(404).json({ error: 'No attempt found.' });

  const review = exam.questions.map((q, i) => ({
    questionText: q.questionText, options: q.options,
    selectedIndex: attempt.answers[i] !== undefined ? attempt.answers[i] : -1,
    correctIndex: q.correctIndex,
    isCorrect: attempt.answers[i] === q.correctIndex
  }));

  res.json({ score: attempt.score, correctCount: attempt.correctCount, totalQuestions: attempt.totalQuestions, review });
});

module.exports = router;
