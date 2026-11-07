
import {
  createInventory,
  getProductInventory,
  getInventoryById,
  updateInventory,
  getLowStockInventory,
} from "./inventory.service.js";

// CREATE inventory variant
export const postInventory = async (req, res, next) => {
  try {
    const inventory = await createInventory(req.body);

    res.status(201).json({
      success: true,
      message: "Inventory variant created successfully",
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

// GET product inventory variants

export const getProductInventories = async (req, res, next) => {
  try {
    const inventories = await getProductInventory(req.params.productId);

    const publicInventory = inventories
      .filter((item) => item.isActive)
      .map((item) => ({
        id: item._id,
        product: item.product,
        size: item.size,
        color: item.color,
        sku: item.sku,
        availableStock: item.availableStock,
        inStock: item.availableStock > 0,
      }));

    return res.status(200).json({
      success: true,
      count: publicInventory.length,
      data: publicInventory,
    });
  } catch (error) {
    next(error);
  }
};


// GET single inventory variant
export const getInventory = async (req, res, next) => {
  try {
    const inventory = await getInventoryById(req.params.id);

    res.status(200).json({
      success: true,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

// UPDATE inventory
export const patchInventory = async (req, res, next) => {
  try {
    const inventory = await updateInventory(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Inventory updated successfully",
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};

// GET low stock inventory
export const getLowStock = async (req, res, next) => {
  try {
    const inventory = await getLowStockInventory();

    res.status(200).json({
      success: true,
      count: inventory.length,
      data: inventory,
    });
  } catch (error) {
    next(error);
  }
};
