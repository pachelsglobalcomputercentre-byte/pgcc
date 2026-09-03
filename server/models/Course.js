const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  contentType: { type: String, enum: ['text', 'video', 'pdf', 'zip', 'ppt'], default: 'text' },
  richTextHtml: { type: String, default: '' }, // for 'text' lessons, written with the rich text editor
  videoUrl: { type: String, default: '' },      // YouTube embed link, for 'video' lessons
  fileUrl: { type: String, default: '' },       // /uploads path, for pdf/zip/ppt lessons
  fileName: { type: String, default: '' }
}, { _id: true });

const quizQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctIndex: { type: Number, required: true }
}, { _id: true });

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
  unlockWeek: { type: Number, default: 1 }, // drip scheduling — which course week this module opens on
  lessons: [lessonSchema],
  quiz: {
    enabled: { type: Boolean, default: false },
    questionPool: [quizQuestionSchema],       // admin can add a large pool
    questionsPerAttempt: { type: Number, default: 10 }, // randomly drawn each attempt
    passScore: { type: Number, default: 80 }  // fixed at 80 per spec, kept configurable just in case
  }
}, { _id: true });

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: String,
  deliveryMode: { type: String, enum: ['online', 'physical'], default: 'online' },
  level: { type: String, default: 'Beginner' },
  duration: String,
  price: String, // kept as a formatted string (e.g. "₦85,000") to match existing display code
  students: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  image: { type: String, default: '' }, // URL — external link or /uploads path
  description: { type: String, default: '' },
  modules: [moduleSchema],
  status: { type: String, enum: ['draft', 'published'], default: 'draft' }, // any create/edit reverts to draft until admin approves
  moduleWeight: { type: Number, default: 40 }, // % of overall grade from module completion
  examWeight: { type: Number, default: 60 },   // % of overall grade from final exam score
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

courseSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Course', courseSchema);
