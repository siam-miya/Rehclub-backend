
import mongoose from "mongoose";
import Category from "./category.model.js";

// Get all active categories
export const getAllCategories = async () => {
  return Category.find({ isActive: true })
    .select(
      "name slug parent path pathKey level description image sortOrder"
    )
    .sort({ sortOrder: 1, name: 1 })
    .lean();
};

// Get category by full path
export const getCategoryByPath = async (path) => {
  const pathParts = Array.isArray(path) ? path : path.split("/");

  const normalizedPath = pathParts
    .filter(Boolean)
    .map((item) => item.toLowerCase().trim());

  if (!normalizedPath.length) {
    const error = new Error("Category path is required");
    error.statusCode = 400;
    throw error;
  }

  return Category.findOne({
    path: normalizedPath,
    isActive: true,
  }).lean();
};

// Create category
export const createCategory = async (data) => {
  const {
    name,
    slug,
    parent,
    description,
    image,
    sortOrder,
  } = data;

  const normalizedSlug = slug.toLowerCase().trim();

  let parentCategory = null;

  // Validate parent category
  if (parent) {
    if (!mongoose.isValidObjectId(parent)) {
      const error = new Error("Invalid parent category ID");
      error.statusCode = 400;
      throw error;
    }

    parentCategory = await Category.findOne({
      _id: parent,
      isActive: true,
    }).lean();

    if (!parentCategory) {
      const error = new Error("Parent category not found");
      error.statusCode = 404;
      throw error;
    }
  }

  // Generate category path
  const parentPath = parentCategory?.path || [];

  const categoryPath = [
    ...parentPath,
    normalizedSlug,
  ];

  // Generate unique full path
  const pathKey = categoryPath.join("/");

  // Check duplicate category
  // This also checks old documents that don't have pathKey yet.
  const existingCategory = await Category.findOne({
    path: categoryPath,
  });

  if (existingCategory) {
    const error = new Error("Category already exists");
    error.statusCode = 409;
    throw error;
  }

  // Create category
  try {
    return await Category.create({
      name,
      slug: normalizedSlug,
      parent: parentCategory?._id || null,
      path: categoryPath,
      pathKey,
      level: categoryPath.length - 1,
      description,
      image,
      sortOrder,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error("Category already exists");
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

// Update category
export const updateCategory = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const category = await Category.findById(id);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  const {
    name,
    description,
    image,
    sortOrder,
  } = data;

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (image !== undefined) category.image = image;
  if (sortOrder !== undefined) category.sortOrder = sortOrder;

  // Backfill pathKey for existing categories
  if (!category.pathKey) {
    category.pathKey = category.path.join("/");
  }

  return category.save();
};

// Soft delete category
export const deleteCategory = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const category = await Category.findById(id);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  // Check active child categories
  const childExists = await Category.exists({
    parent: id,
    isActive: true,
  });

  if (childExists) {
    const error = new Error(
      "Delete child categories before deleting this category"
    );

    error.statusCode = 409;
    throw error;
  }

  category.isActive = false;

  // Backfill pathKey for existing categories
  if (!category.pathKey) {
    category.pathKey = category.path.join("/");
  }

  await category.save();

  return category;
};
