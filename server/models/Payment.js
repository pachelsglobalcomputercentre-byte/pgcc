const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentEmail: String,
  course: String,
  amount: { type: Number, required: true },
  method: { type: String, enum: ['flutterwave', 'cash'], required: true },
  transactionRef: String, // Flutterwave transaction id, or blank for cash
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  recordedByAdminName: String, // set for cash payments
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
