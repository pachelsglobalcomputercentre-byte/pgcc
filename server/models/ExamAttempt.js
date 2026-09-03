const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  answers: [{ type: Number }], // selected option index per question, -1 if unanswered
  score: { type: Number, default: 0 },        // 0-100
  correctCount: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  timeExpired: { type: Boolean, default: false },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date }
});

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);
