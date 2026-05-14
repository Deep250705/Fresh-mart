import asyncHandler from '../utils/asyncHandler.js';
import Category from '../models/categoryModel.js';

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({});
  res.status(200).json(categories);
});

const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (category) {
    res.json(category);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, image, description, categoryDiscount } = req.body;
  const categoryExists = await Category.findOne({ name });
  if (categoryExists) {
    res.status(400);
    throw new Error('Category already exists');
  }
  const category = await Category.create({ 
    name, 
    image: image || '/images/sample-category.jpg', 
    description: description || '',
    categoryDiscount: categoryDiscount || 0,
  });
  res.status(201).json(category);
});

const updateCategory = asyncHandler(async (req, res) => {
  const { name, image, description, categoryDiscount } = req.body;
  const category = await Category.findById(req.params.id);

  if (category) {
    category.name = name || category.name;
    category.image = image || category.image;
    category.description = description !== undefined ? description : category.description;
    if (categoryDiscount !== undefined) category.categoryDiscount = categoryDiscount;
    
    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (category) {
    await category.deleteOne();
    res.json({ message: 'Category removed' });
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
});

export { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory };
