
import {
  getAllCategories,
  getCategoryByPath,
  createCategory,
  updateCategory,
  deleteCategory,
} from "./category.service.js";

export const getCategories = async (req, res) => {
  const categories = await getAllCategories();

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
};

export const getCategory = async (req, res) => {
  const category = await getCategoryByPath(req.params.path);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  res.status(200).json({
    success: true,
    data: category,
  });
};

export const postCategory = async (req, res) => {
  const category = await createCategory(req.body);

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: category,
  });
};

export const patchCategory = async (req, res) => {
  const category = await updateCategory(
    req.params.id,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: category,
  });
};

export const removeCategory = async (req, res) => {
  await deleteCategory(req.params.id);

  res.status(200).json({
    success: true,
    message: "Category deleted successfully",
  });
};
