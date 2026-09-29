// Run: node tests/test-stamp.js /path/to/some-photo.jpg
// Uses the SAME stamping code the server uses (src/services/imageStamp.js),
// without touching R2, Supabase or WhatsApp. Your input file is not modified.

const fs = require('fs');
const path = require('path');
const { stampImage } = require('../src/services/imageStamp');

const rawPath = process.argv[2];
if (!rawPath) {
  console.error('Usage: node tests/test-stamp.js /path/to/photo.jpg');
  process.exit(1);
}
if (!fs.existsSync(rawPath)) {
  console.error(`File not found: ${rawPath}`);
  process.exit(1);
}

const OUT_DIR = path.join(__dirname, '..', 'stamp_test_output');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

(async () => {
  const testCode = 'TEST123';
  const { buffer, width, height, stripeHeight } = await stampImage(fs.readFileSync(rawPath), testCode);
  const stampedPath = path.join(OUT_DIR, `${testCode}_0.jpg`);
  fs.writeFileSync(stampedPath, buffer);

  console.log('Original size:', `${width}x${height}`);
  console.log('Stripe height:', stripeHeight, 'px (added below, canvas now', `${width}x${height + stripeHeight})`);
  console.log('Stamped image written to:', stampedPath);
  console.log('\nOpen it and check:');
  console.log('  1. The full original photo is visible and NOT cropped.');
  console.log('  2. A white stripe sits BELOW the photo (not overlapping it).');
  console.log(`  3. The stripe clearly reads "ID: ${testCode}".`);
})();
