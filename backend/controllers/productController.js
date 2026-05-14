import asyncHandler from '../utils/asyncHandler.js';
import Product from '../models/productModel.js';
import Category from '../models/categoryModel.js';
import { calculateFinalPrice, resolveItemDiscount } from '../utils/discounts.js';

const attachDiscountInfo = (p) => {
  const categoryDiscount = p.category?.categoryDiscount ?? 0;
  const basePrice = p.pricingOptions && p.pricingOptions.length > 0 ? p.pricingOptions[0].price : 0;
  const resolved = resolveItemDiscount({
    price: basePrice,
    productDiscount: p.discount,
    categoryDiscount,
  });
  const pricing = calculateFinalPrice(basePrice, resolved.percent);
  return {
    ...p.toObject({ virtuals: true }),
    discountInfo: {
      source: resolved.source,
      percent: pricing.discountPercent,
      originalPrice: pricing.originalPrice,
      finalPrice: pricing.finalPrice,
      discountAmount: pricing.discountAmount,
    },
  };
};

const getProducts = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || Number(req.query.pageSize) || 20;
  const page = Number(req.query.page) || Number(req.query.pageNumber) || 1;
  const keyword = req.query.keyword;

  const keywordFilter = keyword
    ? {
        name: {
          $regex: keyword,
          $options: 'i',
        },
      }
    : {};

  const categoryFilter = req.query.category ? { category: req.query.category } : {};

  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : 999999;
  const priceFilter = { 'pricingOptions.price': { $gte: minPrice, $lte: maxPrice } };
  
  const vendorFilter = req.query.vendor ? { vendor: req.query.vendor } : {};

  const query = { ...keywordFilter, ...categoryFilter, ...priceFilter, ...vendorFilter, isActive: true };

  const count = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name categoryDiscount')
    .populate('vendor', 'name email vendorDetails.storeName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(limit * (page - 1));

  res.json({
    products: products.map(attachDiscountInfo),
    page,
    pages: Math.ceil(count / limit),
    count,
  });
});

const getRecommendations = asyncHandler(async (req, res) => {
  const products = await Product.aggregate([{ $match: { rating: { $gte: 4 }, isActive: true } }, { $sample: { size: 4 } }]);
  const populated = await Product.populate(products, { path: 'category', select: 'name categoryDiscount' });
  // populated docs are plain objects here
  const withDiscounts = populated.map((p) => {
    const categoryDiscount = p.category?.categoryDiscount ?? 0;
    const basePrice = p.pricingOptions && p.pricingOptions.length > 0 ? p.pricingOptions[0].price : 0;
    const resolved = resolveItemDiscount({
      price: basePrice,
      productDiscount: p.discount,
      categoryDiscount,
    });
    const pricing = calculateFinalPrice(basePrice, resolved.percent);
    return {
      ...p,
      discountInfo: {
        source: resolved.source,
        percent: pricing.discountPercent,
        originalPrice: pricing.originalPrice,
        finalPrice: pricing.finalPrice,
        discountAmount: pricing.discountAmount,
      },
    };
  });
  res.json(withDiscounts);
});

const getTopProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true })
    .sort({ sold: -1 })
    .limit(4)
    .populate('category', 'name categoryDiscount');
  res.json(products.map(attachDiscountInfo));
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name categoryDiscount')
    .populate('vendor', 'name email vendorDetails');
  if (product) {
    res.json(attachDiscountInfo(product));
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, pricingOptions, image, brand, category, description, discount } = req.body;

  let categoryId = category;
  if (!categoryId || categoryId.length !== 24) {
    const defaultCat = await Category.findOne({});
    categoryId = defaultCat ? defaultCat._id : null;
  }

  const product = new Product({
    name: name || 'Sample name',
    pricingOptions: pricingOptions || [{ weight: '1 pc', price: 0, countInStock: 0 }],
    discount: discount || 0,
    vendor: req.user._id,
    image: image || '/images/sample.jpg',
    brand: brand || 'Sample brand',
    category: categoryId,
    numReviews: 0,
    description: description || 'Sample description',
    tags: []
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

const updateProduct = asyncHandler(async (req, res) => {
  const { name, pricingOptions, description, image, brand, category, tags, discount, countInStock } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
       res.status(403);
       throw new Error('Not authorized to update this product');
    }
    product.name = name || product.name;
    if (pricingOptions !== undefined) {
      product.pricingOptions = pricingOptions;
    } else if (countInStock !== undefined && product.pricingOptions?.length > 0) {
      product.pricingOptions = product.pricingOptions.map((option, index) => (
        index === 0 ? { ...option.toObject(), countInStock: Number(countInStock) } : option
      ));
    }
    if (discount !== undefined) product.discount = discount;
    product.description = description || product.description;
    product.image = image || product.image;
    product.brand = brand || product.brand;
    product.category = category || product.category;
    if (tags) product.tags = tags;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
       res.status(403);
       throw new Error('Not authorized to delete this product');
    }
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

const createProductReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      alreadyReviewed.rating = Number(rating);
      if (comment !== undefined) alreadyReviewed.comment = comment;
      product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;
      await product.save();
      return res.status(200).json({ message: 'Review updated', rating: product.rating, numReviews: product.numReviews });
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment: comment || '',
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added', rating: product.rating, numReviews: product.numReviews });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  getTopProducts,
  getRecommendations,
};
