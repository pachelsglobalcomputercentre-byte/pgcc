const express = require('express');
const Application = require('../models/Application');
const Payment = require('../models/Payment');
const { sendCredentialsEmail } = require('../utils/mailer');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/* GET /api/payments — admin only, full payment log */
router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const payments = await Payment.find().sort({ date: -1 });
  res.json(payments);
});

/* POST /api/payments/verify — called by payment.html after Flutterwave's
   checkout reports success client-side. That report alone is NOT trusted —
   this re-checks the transaction directly with Flutterwave's own server
   using the secret key, which only this backend ever sees. */
router.post('/verify', async (req, res) => {
  const { transactionId, applicationId } = req.body;
  if (!transactionId || !applicationId) {
    return res.status(400).json({ error: 'transactionId and applicationId are required.' });
  }

  try {
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}` }
    });
    const verifyJson = await verifyRes.json();

    if (verifyJson.status !== 'success' || verifyJson.data?.status !== 'successful') {
      return res.status(402).json({ error: 'Payment could not be verified.' });
    }

    const application = await Application.findById(applicationId);
    if (!application) return res.status(404).json({ error: 'Application not found.' });

    // Confirm the amount paid matches what the course costs, so a verified-but-
    // wrong-amount transaction on a different item can't be replayed here.
    // TODO: once course prices live in a database (not data.js), compare
    // verifyJson.data.amount against the real course price before proceeding.

    application.status = 'enrolled';
    application.paidAt = new Date();
    await application.save();

    await Payment.create({
      studentName: application.fullName,
      studentEmail: application.email,
      course: application.course,
      amount: verifyJson.data.amount || 0,
      method: 'flutterwave',
      transactionRef: String(transactionId),
      applicationId: application._id
    });

    try {
      await sendCredentialsEmail(application);
    } catch (err) {
      console.error('Credentials email failed to send:', err.message);
    }

    res.json({ success: true, officialEmail: application.officialEmail, passkey: application.passkey });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: 'Payment verification failed. Please contact the school with your transaction ID.' });
  }
});

module.exports = router;
