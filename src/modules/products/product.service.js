
import mongoose from "mongoose";

import Product from "./product.model.js";
import Category from "../categories/category.model.js";

const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Validate category and get its path
const getCategoryData = async (categoryId) => {
  if (!mongoose.isValidObjectId(categoryId)) {
    throw createError("Invalid category ID", 400);
  }

  const category = await Category.findOne({
    _id: categoryId,
    isActive: true,
  }).lean();

  if (!category) {
    throw createError("Category not found or inactive", 404);
  }

  return category;
};

// Check old price
const validatePrice = (price, oldPrice) => {
  if (
    oldPrice !== undefined &&
    oldPrice !== null &&
    oldPrice <= price
  ) {
    throw createError(
      "Old price must be greater than current price",
      400
    );
  }
};

// Create product
export const createProduct = async (data) => {
  const category = await getCategoryData(data.category);

  validatePrice(data.price, data.oldPrice);

  const existingProduct = await Product.exists({
    slug: data.slug.toLowerCase().trim(),
  });

  if (existingProduct) {
    throw createError("Product slug already exists", 409);
  }

  try {
    return await Product.create({
      ...data,
      slug: data.slug.toLowerCase().trim(),
      category: category._id,
      categoryPath: category.path,
      categoryPathKey: category.pathKey,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw createError("Product slug already exists", 409);
    }

    throw error;
  }
};

// Get all active products
export const getAllProducts = async ({
  page = 1,
  limit = 12,
  categoryPathKey,
  search,
  sort = "newest",
} = {}) => {
  const filter = {
    status: "active",
  };

  if (categoryPathKey) {
    filter.categoryPathKey = categoryPathKey.toLowerCase().trim();
  }

  if (search) {
    filter.$text = {
      $search: search.trim(),
    };
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    priceLow: { price: 1 },
    priceHigh: { price: -1 },
    bestSelling: { salesCount: -1 },
  };

  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.min(50, Math.max(1, Number(limit) || 12));

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("-__v")
      .sort(sortOptions[sort] || sortOptions.newest)
      .skip((currentPage - 1) * perPage)
      .limit(perPage)
      .lean(),

    Product.countDocuments(filter),
  ]);

  return {
    products,
    pagination: {
      total,
      page: currentPage,
      limit: perPage,
      totalPages: Math.ceil(total / perPage),
      hasNextPage: currentPage * perPage < total,
      hasPrevPage: currentPage > 1,
    },
  };
};

// Get single product by slug
export const getProductBySlug = async (slug) => {
  const product = await Product.findOne({
    slug: slug.toLowerCase().trim(),
    status: "active",
  }).lean();

  if (!product) {
    throw createError("Product not found", 404);
  }

  return product;
};

// Update product
export const updateProduct = async (id, data) => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError("Invalid product ID", 400);
  }

  const product = await Product.findById(id);

  if (!product) {
    throw createError("Product not found", 404);
  }

  if (data.category) {
    const category = await getCategoryData(data.category);

    data.category = category._id;
    data.categoryPath = category.path;
    data.categoryPathKey = category.pathKey;
  }

  const nextPrice = data.price ?? product.price;
  const nextOldPrice =
    data.oldPrice !== undefined ? data.oldPrice : product.oldPrice;

  validatePrice(nextPrice, nextOldPrice);

  if (data.slug) {
    data.slug = data.slug.toLowerCase().trim();

    const existingProduct = await Product.exists({
      slug: data.slug,
      _id: { $ne: id },
    });

    if (existingProduct) {
      throw createError("Product slug already exists", 409);
    }
  }

  Object.assign(product, data);

  try {
    return await product.save();
  } catch (error) {
    if (error.code === 11000) {
      throw createError("Product slug already exists", 409);
    }

    throw error;
  }
};

// Archive product (soft delete)
export const deleteProduct = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError("Invalid product ID", 400);
  }

  const product = await Product.findById(id);

  if (!product) {
    throw createError("Product not found", 404);
  }

  product.status = "archived";

  return product.save();
};
