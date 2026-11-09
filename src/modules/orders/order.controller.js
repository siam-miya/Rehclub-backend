
import {
  createOrder as createOrderService,
  getOrderByNumber,
  getAllOrders as getAllOrdersService,
  cancelOrder as cancelOrderService,
  deliverOrder as deliverOrderService,
  updateOrderStatus as updateOrderStatusService,
} from "./order.service.js";

// Create Order
export const createOrder = async (req, res, next) => {
  try {
    const customerId = req.user?.id || req.user?._id || null;

    const order = await createOrderService(req.body, customerId);

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// Track Order
export const trackOrder = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const phone = String(req.query.phone || "").trim();

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    const order = await getOrderByNumber(orderNumber);
    const orderPhone = String(order.customerInfo.phone || "").trim();

    if (orderPhone !== phone) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order details retrieved successfully.",
      data: {
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          items: order.items,
          pricing: order.pricing,
          payment: order.payment,
          shippingAddress: order.shippingAddress,
          courier: order.courier,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get All Orders (Admin)
export const getAllOrders = async (req, res, next) => {
  try {
    const query = res.locals.validatedQuery ?? req.query;

    const result = await getAllOrdersService(query);

    return res.status(200).json({
      success: true,
      message: "Orders retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel Order (Admin)
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await cancelOrderService({
      orderId: req.params.orderId,
      note: req.body.note,
    });

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// Deliver Order (Admin)
export const deliverOrder = async (req, res, next) => {
  try {
    const order = await deliverOrderService({
      orderId: req.params.orderId,
      note: req.body.note,
    });

    return res.status(200).json({
      success: true,
      message: "Order delivered successfully.",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};

// Update Order Status (Admin)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await updateOrderStatusService({
      orderId: req.params.orderId,
      status: req.body.status,
      note: req.body.note,
    });

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      data: { order },
    });
  } catch (error) {
    next(error);
  }
};
