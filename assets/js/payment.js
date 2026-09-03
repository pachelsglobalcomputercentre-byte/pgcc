/* =========================================================
   PGCC INSTITUTE — PAYMENT PAGE
   Flow: load application → show amount → Flutterwave checkout
   → server verifies the transaction (never trust the client
   alone) → reveal login credentials once, exactly per spec.
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const applicationId = params.get('applicationId');

  const states = ['loadingState', 'paymentState', 'verifyingState', 'successState', 'errorState'];
  function showState(name) {
    states.forEach(s => document.getElementById(s).style.display = s === name ? 'block' : 'none');
  }
  function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    showState('errorState');
  }

  if (!applicationId) {
    showError('No application was specified. Please use the link from your approval email.');
    return;
  }

  let application;
  try {
    const res = await fetch(`${API_BASE_URL}/applications/${applicationId}/public`);
    if (!res.ok) throw new Error((await res.json()).error || 'Application not found.');
    application = await res.json();
  } catch (err) {
    showError(`Could not load your application — is the backend running? (${err.message})`);
    return;
  }

  if (application.status === 'enrolled') {
    showError('This application has already been paid for. Please log in to your Student Portal.');
    return;
  }
  if (application.status !== 'approved') {
    showError('This application has not been approved yet.');
    return;
  }

  // Use the price locked in at approval time (fair to the applicant even if
  // the course price changes later), falling back to the live catalog only
  // for older test data that predates this field.
  let amountNaira = application.courseCost;
  if (!amountNaira) {
    try {
      const res = await fetch(`${API_BASE_URL}/courses`);
      const live = await res.json();
      const course = Array.isArray(live) ? live.find(c => c.title === application.course) : null;
      amountNaira = course ? parseInt(String(course.price).replace(/[^\d]/g, ''), 10) : null;
    } catch (err) { /* fall through to mock */ }
    if (!amountNaira) {
      const course = PGCC_DATA.courses.find(c => c.title === application.course);
      amountNaira = course ? parseInt(course.price.replace(/[^\d]/g, ''), 10) : 50000;
    }
  }

  document.getElementById('payApplicantName').textContent = application.fullName;
  document.getElementById('payCourseName').textContent = application.course;
  document.getElementById('payAmount').textContent = `₦${amountNaira.toLocaleString()}`;
  showState('paymentState');

  document.getElementById('payButton').addEventListener('click', () => {
    FlutterwaveCheckout({
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `PGCC-${applicationId}-${Date.now()}`,
      amount: amountNaira,
      currency: 'NGN',
      payment_options: 'card, banktransfer, ussd',
      customer: {
        email: application.email,
        name: application.fullName
      },
      customizations: {
        title: 'PGCC Institute',
        description: `Tuition — ${application.course}`,
        logo: `${window.location.origin}${window.location.pathname.replace('payment.html', '')}assets/img/logo.png`
      },
      callback: async (response) => {
        showState('verifyingState');
        try {
          const res = await fetch(`${API_BASE_URL}/payments/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transactionId: response.transaction_id, applicationId })
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Payment verification failed.');

          document.getElementById('revealEmail').textContent = json.officialEmail;
          document.getElementById('revealPasskey').textContent = json.passkey;
          showState('successState');
        } catch (err) {
          showError(`Payment succeeded but verification failed: ${err.message}. Please contact the school with your transaction ID (${response.transaction_id}).`);
        }
      },
      onclose: () => {
        // User closed the Flutterwave modal without paying — stay on the payment step.
      }
    });
  });
});
