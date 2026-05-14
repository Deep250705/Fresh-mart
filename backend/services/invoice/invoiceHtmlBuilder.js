import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  escapeHtml,
  formatMoney,
  formatInvoiceDate,
  getPaymentBadge,
  formatOrderId,
} from './invoiceFormat.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const invoiceCss = readFileSync(join(__dirname, 'invoice.css'), 'utf8');

function freshMartLogoSvg() {
  return `<svg class="brand-mark" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="fmG" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#22c55e"/>
      <stop offset="100%" style="stop-color:#15803d"/>
    </linearGradient>
  </defs>
  <rect width="48" height="48" rx="12" fill="url(#fmG)"/>
  <path fill="#ecfdf5" d="M24 10c-2 4-6 7-10 8 2 5 2 10 0 15 4-1 8-4 10-8 2 4 6 7 10 8-2-5-2-10 0-15-4-1-8-4-10-8z"/>
  <circle cx="24" cy="24" r="3" fill="#fff" opacity=".95"/>
</svg>`;
}

function productSubtitle(item) {
  const parts = [];
  if (item.unit) parts.push(String(item.unit));
  if (item.weight && String(item.weight) !== String(item.unit)) parts.push(String(item.weight));
  return parts.filter(Boolean).join(' · ');
}

function buildProductRows(orderItems) {
  return (orderItems || [])
    .map((item) => {
      const qty = Number(item.qty) || 0;
      const unit = Number(item.price) || 0;
      const lineTotal = +(qty * unit).toFixed(2);
      const sub = productSubtitle(item);
      const subHtml = sub
        ? `<div class="product-sub">${escapeHtml(sub)}</div>`
        : '';
      return `<tr>
        <td>
          <div class="product-title">${escapeHtml(item.name || 'Product')}</div>
          ${subHtml}
        </td>
        <td>${escapeHtml(qty)}</td>
        <td>${escapeHtml(formatMoney(unit))}</td>
        <td>${escapeHtml(formatMoney(lineTotal))}</td>
      </tr>`;
    })
    .join('');
}

/**
 * Optional order-level discount for display (schema does not define it today).
 * When absent or zero, the discount row is hidden — no calculation changes.
 */
function getOrderDiscountDisplay(order) {
  const raw = order?.discountTotal ?? order?.discountPrice ?? order?.discount;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function buildShippingFeeDisplay(order) {
  const ship = Number(order.shippingPrice) || 0;
  const del = Number(order.deliveryFee) || 0;
  return ship + del;
}

/** @param {object} order — populated user, orderItems */
export function buildInvoiceHtml(order) {
  const badge = getPaymentBadge(order);
  const customerName = escapeHtml(order.user?.name || 'Customer');
  const customerEmail = escapeHtml(order.user?.email || '—');
  const orderId = escapeHtml(formatOrderId(order));
  const invoiceDate = escapeHtml(formatInvoiceDate(order.createdAt));
  const productRows = buildProductRows(order.orderItems);
  const discountAmount = getOrderDiscountDisplay(order);
  const showDiscount = discountAmount !== null;
  const shippingCombined = buildShippingFeeDisplay(order);

  const discountRow = showDiscount
    ? `<div class="summary-line summary-line--discount">
      <span class="summary-line-label">Discount</span>
      <span class="summary-line-value">− ${escapeHtml(formatMoney(discountAmount))}</span>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${orderId}</title>
  <style>${invoiceCss}</style>
</head>
<body>
  <div class="invoice-root">
    <div class="invoice-card">
      <header class="invoice-header">
        <div class="brand-block">
          ${freshMartLogoSvg()}
          <div class="brand-text">
            <div class="brand-name">FreshMart</div>
            <div class="brand-tagline">Fresh groceries · delivered fast</div>
          </div>
        </div>
        <div class="invoice-title-wrap">
          <h1 class="invoice-title">Invoice</h1>
        </div>
      </header>

      <div class="grid-2" style="margin-top:12px;">
        <div>
          <h2 class="section-heading">Invoice information</h2>
          <div class="meta-row"><span class="meta-label">Order ID</span><span class="meta-value">${orderId}</span></div>
          <div class="meta-row"><span class="meta-label">Invoice date</span><span class="meta-value">${invoiceDate}</span></div>
          <div class="meta-row"><span class="meta-label">Payment method</span><span class="meta-value">${escapeHtml(order.paymentMethod || '—')}</span></div>
        </div>
        <div>
          <h2 class="section-heading">Customer information</h2>
          <div class="customer-name">${customerName}</div>
          <div class="meta-row"><span class="meta-label">Email</span><span class="meta-value">${customerEmail}</span></div>
        </div>
      </div>
    </div>

    <div class="invoice-card">
      <h2 class="section-heading">Order items</h2>
      <div class="products-table-wrap">
        <table class="products-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${productRows || `<tr><td colspan="4" style="text-align:center;color:#64748b;padding:16px;">No line items</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="invoice-card">
      <div class="summary-card">
        <div style="flex:1;min-width:min(100%,220px);">
          <div class="summary-head">
            <h2 class="section-heading">Payment summary</h2>
            <span class="badge ${badge.modifier}" title="Payment status">${escapeHtml(badge.label)}</span>
          </div>
        </div>
        <div class="summary-lines">
          <div class="summary-line">
            <span class="summary-line-label">Subtotal</span>
            <span class="summary-line-value">${escapeHtml(formatMoney(order.itemsPrice))}</span>
          </div>
          <div class="summary-line">
            <span class="summary-line-label">GST / Tax</span>
            <span class="summary-line-value">${escapeHtml(formatMoney(order.taxPrice))}</span>
          </div>
          <div class="summary-line">
            <span class="summary-line-label">Shipping fee</span>
            <span class="summary-line-value">${escapeHtml(formatMoney(shippingCombined))}</span>
          </div>
          ${discountRow}
          <div class="grand-total-block">
            <div class="grand-total-line">
              <span class="grand-total-label">Grand total</span>
              <span class="grand-total-value">${escapeHtml(formatMoney(order.totalPrice))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="footer-note">
      <div><strong>Thank you for shopping with FreshMart.</strong></div>
      <div>This is a computer-generated invoice.</div>
    </footer>
  </div>
</body>
</html>`;
}
