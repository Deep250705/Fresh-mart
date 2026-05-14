/**
 * Presentation-only helpers for invoice PDF (no pricing logic).
 */

const moneyFmt = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMoney(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return moneyFmt.format(0);
  return moneyFmt.format(n);
}

export function formatInvoiceDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Badge for display only — derived from existing order fields.
 * Paid: isPaid
 * Failed: paymentResult.status indicates failure (when present)
 * Pending: default unpaid
 */
export function getPaymentBadge(order) {
  if (order.isPaid) {
    return { label: 'Paid', modifier: 'badge--paid' };
  }
  const raw = (order.paymentResult?.status || '').toLowerCase();
  if (['failed', 'failure', 'canceled', 'cancelled'].includes(raw)) {
    return { label: 'Failed', modifier: 'badge--failed' };
  }
  return { label: 'Pending', modifier: 'badge--pending' };
}

export function formatOrderId(order) {
  const id = order?._id?.toString?.() || String(order?._id || '');
  return id;
}
