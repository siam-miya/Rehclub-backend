
import {
  createProduct,
  getAllProducts,
  getProductBySlug,
  updateProduct,
  deleteProduct,
} from "./product.service.js";

// GET all products
export const getProducts = async (req, res, next) => {
  try {
    const result = await getAllProducts(req.query);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

// GET single product
export const getProduct = async (req, res, next) => {
  try {
    const product = await getProductBySlug(req.params.slug);

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// CREATE product
export const postProduct = async (req, res, next) => {
  try {
    const product = await createProduct(req.body);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE product
export const patchProduct = async (req, res, next) => {
  try {
    const product = await updateProduct(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE product (soft delete)
export const removeProduct = async (req, res, next) => {
  try {
    await deleteProduct(req.params.id);

    res.status(200).json({
      success: true,
      message: "Product archived successfully",
    });
  } catch (error) {
    next(error);
  }
};
