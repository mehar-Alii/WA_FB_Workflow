'use strict';

const express = require('express');
const { supabase } = require('../clients');
const { requireAdmin } = require('../middleware/adminAuth');

const router = express.Router();
router.use(requireAdmin);

// Only the columns the admin panel needs (the sender's phone number stays server-side).
const PUBLIC_COLUMNS = 'id, product_code, description, price, selling_price, image_urls, parse_source';
const CODE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

function validateCode(req, res, next) {
  if (!CODE_PATTERN.test(req.params.code)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }
  next();
}

router.get('/:code', validateCode, async (req, res) => {
  const { data, error } = await supabase
    .from('products')
    .select(PUBLIC_COLUMNS)
    .eq('product_code', req.params.code)
    .single();

  if (error) return res.status(404).json({ error: 'Product not found' });
  res.json(data);
});

router.patch('/:code', validateCode, async (req, res) => {
  const { selling_price } = req.body || {};

  const valid = selling_price === null || (typeof selling_price === 'number' && Number.isFinite(selling_price) && selling_price >= 0);
  if (!valid) {
    return res.status(400).json({ error: 'selling_price must be a non-negative number' });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ selling_price })
    .eq('product_code', req.params.code)
    .select(PUBLIC_COLUMNS)
    .single();

  if (error) {
    console.error('Failed to update selling price:', error.message);
    return res.status(400).json({ error: 'Could not update product' });
  }
  res.json(data);
});

module.exports = router;
