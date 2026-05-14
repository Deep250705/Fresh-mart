import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/productModel.js';
import '../models/categoryModel.js';

dotenv.config();

const LABELS_BY_PRODUCT = {
  'Cheese - Slices': ['1 pack (4 pieces)', '2 pack (8 pieces)'],
  'Bread - White': ['1 pack (12 slices)', '2 pack (24 slices)'],
  'Bread - Brown': ['1 pack (12 slices)', '2 pack (24 slices)'],
  'Bread - Multigrain': ['1 pack (12 slices)', '2 pack (24 slices)'],
  'Buns': ['1 pack (6 pieces)', '2 pack (12 pieces)'],
  'Muffins': ['1 pack (4 pieces)', '2 pack (8 pieces)'],
  'Cookies': ['1 pack (10 pieces)', '2 pack (20 pieces)'],
  'Croissants': ['1 pack (4 pieces)', '2 pack (8 pieces)'],
  'Khari': ['1 pack (12 pieces)', '2 pack (24 pieces)'],
  'Biscuits - Sweet': ['1 pack (12 pieces)', '2 pack (24 pieces)'],
  'Biscuits - Salted': ['1 pack (12 pieces)', '2 pack (24 pieces)'],
  'Toast / Rusk': ['1 pack (20 pieces)', '2 pack (40 pieces)'],
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  let updatedCount = 0;

  for (const [name, labels] of Object.entries(LABELS_BY_PRODUCT)) {
    const product = await Product.findOne({ name });
    if (!product || !Array.isArray(product.pricingOptions) || product.pricingOptions.length !== labels.length) {
      continue;
    }

    const currentLabels = product.pricingOptions.map((option) => option.weight);
    const needsUpdate = currentLabels.some((label, index) => label !== labels[index]);
    if (!needsUpdate) {
      continue;
    }

    product.pricingOptions = product.pricingOptions.map((option, index) => ({
      ...option.toObject(),
      weight: labels[index],
    }));

    await product.save();
    updatedCount += 1;
    console.log(`${name}: ${currentLabels.join(', ')} -> ${labels.join(', ')}`);
  }

  console.log(`Updated ${updatedCount} products.`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
