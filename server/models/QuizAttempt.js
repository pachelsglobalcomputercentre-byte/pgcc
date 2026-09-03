const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleId: { type: String, required: true }, // Course.modules subdocument _id, as a string
  questionIds: [{ type: String }], // which pool questions were asked this attempt (for grading + review)
  answers: [{ type: Number }],
  score: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  attemptedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
