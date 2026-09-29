'use strict';

const express = require('express');
const { redis } = require('../clients');
const config = require('../config');
const { verifyMetaSignature } = require('../middleware/webhookSignature');
const { handleIncomingImage, handleIncomingText } = require('../services/messageHandlers');

const router = express.Router();

// 1. Webhook verification (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === config.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2. Receive messages (POST)
router.post('/', verifyMetaSignature, async (req, res) => {
  const body = req.body;
  if (!body || !body.object) return res.sendStatus(404);

  try {
    const messageObj = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (messageObj) {
      // --- Dedupe: Meta occasionally re-delivers the same event. ---
      // set(..., { nx: true }) only succeeds if the key doesn't already
      // exist, so this is safe even if two retries land at the same time.
      const isNew = await redis.set(`seen:${messageObj.id}`, '1', {
        nx: true,
        ex: config.dedupeTtlSeconds,
      });

      if (!isNew) {
        console.log(`Duplicate delivery of message ${messageObj.id} — skipping.`);
        return res.sendStatus(200);
      }

      const from = messageObj.from;

      if (messageObj.type === 'image') {
        await handleIncomingImage(from, messageObj.image.id);
      } else if (messageObj.type === 'text') {
        await handleIncomingText(from, messageObj.text.body);
      } else {
        console.log(`Ignoring unsupported message type: ${messageObj.type}`);
      }
    }
  } catch (error) {
    console.error('Error handling webhook:', error.response?.data || error.message);
  }

  // Always 200 so Meta doesn't retry/resend the same event.
  res.sendStatus(200);
});

module.exports = router;
