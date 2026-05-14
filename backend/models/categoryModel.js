import mongoose from 'mongoose';

const categorySchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    description: { type: String },
    // Optional category-level discount percentage (0-100)
    categoryDiscount: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

const Category = mongoose.model('Category', categorySchema);
export default Category;
