import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    // Related product
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Variant size
    size: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    // Variant color
    color: {
      type: String,
      required: true,
      trim: true,
    },

    // Unique SKU for each variant
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Total physical stock
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Stock reserved for pending orders
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (value) {
          return value <= this.stock;
        },
        message: "Reserved stock cannot exceed total stock",
      },
    },

    // Low stock notification threshold
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// One size/color combination per product
inventorySchema.index(
  {
    product: 1,
    size: 1,
    color: 1,
  },
  {
    unique: true,
  }
);

// Inventory lookup
inventorySchema.index({
  product: 1,
  isActive: 1,
});

// Available stock
inventorySchema.virtual("availableStock").get(function () {
  return Math.max(0, this.stock - this.reservedStock);
});

// Low stock alert
inventorySchema.virtual("isLowStock").get(function () {
  return this.stock - this.reservedStock <= this.lowStockThreshold;
});

// Include virtuals in responses
inventorySchema.set("toJSON", {
  virtuals: true,
});

inventorySchema.set("toObject", {
  virtuals: true,
});

const Inventory =
  mongoose.models.Inventory ||
  mongoose.model("Inventory", inventorySchema);

export default Inventory;
