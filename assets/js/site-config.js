/* =========================================================
   PGCC INSTITUTE — SITE CONFIG
   One place to hold values that are easy to get wrong by
   hand-editing multiple files. Change here, applies everywhere.
   ========================================================= */

const ADMIN_NOTIFY_EMAIL = "pachelsglobalcomputercentre@gmail.com";

// TODO: update this once the server is deployed (e.g. Render).
// Until then, this assumes you're running it locally with `npm start`
// inside /server, which serves the API at localhost:5000.
const API_BASE_URL = "https://pgcc-tsfe.onrender.com/api";

// Turns a stored "/uploads/xyz.jpg" path into a full browsable URL.
// Passes through anything that's already a full URL unchanged.
function resolveUploadUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
  return API_BASE_URL.replace('/api', '') + path;
}

// Public key only — safe to expose in the browser. The secret and
// encryption keys stay server-side in server/.env and are never sent here.
const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-12437edfd6f3b2c53e2c9d54b3e80cf8-X";

// Nigeria's 36 states + FCT, for the "State of Origin" dropdown.
const NIGERIA_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT (Abuja)","Gombe",
  "Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos",
  "Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto",
  "Taraba","Yobe","Zamfara"
];

// Common nationality shortlist — "Other" in the form reveals a free-text field.
const NATIONALITIES = [
  "Nigerian","Ghanaian","Beninese","Cameroonian","Togolese","Other"
];
