const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course: { type: String, required: true }, // matches Course.title
  instructions: { type: String, default: '' },
  dueDate: { type: Date },
  maxScore: { type: Number, default: 100 },
  attachmentUrl: { type: String, default: '' }, // optional reference file from the admin, /uploads path
  attachmentName: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

assignmentSchema.pre('save', function (next) { this.updatedAt = new Date(); next(); });

module.exports = mongoose.model('Assignment', assignmentSchema);
