/* =========================================================
   PGCC INSTITUTE — PRE-LAUNCH DATA RESET (run once, locally)
   Wipes test students, applications, payments, and exam/quiz
   attempts so the platform starts fresh for real users.
   Does NOT touch: your admin account, courses, announcements,
   settings, or exam/quiz question banks — only test activity data.

   Usage:  cd server  →  node reset-test-data.js
   You'll be asked to type CONFIRM before anything is deleted.
   ========================================================= */

require('dotenv').config();
const readline = require('readline');
const connectDB = require('./db');
const User = require('./models/User');
const Application = require('./models/Application');
const Payment = require('./models/Payment');
const ExamAttempt = require('./models/ExamAttempt');
const QuizAttempt = require('./models/QuizAttempt');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const Notification = require('./models/Notification');
const Attendance = require('./models/Attendance');

async function reset() {
  await connectDB();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => {
    rl.question(
      '\nThis will PERMANENTLY delete all students, instructors, applications,\n' +
      'payments, exam/quiz attempts, assignment submissions, notifications, and attendance records.\n' +
      'Your admin account, courses, exams, assignments, and announcements are kept.\n\n' +
      'Type CONFIRM to proceed: ', resolve
    );
  });
  rl.close();

  if (answer.trim() !== 'CONFIRM') {
    console.log('Cancelled — nothing was deleted.');
    process.exit(0);
  }

  const [students, instructors, apps, payments, examAttempts, quizAttempts, assignmentSubmissions, notifications, attendance] = await Promise.all([
    User.deleteMany({ role: 'student' }),
    User.deleteMany({ role: 'instructor' }),
    Application.deleteMany({}),
    Payment.deleteMany({}),
    ExamAttempt.deleteMany({}),
    QuizAttempt.deleteMany({}),
    AssignmentSubmission.deleteMany({}),
    Notification.deleteMany({}),
    Attendance.deleteMany({})
  ]);

  console.log('\n✓ Reset complete:');
  console.log(`  Students removed: ${students.deletedCount}`);
  console.log(`  Instructors removed: ${instructors.deletedCount}`);
  console.log(`  Applications removed: ${apps.deletedCount}`);
  console.log(`  Payments removed: ${payments.deletedCount}`);
  console.log(`  Exam attempts removed: ${examAttempts.deletedCount}`);
  console.log(`  Quiz attempts removed: ${quizAttempts.deletedCount}`);
  console.log(`  Assignment submissions removed: ${assignmentSubmissions.deletedCount}`);
  console.log(`  Notifications removed: ${notifications.deletedCount}`);
  console.log(`  Attendance records removed: ${attendance.deletedCount}`);
  console.log('\nYour admin account, courses, exams, assignments, and announcements were left untouched.');
  console.log('Total revenue, student counts, and analytics will now show real zeros until real users sign up.\n');
  process.exit(0);
}

reset().catch(err => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
