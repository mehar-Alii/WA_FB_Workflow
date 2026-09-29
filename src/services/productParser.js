'use strict';

// Regex first (instant, $0, handles the vast majority of posts).
// Falls back to Gemini's free tier ONLY when regex can't find a price
// (no billing account attached to this key — hard ceiling, never charges).

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Created on first use so a missing GEMINI_API_KEY only disables the
// fallback (same graceful degradation as before) instead of breaking startup.
let model = null;
function getModel() {
  if (!model) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-lite', // higher free daily limit, plenty for a small extraction task
      generationConfig: { responseMimeType: 'application/json' },
    });
  }
  return model;
}

// ---------------------------------------------------------------------------
// Fast path — regex, anchored on the word "price" so it ignores unrelated
// numbers scattered through these posts (sizes, model numbers, "100%", etc.)
// ---------------------------------------------------------------------------
function parsePriceRegex(text) {
  const priceRegex = /(?:sale\s+)?\bprice\b\s*(?:only)?\s*[:\-]?\s*(?:rs\.?|pkr)?\s*([\d,]+(?:\.\d+)?)/i;
  const match = text.match(priceRegex);
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ''));
}

// ---------------------------------------------------------------------------
// Fallback path — only reached when the regex above returns null.
// Asks Gemini for structured JSON so parsing the response is trivial.
// ---------------------------------------------------------------------------
async function parseWithGemini(text) {
  const prompt = `You are extracting structured data from a clothing/product resale listing.
The text may contain emojis, stylized unicode characters, hashtags, and inconsistent formatting.

Return ONLY a JSON object with exactly these fields:
- "price": the numeric sale price as a number (no currency symbols, no commas). If genuinely no price is mentioned anywhere, use null.
- "description": a cleaned, human-readable one-paragraph summary of the product (brand, fabric, key details). Do not include the price in this field.

Listing text:
"""
${text}
"""`;

  const result = await getModel().generateContent(prompt);
  const raw = result.response.text();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Gemini returned non-JSON output: ${raw.slice(0, 200)}`);
  }

  if (typeof parsed.price !== 'number' && parsed.price !== null) {
    throw new Error(`Unexpected price type from Gemini: ${JSON.stringify(parsed.price)}`);
  }

  return {
    price: parsed.price,
    description: parsed.description || text,
  };
}

// ---------------------------------------------------------------------------
// Public entry point — this is what the webhook calls.
// ---------------------------------------------------------------------------
async function parseProductDetails(text) {
  const regexPrice = parsePriceRegex(text);

  if (regexPrice !== null) {
    return { price: regexPrice, description: text, source: 'regex' };
  }

  console.log('Regex found no price — falling back to Gemini for:', text.slice(0, 80));

  try {
    const { price, description } = await parseWithGemini(text);

    if (price === null) {
      console.log('Gemini also found no price — saving as needs_review.');
      return { price: null, description: text, source: 'unparsed' };
    }

    return { price, description, source: 'llm_fallback' };
  } catch (err) {
    // Free-tier quota hit, API key issue, network blip, malformed response — any
    // of these should degrade gracefully, never crash the webhook.
    console.error('Gemini fallback failed:', err.message);
    return { price: null, description: text, source: 'unparsed' };
  }
}

module.exports = { parseProductDetails, parsePriceRegex };
