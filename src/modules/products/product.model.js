
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    categoryPath: {
      type: [String],
      required: true,
    },

    categoryPathKey: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    oldPrice: {
      type: Number,
      default: null,
      min: 0,
    },

    image: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      default: [],
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    sections: {
      newArrival: {
        type: Boolean,
        default: false,
      },
      bestSelling: {
        type: Boolean,
        default: false,
      },
      flashSale: {
        type: Boolean,
        default: false,
      },
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["draft", "active", "archived"],
      default: "draft",
    },

    metaTitle: {
      type: String,
      default: "",
      trim: true,
    },

    metaDescription: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Category filtering
productSchema.index({
  categoryPathKey: 1,
  status: 1,
});

// Newest products
productSchema.index({
  status: 1,
  createdAt: -1,
});

// Best selling products
productSchema.index({
  "sections.bestSelling": 1,
  status: 1,
  salesCount: -1,
});

// New arrivals
productSchema.index({
  "sections.newArrival": 1,
  status: 1,
  createdAt: -1,
});

// Flash sales
productSchema.index({
  "sections.flashSale": 1,
  status: 1,
});

// Featured products
productSchema.index({
  isFeatured: 1,
  status: 1,
});

// Product search
productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
});

const Product =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);

export default Product;
