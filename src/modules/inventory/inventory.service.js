
import mongoose from "mongoose";

import Inventory from "./inventory.model.js";
import Product from "../products/product.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Validate quantity
const validateQuantity = (quantity) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw createError(
      "Quantity must be a positive integer.",
      400
    );
  }
};

// Validate ObjectId
const validateObjectId = (id, fieldName = "ID") => {
  if (!mongoose.isValidObjectId(id)) {
    throw createError(`Invalid ${fieldName}.`, 400);
  }
};

// Add computed stock fields
const addStockVirtuals = (inventory) => {
  if (!inventory) return inventory;

  const availableStock = Math.max(
    0,
    inventory.stock - inventory.reservedStock
  );

  return {
    ...inventory,
    availableStock,
    isLowStock:
      availableStock <= inventory.lowStockThreshold,
  };
};

// Create inventory variant
export const createInventory = async (data) => {
  validateObjectId(data.product, "Product ID");

  const product = await Product.findOne({
    _id: data.product,
    status: { $ne: "archived" },
  }).select("_id");

  if (!product) {
    throw createError("Product not found.", 404);
  }

  try {
    const inventory = await Inventory.create({
      product: product._id,
      sku: data.sku.trim().toUpperCase(),
      size: data.size.trim().toUpperCase(),
      color: data.color.trim(),
      stock: data.stock,
      lowStockThreshold: data.lowStockThreshold ?? 5,
      isActive: data.isActive ?? true,

      // reservedStock is intentionally not accepted
      // New inventory always starts with zero reserved stock
      reservedStock: 0,
    });

    return inventory;
  } catch (error) {
    if (error.code === 11000) {
      throw createError(
        "This SKU or product variant already exists.",
        409
      );
    }

    throw error;
  }
};

// Get all variants of a product
export const getProductInventory = async (productId) => {
  validateObjectId(productId, "Product ID");

  const productExists = await Product.exists({
    _id: productId,
  });

  if (!productExists) {
    throw createError("Product not found.", 404);
  }

  const inventories = await Inventory.find({
    product: productId,
    isActive: true,
  })
    .sort({ size: 1, color: 1 })
    .lean();

  return inventories.map(addStockVirtuals);
};

// Get single inventory variant
export const getInventoryById = async (id) => {
  validateObjectId(id, "Inventory ID");

  const inventory = await Inventory.findById(id).lean();

  if (!inventory) {
    throw createError("Inventory variant not found.", 404);
  }

  return addStockVirtuals(inventory);
};

// Update inventory safely
export const updateInventory = async (id, data) => {
  validateObjectId(id, "Inventory ID");

  const updateFields = {};

  if (data.stock !== undefined) {
    if (!Number.isInteger(data.stock) || data.stock < 0) {
      throw createError("Invalid stock quantity.", 400);
    }

    updateFields.stock = data.stock;
  }

  if (data.lowStockThreshold !== undefined) {
    if (
      !Number.isInteger(data.lowStockThreshold) ||
      data.lowStockThreshold < 0
    ) {
      throw createError("Invalid low stock threshold.", 400);
    }

    updateFields.lowStockThreshold = data.lowStockThreshold;
  }

  if (data.isActive !== undefined) {
    if (typeof data.isActive !== "boolean") {
      throw createError("Invalid inventory status.", 400);
    }

    updateFields.isActive = data.isActive;
  }

  if (Object.keys(updateFields).length === 0) {
    throw createError("No valid fields provided.", 400);
  }

  const filter = {
    _id: id,
  };

  // Prevent stock from going below reserved stock.
  // MongoDB checks this condition atomically during the update.
  if (data.stock !== undefined) {
    filter.$expr = {
      $lte: ["$reservedStock", data.stock],
    };
  }

  const inventory = await Inventory.findOneAndUpdate(
    filter,
    {
      $set: updateFields,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!inventory) {
    const exists = await Inventory.exists({ _id: id });

    if (!exists) {
      throw createError("Inventory variant not found.", 404);
    }

    throw createError(
      "Stock cannot be less than reserved stock.",
      409
    );
  }

  return inventory;
};

// Get low stock variants
export const getLowStockInventory = async () => {
  return Inventory.aggregate([
    {
      $match: {
        isActive: true,
      },
    },
    {
      $addFields: {
        availableStock: {
          $subtract: ["$stock", "$reservedStock"],
        },
      },
    },
    {
      $match: {
        $expr: {
          $lte: [
            "$availableStock",
            "$lowStockThreshold",
          ],
        },
      },
    },
    {
      $sort: {
        availableStock: 1,
      },
    },
  ]);
};

// Reserve stock when an order is placed
export const reserveInventory = async ({
  inventoryId,
  quantity,
  session,
}) => {
  validateQuantity(quantity);
  validateObjectId(inventoryId, "Inventory ID");

  const inventory = await Inventory.findOneAndUpdate(
    {
      _id: inventoryId,
      isActive: true,
      $expr: {
        $gte: [
          {
            $subtract: [
              "$stock",
              "$reservedStock",
            ],
          },
          quantity,
        ],
      },
    },
    {
      $inc: {
        reservedStock: quantity,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    }
  );

  if (!inventory) {
    throw createError(
      "Insufficient stock or inventory unavailable.",
      409
    );
  }

  return inventory;
};

// Release reserved stock when an order is cancelled
export const releaseInventory = async ({
  inventoryId,
  quantity,
  session,
}) => {
  validateQuantity(quantity);
  validateObjectId(inventoryId, "Inventory ID");

  const inventory = await Inventory.findOneAndUpdate(
    {
      _id: inventoryId,
      reservedStock: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        reservedStock: -quantity,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    }
  );

  if (!inventory) {
    throw createError(
      "Reserved inventory not found or insufficient reserved stock.",
      409
    );
  }

  return inventory;
};

// Commit reserved stock after delivery
export const commitInventory = async ({
  inventoryId,
  quantity,
  session,
}) => {
  validateQuantity(quantity);
  validateObjectId(inventoryId, "Inventory ID");

  const inventory = await Inventory.findOneAndUpdate(
    {
      _id: inventoryId,
      stock: {
        $gte: quantity,
      },
      reservedStock: {
        $gte: quantity,
      },
    },
    {
      $inc: {
        stock: -quantity,
        reservedStock: -quantity,
      },
    },
    {
      new: true,
      runValidators: true,
      session,
    }
  );

  if (!inventory) {
    throw createError(
      "Unable to commit reserved inventory.",
      409
    );
  }

  return inventory;
};
