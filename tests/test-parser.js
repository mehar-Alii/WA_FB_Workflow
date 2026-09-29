// test-parser.js
// Run: node test-parser.js
// Place this file in the SAME folder as product-parser.js
// (or change the require path below).
//
// Needs GEMINI_API_KEY in your .env — that's the only real dependency here,
// no server, Redis, Supabase, or WhatsApp involved.

require('dotenv').config({ quiet: true });
const { parseProductDetails } = require('../src/services/productParser');

const samples = [
  {
    label: 'Plain "Price:" label',
    expectSource: 'regex',
    text: `Beautiful lawn 3-piece suit, unstitched, pure cotton.
Price: 3500
DM to order.`
  },
  {
    label: '"Sale Price" with Rs. and a comma',
    expectSource: 'regex',
    text: `New arrival! Chiffon dupatta set 🥰
Sale Price Rs. 2,200 only
Limited stock`
  },
  {
    label: '"price pkr" no colon',
    expectSource: 'regex',
    text: `Stitched khaddar shirt, size M/L
price pkr 1800
Free delivery in Lahore`
  },
  {
    label: 'ALL CAPS, no space after colon',
    expectSource: 'regex',
    text: `PRICE:1200
Organza dupatta, hand embroidered`
  },
  {
    label: 'No price mentioned anywhere — should fall back to Gemini',
    expectSource: 'llm_fallback', // or 'unparsed' if Gemini also can't find one
    text: `Gorgeous embroidered lawn suit 😍 fabric feels amazing, matching dupatta included. DM for details and sizes available!`
  },
];

(async () => {
  let passed = 0;

  for (const { label, text, expectSource } of samples) {
    console.log('\n----------------------------------------');
    console.log(label);
    console.log('Input:', text.replace(/\n/g, ' \\n '));

    const result = await parseProductDetails(text);
    console.log('Result:', result);

    const ok =
      result.source === expectSource ||
      (expectSource === 'llm_fallback' && result.source === 'unparsed'); // both are acceptable outcomes for the price-less case

    console.log(ok ? '✅ As expected' : `⚠️  Expected source "${expectSource}", got "${result.source}"`);
    if (ok) passed++;
  }

  console.log(`\n${passed}/${samples.length} samples behaved as expected.`);
})();