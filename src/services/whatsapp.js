'use strict';

const axios = require('axios');
const config = require('../config');

const GRAPH_URL = `https://graph.facebook.com/${config.apiVersion}`;
const MESSAGES_URL = `${GRAPH_URL}/${config.phoneNumberId}/messages`;
const AUTH_HEADERS = { Authorization: `Bearer ${config.whatsappToken}` };

// Timeouts keep a slow Meta response from eating the whole function budget.
const http = axios.create({ timeout: 25_000 });

async function downloadMedia(mediaId) {
  const meta = await http.get(`${GRAPH_URL}/${mediaId}`, { headers: AUTH_HEADERS });
  const image = await http.get(meta.data.url, {
    headers: AUTH_HEADERS,
    responseType: 'arraybuffer',
  });
  return Buffer.from(image.data);
}

async function sendText(to, body) {
  await http.post(
    MESSAGES_URL,
    { messaging_product: 'whatsapp', to, type: 'text', text: { body } },
    { headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' } }
  );
}

async function sendImage(to, link, caption) {
  await http.post(
    MESSAGES_URL,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'image',
      image: caption ? { link, caption } : { link },
    },
    { headers: { ...AUTH_HEADERS, 'Content-Type': 'application/json' } }
  );
}

module.exports = { downloadMedia, sendText, sendImage };
