const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
  markedByName: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);
