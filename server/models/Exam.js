const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: { type: [String], required: true }, // exactly 4, [A, B, C, D]
  correctIndex: { type: Number, required: true }, // 0-3
  imageUrl: { type: String, default: '' }
}, { _id: true });

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, required: true }, // matches Course.title
  durationMinutes: { type: Number, default: 30 },
  requiredModulesCompleted: { type: Number, default: 0 }, // student must finish this many modules first
  questions: [questionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

examSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('Exam', examSchema);
