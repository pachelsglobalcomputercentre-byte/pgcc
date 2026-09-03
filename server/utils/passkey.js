// Produces something like: 2X8K-44-5GF-81TP
// Avoids 0/O and 1/I on purpose, so a printed or emailed code
// is never ambiguous when someone types it back in.
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GROUP_LENGTHS = [4, 2, 3, 4];

function generatePasskey() {
  return GROUP_LENGTHS
    .map(len => Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(''))
    .join('-');
}

module.exports = { generatePasskey };
