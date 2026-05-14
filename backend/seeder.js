import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import Product from './models/productModel.js';
import Category from './models/categoryModel.js';
import Order from './models/orderModel.js';

dotenv.config();
connectDB();

const importData = async () => {
  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await User.deleteMany();

    console.log('Existing Data Destroyed...');

    const users = [
      {
        name: 'Admin User',
        email: 'admin@freshmart.com',
        password: 'password123',
        role: 'admin',
        isActive: true
      },
      {
        name: 'John Vendor',
        email: 'vendor@freshmart.com',
        password: 'password123',
        role: 'vendor',
        isActive: true,
        vendorDetails: {
           storeName: "John's Organic Farm",
           description: "Fresh local organic produce directly from the farm.",
           isApproved: true
        }
      },
      {
        name: 'Jane Customer',
        email: 'user@freshmart.com',
        password: 'password123',
        role: 'user',
        isActive: true
      }
    ];

    const createdUsers = [];
    for (const u of users) {
       createdUsers.push(await User.create(u));
    }

    const vendorUser = createdUsers[1]._id;

    console.log('Dummy Users Inserted...');

    const categories = await Category.insertMany([
      { name: 'Fruits & Vegetables', image: 'https://images.unsplash.com/photo-1610348725531-843dff563e2c' },
      { name: 'Dairy & Bakery', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da' },
      { name: 'Snacks & Beverages', image: 'https://images.unsplash.com/photo-1599596207851-bcce332f1ed2' }
    ]);

    console.log('Dummy Categories Inserted...');

    const products = [
      {
        name: 'Organic Bananas (1 Dozen)',
        image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224',
        description: 'Fresh organic yellow bananas directly from the supplier.',
        brand: 'FreshMart Organics',
        category: categories[0]._id,
        price: 80,
        countInStock: 50,
        rating: 4.5,
        numReviews: 12,
        vendor: vendorUser
      },
      {
        name: 'Farm Fresh Milk (1L)',
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150',
        description: 'Pure, unadulterated whole cow milk.',
        brand: 'Dairy Best',
        category: categories[1]._id,
        price: 65,
        countInStock: 200,
        rating: 4.8,
        numReviews: 45,
        vendor: vendorUser
      },
      {
        name: 'Whole Wheat Bread',
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
        description: '100% Whole wheat freshly baked bread. 400g.',
        brand: 'Bakery Co',
        category: categories[1]._id,
        price: 45,
        countInStock: 30,
        rating: 4.2,
        numReviews: 10,
        vendor: vendorUser
      },
      {
        name: 'Potato Chips - Salted',
        image: 'https://images.unsplash.com/photo-1566478989037-e62a225de08e',
        description: 'Crispy, thinly sliced and perfectly salted potato chips.',
        brand: 'Crunchy Bites',
        category: categories[2]._id,
        price: 20,
        countInStock: 150,
        rating: 4.0,
        numReviews: 5,
        vendor: vendorUser
      }
    ];

    await Product.insertMany(products);
    console.log('Dummy Products Inserted...');
    console.log('✅ DATA IMPORT SUCCESSFUL!');
    process.exit();
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await Order.deleteMany();
    await Product.deleteMany();
    await Category.deleteMany();
    await User.deleteMany();

    console.log('✅ DATA DESTROYED!');
    process.exit();
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
