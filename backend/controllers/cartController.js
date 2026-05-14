import asyncHandler from '../utils/asyncHandler.js';
import Product from '../models/productModel.js';
import { calculateFinalPrice, getCartDiscount, resolveItemDiscount } from '../utils/discounts.js';

/**
 * POST /api/cart/calculate
 * Body: { items: [{ productId, qty }] }
 *
 * Priority:
 * 1) Product-level discount
 * 2) Category-level discount
 * 3) Cart-level discount
 *
 * No stacking (cart discount applies to subtotal AFTER item-level discounts).
 */
export const calculateCart = asyncHandler(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];

  if (items.length === 0) {
    return res.json({
      items: [],
      subtotal: 0,
      itemDiscountTotal: 0,
      cartDiscountPercent: 0,
      cartDiscountAmount: 0,
      totalDiscount: 0,
      total: 0,
    });
  }

  const ids = items.map((i) => i.productId).filter(Boolean);
  const products = await Product.find({ _id: { $in: ids }, isActive: true }).populate(
    'category',
    'name categoryDiscount'
  );

  const productById = new Map(products.map((p) => [p._id.toString(), p]));

  const computedItems = items
    .map((i) => {
      const p = productById.get(String(i.productId));
      if (!p) return null;
      
      const qty = Math.max(1, Number(i.qty) || 1);
      
      // Handle Variant Override
      let basePrice = p.pricingOptions && p.pricingOptions.length > 0 ? p.pricingOptions[0].price : 0;
      let matchedUnit = p.pricingOptions && p.pricingOptions.length > 0 ? p.pricingOptions[0].weight : 'pc';
      let matchedStock = p.pricingOptions && p.pricingOptions.length > 0 ? p.pricingOptions[0].countInStock : 0;
      if (i.weight && p.pricingOptions && p.pricingOptions.length > 0) {
         const matchedVariant = p.pricingOptions.find(v => v.weight === i.weight);
         if (matchedVariant) {
            basePrice = matchedVariant.price;
            matchedUnit = matchedVariant.weight;
            matchedStock = matchedVariant.countInStock;
         }
      }

      const categoryDiscount = p.category?.categoryDiscount ?? 0;
      const resolved = resolveItemDiscount({
        price: basePrice,
        productDiscount: p.discount,
        categoryDiscount,
      });

      const pricing = calculateFinalPrice(basePrice, resolved.percent);
      const lineOriginal = +(pricing.originalPrice * qty).toFixed(2);
      const lineFinal = +(pricing.finalPrice * qty).toFixed(2);
      const lineDiscount = +(lineOriginal - lineFinal).toFixed(2);

      return {
        productId: p._id,
        weight: i.weight || null,
        name: p.name,
        image: p.image,
        unit: matchedUnit,
        countInStock: matchedStock,
        qty,
        unitPrice: pricing.originalPrice,
        finalUnitPrice: pricing.finalPrice,
        discount: {
          source: resolved.source,
          percent: pricing.discountPercent,
        },
        lineOriginal,
        lineFinal,
        lineDiscount,
      };
    })
    .filter(Boolean);

  const subtotal = +computedItems.reduce((acc, it) => acc + it.lineOriginal, 0).toFixed(2);
  const afterItemDiscount = +computedItems.reduce((acc, it) => acc + it.lineFinal, 0).toFixed(2);
  const itemDiscountTotal = +(subtotal - afterItemDiscount).toFixed(2);

  const cartDiscountPercent = getCartDiscount(afterItemDiscount);
  const cartDiscountAmount = +((afterItemDiscount * cartDiscountPercent) / 100).toFixed(2);

  const total = +(afterItemDiscount - cartDiscountAmount).toFixed(2);
  const totalDiscount = +(itemDiscountTotal + cartDiscountAmount).toFixed(2);

  res.json({
    items: computedItems,
    subtotal,
    itemDiscountTotal,
    cartDiscountPercent,
    cartDiscountAmount,
    totalDiscount,
    total,
    savedMessage: `You saved ₹${totalDiscount.toFixed(2)}`,
  });
});

