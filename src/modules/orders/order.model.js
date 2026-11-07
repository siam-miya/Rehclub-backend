
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// Order Item Snapshot
const orderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    inventory: {
      type: Schema.Types.ObjectId,
      ref: "Inventory",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 99,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

// Shipping Address
const shippingAddressSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    division: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
      default: null,
    },
    deliveryArea: {
      type: String,
      enum: ["inside-dhaka", "outside-dhaka"],
      required: true,
    },
  },
  { _id: false }
);

// COD Payment Information
const paymentSchema = new Schema(
  {
    method: {
      type: String,
      enum: ["COD"],
      default: "COD",
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "PAID"],
      default: "PENDING",
      required: true,
    },
    transactionId: {
      type: String,
      default: null,
    },
    gateway: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

// Order Status History
const orderStatusHistorySchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ],
      required: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Main Order Schema
const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // Better Auth user ID (string)
    customer: {
      type: String,
      default: null,
      index: false,
    },

    customerInfo: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Order must contain at least one item.",
      },
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    pricing: {
      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
      discount: {
        type: Number,
        default: 0,
        min: 0,
      },
      deliveryCharge: {
        type: Number,
        required: true,
        min: 0,
      },
      tax: {
        type: Number,
        default: 0,
        min: 0,
      },
      total: {
        type: Number,
        required: true,
        min: 0,
      },
    },

    payment: {
      type: paymentSchema,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ],
      default: "PENDING",
      index: true,
    },

    // Inventory Reservation Tracking
    reservationStatus: {
      type: String,
      enum: ["ACTIVE", "RELEASED", "COMMITTED"],
      default: "ACTIVE",
      required: true,
    },

    // COD orders never expire automatically
    reservationExpiresAt: {
      type: Date,
      default: null,
    },

    statusHistory: {
      type: [orderStatusHistorySchema],
      default: [],
    },

    courier: {
      provider: {
        type: String,
        default: null,
      },
      consignmentId: {
        type: String,
        default: null,
      },
      trackingCode: {
        type: String,
        default: null,
      },
      trackingUrl: {
        type: String,
        default: null,
      },
      bookedAt: {
        type: Date,
        default: null,
      },
    },

    customerNote: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    adminNote: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    expiredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Database Indexes
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "payment.status": 1 });
orderSchema.index({ "courier.consignmentId": 1 });

// Keep this index for future online payment reservation support
orderSchema.index({
  reservationStatus: 1,
  reservationExpiresAt: 1,
});

const Order = models.Order || model("Order", orderSchema);

export default Order;
