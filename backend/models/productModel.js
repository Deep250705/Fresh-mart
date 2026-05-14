import mongoose from 'mongoose';

const reviewSchema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: false, default: '' },
  },
  { timestamps: true }
);

const productSchema = mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true },
    image: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Category' },
    description: { type: String, required: true },
    tags: [String],
    rating: { type: Number, required: true, default: 0 },
    numReviews: { type: Number, required: true, default: 0 },
    commissionRate: { type: Number, default: null, min: 0, max: 1 },
    // Optional product-level discount percentage (0-100). If set, it overrides computed pricing-strategy discount.
    discount: { type: Number, default: 0, min: 0, max: 100 },
    pricingOptions: [
      {
        weight: { type: String, required: true },
        price: { type: Number, required: true },
        costPrice: { type: Number, required: true, default: 0 },
        countInStock: { type: Number, required: true, default: 0 }
      }
    ],
    reviews: [reviewSchema],
    isActive: { type: Boolean, default: true },
    sold: { type: Number, default: 0 }
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ vendor: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ sold: -1 });

const Product = mongoose.model('Product', productSchema);
export default Product;
