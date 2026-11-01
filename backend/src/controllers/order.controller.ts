import Order from "../models/Order";
import { AppError } from "../utils/appError";

const listOrders = async (req: any, res: any, next: any) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const query: any = { organizationId: req.user.company };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit))
      .lean();

    const total = await Order.countDocuments(query);

    res.status(200).json({
      status: "success",
      data: orders,
      meta: {
        total,
        limit: Number(limit),
        skip: Number(skip),
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req: any, res: any, next: any) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "processing", "completed", "cancelled"].includes(status)) {
      throw new AppError("Invalid status value", 400);
    }

    const order = await Order.findOneAndUpdate(
      { _id: orderId, organizationId: req.user.company },
      { status },
      { returnDocument: "after", runValidators: true }
    );

    if (!order) {
      throw new AppError("Order not found", 404);
    }

    res.status(200).json({
      status: "success",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export {
  listOrders,
  updateOrderStatus,
};

