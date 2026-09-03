const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  dob: String,
  gender: String,
  nationality: String,
  state: String,
  lga: String,
  address: String,
  phone: String,
  email: { type: String, required: true },
  nin: String,
  passportPhotoName: String,
  passportPhotoUrl: { type: String, default: '' },
  course: String,
  qualification: String,
  goal: String,

  courseCost: { type: Number, default: 0 },      // snapshot of price at approval/registration time
  currentStage: { type: String, default: '' },   // for returning/old students being backfilled
  deliveryMode: { type: String, enum: ['online', 'physical'], default: 'online' },
  completedLessonIds: { type: [String], default: [] }, // lesson subdocument _ids the student has marked done

  status: { type: String, enum: ['pending', 'approved', 'rejected', 'enrolled'], default: 'pending' },
  source: { type: String, enum: ['online', 'manual'], default: 'online' },
  enrollmentType: { type: String, enum: ['new', 'old'], default: 'new' }, // manual registration only

  // Credentials assigned by admin at approval time.
  // NOTE: passkey is kept in plain text here on purpose, so it can be
  // re-displayed once on the payment success screen and resent by email,
  // exactly as requested. The actual login check never reads this field —
  // it checks the bcrypt hash on the linked User instead. If you'd rather
  // not retain it at all, clear this field right after the applicant's
  // first successful login.
  officialEmail: String,
  passkey: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  submittedAt: { type: Date, default: Date.now },
  approvedAt: Date,
  paidAt: Date
});

module.exports = mongoose.model('Application', applicationSchema);
