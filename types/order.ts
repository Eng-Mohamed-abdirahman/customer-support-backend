export type OrderStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled";

export type Order = {
  _id: string;
  organizationId: string;
  customerName: string;
  phone: string;
  orderName: string;
  quantity: number;
  notes: string;
  deliveryAddress: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

export type ListOrdersQuery = {
  status?: OrderStatus;
  limit?: number;
  skip?: number;
};
