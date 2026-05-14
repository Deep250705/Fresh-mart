const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/**
 * Business rule:
 * - ₹100–500 → 10–20%
 * - ₹500+ → 5–15%
 *
 * Deterministic strategy (no randomness):
 * - For 100..500: linearly scales 10% → 20%
 * - For 500..2000: linearly scales 15% → 5% (and clamps at 5% beyond 2000)
 */
export function getProductDiscount(price) {
  const p = Number(price) || 0;
  if (p < 100) return 0;

  if (p <= 500) {
    const t = (p - 100) / 400; // 0..1
    return Math.round(10 + t * 10); // 10..20
  }

  // 500+ range: 15..5
  const t = clamp((p - 500) / 1500, 0, 1); // 0..1 for 500..2000
  return Math.round(15 - t * 10); // 15..5
}

/**
 * Business rule:
 * - ₹500+ → 5%
 * - ₹1000+ → 10%
 * - ₹2000+ → 15%
 */
export function getCartDiscount(cartTotal) {
  const total = Number(cartTotal) || 0;
  if (total >= 2000) return 15;
  if (total >= 1000) return 10;
  if (total >= 500) return 5;
  return 0;
}

export function calculateFinalPrice(price, discountPercent) {
  const p = Number(price) || 0;
  const d = clamp(Number(discountPercent) || 0, 0, 100);
  const finalPrice = +(p * (1 - d / 100)).toFixed(2);
  return {
    originalPrice: +p.toFixed(2),
    discountPercent: d,
    finalPrice,
    discountAmount: +(p - finalPrice).toFixed(2),
  };
}

/**
 * Priority rules (no stacking):
 * 1) product-level (explicit product.discount, else computed pricing-strategy discount)
 * 2) category-level (category.categoryDiscount)
 */
export function resolveItemDiscount({ price, productDiscount, categoryDiscount }) {
  const explicit = Number(productDiscount) || 0;
  if (explicit > 0) {
    return { source: 'product', percent: clamp(explicit, 0, 100) };
  }

  const computed = getProductDiscount(price);
  if (computed > 0) {
    return { source: 'product', percent: computed };
  }

  const cat = Number(categoryDiscount) || 0;
  if (cat > 0) {
    return { source: 'category', percent: clamp(cat, 0, 100) };
  }

  return { source: 'none', percent: 0 };
}

