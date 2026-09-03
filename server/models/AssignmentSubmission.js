const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, default: '' },
  fileName: { type: String, default: '' },
  textAnswer: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
  score: { type: Number, default: null },
  feedback: { type: String, default: '' },
  gradedAt: { type: Date }
});

// A student can only have one submission per assignment — resubmitting
// replaces it rather than creating duplicates.
assignmentSubmissionSchema.index({ assignmentId: 1, applicationId: 1 }, { unique: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
