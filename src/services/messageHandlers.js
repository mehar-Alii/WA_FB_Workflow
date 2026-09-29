'use strict';

const { supabase, redis } = require('../clients');
const config = require('../config');
const { parseProductDetails } = require('./productParser');
const { stampImage } = require('./imageStamp');
const { uploadToR2, publicUrlFor } = require('./storage');
const whatsapp = require('./whatsapp');

// ---------------------------------------------------------------------------
// Pending buffer — a Redis list, so it survives across separate serverless
// invocations.
// ---------------------------------------------------------------------------
async function handleIncomingImage(from, mediaId) {
  const key = `pending:${from}`;

  await redis.rpush(key, mediaId);
  await redis.expire(key, config.pendingTtlSeconds); // reset the TTL on every new image

  const count = await redis.llen(key);
  console.log(`Buffered image ${mediaId} from ${from} (${count} so far)`);
}

// ---------------------------------------------------------------------------
// Closing text -> parse (regex, then Gemini fallback) -> insert row ->
// stamp images -> upload -> update row -> send stamped images back to phone
// ---------------------------------------------------------------------------
async function handleIncomingText(from, text) {
  console.log(`Received closing text from ${from}: ${text}`);

  const key = `pending:${from}`;
  const pendingImages = await redis.lrange(key, 0, -1);

  if (!pendingImages || pendingImages.length === 0) {
    console.log(`No buffered images for ${from} — text arrived with nothing to attach it to.`);
    await whatsapp.sendText(
      from,
      `⚠️ Your last message wasn't saved — no images were received yet for it.\n\nPlease forward the images *first*, then send the description/price text again.`
    );
    return;
  }

  const { price, description, source } = await parseProductDetails(text);

  if (price === null) {
    console.log('Could not determine a price for this product even with the Gemini fallback — saving as needs_review.');
  }

  // 1. Insert the row first so we get an auto-generated product_code back.
  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert({ description, price, parse_source: source, image_urls: [], sender: from })
    .select('id, product_code')
    .single();

  if (insertError) {
    console.error('Failed to insert product row:', insertError.message);
    return;
  }

  const productCode = inserted.product_code;
  console.log(`Finalizing product #${productCode} — price: ${price} (source: ${source}), images: ${pendingImages.length}`);

  // 2. Download, stamp, and upload each image using the product_code.
  const imageUrls = [];
  for (let i = 0; i < pendingImages.length; i++) {
    const raw = await whatsapp.downloadMedia(pendingImages[i]);
    const { buffer } = await stampImage(raw, productCode);

    const objectKey = `products/${productCode}/image_${i + 1}.jpg`;
    await uploadToR2(buffer, objectKey, 'image/jpeg');
    imageUrls.push(publicUrlFor(objectKey));
  }

  // 3. Update the row with the final image URLs.
  const { error: updateError } = await supabase
    .from('products')
    .update({ image_urls: imageUrls })
    .eq('id', inserted.id);

  if (updateError) {
    console.error('Failed to update image_urls:', updateError.message);
  } else {
    console.log(`Product #${productCode} saved with images:`, imageUrls);
  }

  // Clear the buffer now that this product is fully closed out.
  await redis.del(key);

  // 4. Send the stamped images back so they land in the phone's gallery,
  //    ready to select straight into WhatsApp Status.
  const priceLabel = price !== null ? `Rs ${price}` : 'price needs review';
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const caption = i === 0 ? `#${productCode} — ${priceLabel}` : undefined;
      await whatsapp.sendImage(from, imageUrls[i], caption);
    } catch (err) {
      console.error(`Failed to send stamped image ${i + 1} back for #${productCode}:`, err.response?.data || err.message);
    }
  }

  await whatsapp.sendText(from, `Saved product #${productCode} — ${priceLabel} — ${imageUrls.length} images.`);
}

module.exports = { handleIncomingImage, handleIncomingText };
