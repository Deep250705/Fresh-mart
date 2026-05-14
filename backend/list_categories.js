import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const categorySchema = mongoose.Schema({ name: String }, { strict: false });
const Category = mongoose.model('Category', categorySchema);

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mart');
    const categories = await Category.find();
    console.log("Categories:", categories.map(c => c.name));
    process.exit(0);
};

run().catch(console.error);
