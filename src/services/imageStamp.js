'use strict';

const sharp = require('sharp');

const escapeXml = (value) =>
  String(value).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]));

// Adds a white stripe BELOW the photo reading "ID: <productCode>".
// Extends the canvas instead of drawing over the photo, so the product
// picture itself stays fully intact. Works on Buffers (no temp files).
async function stampImage(inputBuffer, productCode) {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const stripeHeight = Math.round(metadata.height * 0.08);

  const stripeSvg = `
        <svg width="${metadata.width}" height="${stripeHeight}">
            <rect width="100%" height="100%" fill="white"/>
            <text x="10" y="${Math.round(stripeHeight * 0.7)}"
                  font-size="${Math.round(stripeHeight * 0.6)}"
                  font-family="Arial" fill="black">ID: ${escapeXml(productCode)}</text>
        </svg>`;

  const buffer = await image
    .extend({ bottom: stripeHeight, background: { r: 255, g: 255, b: 255 } })
    .composite([{ input: Buffer.from(stripeSvg), top: metadata.height, left: 0 }])
    .jpeg({ quality: 100 })
    .toBuffer();

  return { buffer, width: metadata.width, height: metadata.height, stripeHeight };
}

module.exports = { stampImage };
