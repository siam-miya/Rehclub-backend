
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    path: {
      type: [String],
      required: true,
    },

    // Unique full category path, e.g. men/t-shirts/casual
    pathKey: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    level: {
      type: Number,
      default: 0,
      min: 0,
    },

    description: {
      type: String,
      default: "",
    },

    image: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
categorySchema.index({
  parent: 1,
  isActive: 1,
  sortOrder: 1,
});

const Category =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema);

export default Category;
