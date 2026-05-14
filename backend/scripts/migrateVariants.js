import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';

import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') }); 

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/greenleaf');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const runMigration = async () => {
  await connectDB();

  console.log('Fetching products and categories...');
  const categories = await Category.find();
  const categoryMap = new Map();
  categories.forEach(c => categoryMap.set(c._id.toString(), c.name));

  // Find all products by bypassing standard schema validations, using raw collection to access 'price' and 'unit'
  const db = mongoose.connection.db;
  const products = await db.collection('products').find({}).toArray();
  console.log(`Total products to process: ${products.length}`);

  let modifiedCount = 0;

  for (const p of products) {
    // If it already has pricingOptions, skip.
    if (p.pricingOptions && p.pricingOptions.length > 0) {
      console.log(`Skipping ${p.name} - already has pricingOptions`);
      continue;
    }

    // Convert existing price and stock to our multipliers base
    const basePrice = p.price || 0;
    const baseStock = p.countInStock || 0;
    const categoryName = categoryMap.get(p.category?.toString() || '');
    
    let pricingOptions = [];

    if (categoryName === 'Fruits & Vegetables') {
      pricingOptions = [
        { weight: '250g', price: Math.round(basePrice * 0.25), countInStock: baseStock },
        { weight: '500g', price: Math.round(basePrice * 0.5), countInStock: baseStock },
        { weight: '1kg', price: basePrice, countInStock: baseStock }
      ];
    } else if (categoryName === 'Dairy & Bakery') {
      // Very basic heuristic based on name
      const nameLower = p.name.toLowerCase();
      if (nameLower.includes('bread') || nameLower.includes('bun') || nameLower.includes('cake') || nameLower.includes('pack')) {
        pricingOptions = [
          { weight: '1 pack', price: basePrice, countInStock: baseStock },
          { weight: '2 pack', price: Math.round(basePrice * 1.9), countInStock: baseStock }
        ];
      } else {
        pricingOptions = [
          { weight: '500ml', price: Math.round(basePrice * 0.5), countInStock: baseStock },
          { weight: '1L', price: basePrice, countInStock: baseStock }
        ];
      }
    } else if (categoryName === 'Spices & Herbs') {
      pricingOptions = [
        { weight: '50g', price: Math.round(basePrice * 0.5), countInStock: baseStock },
        { weight: '100g', price: basePrice, countInStock: baseStock },
        { weight: '250g', price: Math.round(basePrice * 2.4), countInStock: baseStock }
      ];
    } else if (categoryName === 'Grains & Staples') {
      pricingOptions = [
        { weight: '500g', price: Math.round(basePrice * 0.5), countInStock: baseStock },
        { weight: '1kg', price: basePrice, countInStock: baseStock },
        { weight: '5kg', price: Math.round(basePrice * 4.8), countInStock: baseStock }
      ];
    } else if (categoryName === 'Beverages & Drinks') {
      pricingOptions = [
        { weight: '250ml', price: Math.round(basePrice * 0.25), countInStock: baseStock },
        { weight: '500ml', price: Math.round(basePrice * 0.5), countInStock: baseStock },
        { weight: '1L', price: Math.round(basePrice * 0.95), countInStock: baseStock }
      ];
    } else {
      // Fallback
      pricingOptions = [
        { weight: p.unit || '1 pc', price: basePrice, countInStock: baseStock }
      ];
    }

    await db.collection('products').updateOne(
      { _id: p._id },
      { 
        $set: { pricingOptions },
        $unset: { price: "", unit: "", variants: "", countInStock: "" }
      }
    );

    console.log(`Updated ${p.name} with ${pricingOptions.length} pricingOptions.`);
    modifiedCount++;
  }

  console.log(`Migration Complete. Updated ${modifiedCount} products.`);
  process.exit(0);
};

runMigration();
