import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Product from '../models/productModel.js';
import '../models/categoryModel.js';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const READY_TO_DRINK_KEYWORDS = [
  'juice',
  'milkshake',
  'smoothie',
  'drink',
  'water',
  'milk',
];

const DRY_BEVERAGE_KEYWORDS = [
  'tea',
  'coffee',
  'health mix',
];

const PACK_BAKERY_KEYWORDS = [
  'biscuits',
  'cookies',
  'croissants',
  'khari',
  'toast',
  'rusk',
  'muffins',
  'bread',
  'buns',
];

const WEIGHT_DAIRY_KEYWORDS = [
  'paneer',
  'cheese',
  'butter',
];

const VOLUME_DAIRY_KEYWORDS = [
  'milk',
  'buttermilk',
  'lassi',
  'cream',
  'ghee',
];

const GRAINS_SMALL_PACK_KEYWORDS = [
  'noodles',
  'oats',
  'pasta',
  'poha',
  'vermicelli',
  'seviyan',
];

const OIL_KEYWORDS = ['oil'];

const includesAny = (value, keywords) =>
  keywords.some((keyword) => value.includes(keyword));

const getTargetWeights = (categoryName, productName, optionCount) => {
  const name = productName.toLowerCase();

  if (categoryName === 'Beverages & Drinks') {
    if (includesAny(name, DRY_BEVERAGE_KEYWORDS) && !includesAny(name, READY_TO_DRINK_KEYWORDS)) {
      return optionCount === 3 ? ['100g', '250g', '500g'] : ['250g', '500g'];
    }

    return optionCount === 3 ? ['250ml', '500ml', '1L'] : ['500ml', '1L'];
  }

  if (categoryName === 'Dairy & Bakery') {
    if (includesAny(name, PACK_BAKERY_KEYWORDS)) {
      return optionCount === 3 ? ['1 pack', '2 pack', '4 pack'] : ['1 pack', '2 pack'];
    }

    if (includesAny(name, VOLUME_DAIRY_KEYWORDS)) {
      return optionCount === 3 ? ['200ml', '500ml', '1L'] : ['500ml', '1L'];
    }

    if (name.includes('curd')) {
      return optionCount === 3 ? ['200g', '500g', '1kg'] : ['200g', '500g'];
    }

    if (includesAny(name, WEIGHT_DAIRY_KEYWORDS)) {
      return optionCount === 3 ? ['200g', '500g', '1kg'] : ['200g', '500g'];
    }
  }

  if (categoryName === 'Grains & Staples') {
    if (includesAny(name, OIL_KEYWORDS)) {
      return optionCount === 3 ? ['500ml', '1L', '5L'] : ['500ml', '1L'];
    }

    if (includesAny(name, GRAINS_SMALL_PACK_KEYWORDS)) {
      return optionCount === 3 ? ['200g', '500g', '1kg'] : ['200g', '500g'];
    }

    return optionCount === 3 ? ['500g', '1kg', '5kg'] : ['500g', '1kg'];
  }

  if (categoryName === 'Fruits & Vegetables') {
    return optionCount === 3 ? ['250g', '500g', '1kg'] : ['500g', '1kg'];
  }

  if (categoryName === 'Spices & Herbs') {
    return optionCount === 3 ? ['50g', '100g', '250g'] : ['100g', '250g'];
  }

  return null;
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const products = await Product.find({})
    .populate('category', 'name')
    .select('name pricingOptions category');

  let updatedCount = 0;

  for (const product of products) {
    const optionCount = product.pricingOptions?.length || 0;
    if (!optionCount) continue;

    const targetWeights = getTargetWeights(product.category?.name, product.name, optionCount);
    if (!targetWeights || targetWeights.length !== optionCount) continue;

    const currentWeights = product.pricingOptions.map((option) => option.weight);
    const needsUpdate = currentWeights.some((weight, index) => weight !== targetWeights[index]);
    if (!needsUpdate) continue;

    product.pricingOptions = product.pricingOptions.map((option, index) => ({
      ...option.toObject(),
      weight: targetWeights[index],
    }));

    await product.save();
    updatedCount += 1;
    console.log(`${product.name}: ${currentWeights.join(', ')} -> ${targetWeights.join(', ')}`);
  }

  console.log(`Updated ${updatedCount} products.`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
