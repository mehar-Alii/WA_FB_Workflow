(function () {
  'use strict';

  // Same-origin by default (see config.js).
  const API_BASE = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
  const KEY_STORAGE = 'admin_access_key';

  let currentProduct = null;

  const $ = (id) => document.getElementById(id);

  // ---- Access key handling (admin API is protected) ----
  function getKey() {
    try { return localStorage.getItem(KEY_STORAGE) || ''; } catch (_) { return ''; }
  }
  function setKey(value) {
    try { localStorage.setItem(KEY_STORAGE, value); } catch (_) { /* private mode: key lives only for this page */ }
  }
  // Removes supplier price lines so only the selling price we add is ever shown/shared
  function cleanDescription(text) {
    return (text || '')
      .split('\n')
      .filter(line => !/(price|sale\s*rate|\brate\b|\brs\.?\s*\d|\bpkr\b|\d+\s*\/-)/i.test(line))
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  async function apiFetch(path) {
    const key = getKey();
    const res = await fetch(`${API_BASE}${path}`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    });
    if (res.status === 401 || res.status === 503) {
      if (res.status === 401) $('authBox').classList.remove('hidden');
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || 'Access key required');
    }
    return res;
  }

  $('saveKeyBtn').addEventListener('click', () => {
    const value = $('adminKey').value.trim();
    if (!value) return;
    setKey(value);
    $('adminKey').value = '';
    $('authBox').classList.add('hidden');
    if ($('codeInput').value.trim()) searchProduct();
  });

  $('searchBtn').addEventListener('click', searchProduct);
  $('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') searchProduct(); });
  $('shareBtn').addEventListener('click', shareToCustomer);

  async function searchProduct() {
    const code = $('codeInput').value.trim();
    if (!code) return;

    $('status').textContent = 'Searching…';
    $('status').className = 'status';
    $('result').classList.add('hidden');

    try {
      const res = await apiFetch(`/api/products/${encodeURIComponent(code)}`);
      if (!res.ok) throw new Error('Product not found');
      const product = await res.json();
      currentProduct = product;
      renderProduct(product);
      $('status').textContent = '';
    } catch (err) {
      $('status').textContent = '❌ ' + err.message;
      $('status').className = 'status error';
    }
  }

  function renderProduct(p) {
    const grid = $('imgsGrid');
    grid.innerHTML = '';
    (p.image_urls || []).forEach((url, i) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Product ${p.product_code} photo ${i + 1}`;
      img.loading = 'lazy';
      grid.appendChild(img);
    });
    $('descText').textContent = cleanDescription(p.description);
    $('descText').textContent = p.description || '';
    $('costPrice').textContent = p.price != null ? `Rs ${p.price}` : '—';
    $('sellingPrice').value = p.selling_price != null ? p.selling_price : '';
    $('shareStatus').textContent = '';
    $('result').classList.remove('hidden');
  }

  async function shareToCustomer() {
    if (!currentProduct) return;
    const sellingPrice = $('sellingPrice').value;
    if (!sellingPrice) {
      $('shareStatus').textContent = '❌ Enter a selling price first.';
      $('shareStatus').className = 'status error';
      return;
    }

    $('shareBtn').disabled = true;
    $('shareStatus').textContent = 'Preparing images…';
    $('shareStatus').className = 'status';

    try {
      // Fetch each image as a File for sharing (cost price never enters this — only description + selling price)
      const files = [];
      for (let i = 0; i < (currentProduct.image_urls || []).length; i++) {
        const url = currentProduct.image_urls[i];
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'share=1', { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load image ' + (i + 1));
        const blob = await res.blob();
        files.push(new File([blob], `product_${currentProduct.product_code}_${i + 1}.jpg`, { type: 'image/jpeg' }));
      }

      const shareText = `${cleanDescription(currentProduct.description)}\n\nPrice: Rs ${sellingPrice}`;

      // Trigger the native share sheet
      if (navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({ files, text: shareText });
        $('shareStatus').textContent = '✅ Shared!';
        $('shareStatus').className = 'status success';
      } else if (navigator.share) {
        // Fallback: some browsers can't share files, only text
        await navigator.share({ text: shareText });
        $('shareStatus').textContent = '⚠️ Text shared — attach images manually (file sharing not supported here).';
        $('shareStatus').className = 'status error';
      } else {
        $('shareStatus').textContent = '❌ Sharing not supported on this browser. Try Chrome on Android.';
        $('shareStatus').className = 'status error';
      }
    } catch (err) {
      if (err.name !== 'AbortError') { // user cancelling the share sheet isn't an error
        $('shareStatus').textContent = '❌ ' + err.message;
        $('shareStatus').className = 'status error';
      }
    } finally {
      $('shareBtn').disabled = false;
    }
  }
})();
